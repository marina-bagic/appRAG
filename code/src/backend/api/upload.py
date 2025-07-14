from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from auth.dependecies import get_current_user
from database.connection import get_connection
from utils.tokenizer import chunk_text_by_sentences
from config import load_model
from utils.text_cleaner import remove_references
import fitz  # PyMuPDF
import datetime
import psycopg2
from fastapi.responses import Response
from uuid import UUID

router = APIRouter()

@router.get("/my-files")
async def get_my_files(user_id: str = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, original_name, summary
        FROM user_files
        WHERE user_id = %s
        ORDER BY upload_time DESC
    """, (str(user_id),))
    files = cur.fetchall()
    cur.close()
    return [{"id": file[0], "original_name": file[1], "summary": file[2]} for file in files]


@router.get("/download/{paper_id}")
def download_file(paper_id: UUID, current_user: str = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT file_data, original_name FROM user_files WHERE id = %s AND user_id = %s
    """, (str(paper_id), str(current_user)))
    row = cur.fetchone()
    if row is None:
        raise HTTPException(404, "File not found.")
    file_data, file_name = row
    return Response(
        content=file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"',
            "Content-Type": "application/pdf"
        }
    )



@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    content = await file.read()
    doc = fitz.open("pdf", content)
    text = []
    for page in doc:
        raw = page.get_text("text")
        clean = " ".join(line.strip() for line in raw.splitlines() if line.strip())
        text.append(clean)
    full_text = "\n\n".join(text)
    full_text = full_text.replace('\x00', '')
    full_text = remove_references(full_text)
    chunks = chunk_text_by_sentences(full_text)
    model = load_model()
    embeddings = model.encode(chunks, batch_size=8, show_progress_bar=False).tolist()

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO user_files (user_id, original_name, upload_time, file_data)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """, (str(user_id), str(file.filename), datetime.datetime.now(), psycopg2.Binary(content)))
    file_id = cur.fetchone()[0]
    data = [(file_id, i, chunk, embedding) for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))]
    cur.executemany("""
        INSERT INTO file_chunks (file_id, chunk_number, content, embedding)
        VALUES (%s, %s, %s, %s)
    """, data)
    conn.commit()
    cur.close()
    return {"message": "File uploaded", "file_id": str(file_id)}