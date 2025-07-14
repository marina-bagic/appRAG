from fastapi import APIRouter
from typing import List
from models.query import QueryRequest, QueryResponse
from database.connection import get_connection
from config import load_model
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import time

router = APIRouter()

model = load_model()

class FindSimilarRequest(BaseModel):
    paper: dict

@router.post("/find-similar")
async def find_similar_papers(request: FindSimilarRequest):
    query_arxiv_id = request.paper["id"]
    print(query_arxiv_id)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT summary_embedding FROM papers_new
        WHERE id = %s;
    """, (query_arxiv_id,))
    result = cursor.fetchone()
    if not result:
        print("Paper not found.")
        return []
    query_embedding = result[0]
    cursor.execute("""
        SELECT arxivID, title, authors
        FROM papers_new
        WHERE id != %s
        ORDER BY summary_embedding <=> %s ASC
        LIMIT 1;
    """, (query_arxiv_id, query_embedding))
    top_similar = cursor.fetchall()
    cursor.close()
    conn.close()
    similar_papers = [
        {
            "id": paper[0],
            "title": paper[1],
            "authors": paper[2]
        } for paper in top_similar
    ]
    
    return {"similar_papers": similar_papers}

@router.post("/search", response_model = List[QueryResponse])
async def search_papers(request: QueryRequest):
    start_time = time.time()
    conn = get_connection()
    cursor = conn.cursor()
    if not model:
        raise Exception("Model not loaded. Please check the configuration.")
    query_embedding = model.encode(request.query).tolist()
    cursor.execute("""
        SELECT paper_id, content, embedding <=> %s::vector AS similarity
        FROM paper_chunks_new
        ORDER BY similarity ASC
        LIMIT %s;
    """, [query_embedding, request.maxResults])
    top_chunks = cursor.fetchall()
    paper_ids = list(set([row[0] for row in top_chunks]))

    if not paper_ids:
        return []
    cursor.execute("""
        SELECT *
        FROM papers_new
        WHERE arxivid = ANY(%s);
    """, [paper_ids])
    papers = cursor.fetchall()
    result = [
        {"id": p[0],
         "arxivid" : p[1],
         "title": p[2],
         "authors" : p[3],
         "summary": p[4],
         "summary_embedding": p[5],
         "average_embedding": p[6],
         "is_published": p[7],
         # "publish_date": p[8],
        "publish_date": p[8].isoformat() if p[8] else None,  # <-- this fixes it
         "doi": p[9],
         "journal_ref": p[10],
         "url": p[11]}
        for p in papers
    ]
    cursor.close()
    time_end = time.time()
    elapsed_time = time_end - start_time
    print(f"Search completed in {time_end - start_time} seconds.")
    return result
    # return JSONResponse(content={"results": result, "elapsed_time": elapsed_time})