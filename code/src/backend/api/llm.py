from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
from mistralai import Mistral
from uuid import UUID
from utils.llm import call_mistral_api
from utils.citation import generate_citations_for_papers
from database.connection import get_connection
from utils.uuid import is_uuid
from utils.summary import summarize_paper_efficiently
from config import load_model
from typing import Optional
import time

router = APIRouter()

class CompareRequest(BaseModel):
    paper1: dict
    paper2: dict

class RelatedWorkRequest(BaseModel):
    papers: List[dict]
    style: str

class LLMQueryRequest(BaseModel):
    question: str
    paper: Optional[dict]


# Endpoints for each function
@router.post("/llm/compare")
async def compare_papers(request: CompareRequest):

    comparison_prompt = f"""
    You're a scientific reasoning assistant.

    Given two sections from research papers, identify:
    - The *core topic* each one addresses.
    - Any *shared concepts* or *common goals*.
    - How each paper contributes differently to a similar problem space.
    - Use technical language, but explain clearly.
    - Your goal is to help a researcher quickly understand the connection between two works.

    Keep the explanation short and focused (max 5 bullet points).

    Now analyze the following pair:

    {request.paper1['title']}
    {request.paper1['summary']}

    {request.paper2['title']}
    {request.paper2['summary']}

    Your comparison:
    """

    response = await call_mistral_api(comparison_prompt, 600)
    return {"comparison": response}

@router.post("/llm/related-work")
async def generate_related_work(request: RelatedWorkRequest):
    start_time = time.time()
    papers_ids = [paper['id'] for paper in request.papers]
    style = request.style
    conn = get_connection()
    cursor = conn.cursor()
    llm_data = []
    for id_ in papers_ids:
        if is_uuid(id_):
            cursor.execute("""
                SELECT original_name, summary
                FROM user_files
                WHERE id = %s
            """, (id_,))
            result = cursor.fetchall()
            original_username = result[0][0]
            summary = result[0][1]
            llm_data.append((original_username, summary))
        else:
            data = {"paperIds": [id_], "style": style}
            citations = generate_citations_for_papers(data)
            cursor = conn.cursor()

            cursor.execute("""
                SELECT summary
                FROM papers_new
                WHERE id = %s
            """, (id_,))
            summary = cursor.fetchall()
            llm_data.append((citations["citations"][id_], summary[0][0]))

    cursor.close()
    printed_context = ""
    for citation, summary in llm_data:
        printed_context = str(printed_context) + f"""{citation}\n{summary}\n--------\n"""

    prompt = f"""
    You are an academic writing assistant.

    Your task is to write a "Related Work" section using the provided paper summaries and metadata.

    Instructions:
    1. Group related papers by theme or methodology.
    2. Refer to authors only once per paper (e.g., “Marti-Escofet et al. explore…”).
    3. Do NOT include full citations (author-year or numbered references) at the end — these will be handled elsewhere.
    4. Do NOT repeat author names or citation numbers redundantly.
    5. Use clear academic transitions and paraphrase key contributions in each group.
    6. End with a short summary paragraph explaining overall trends or differences.
    ---
    Now, write a related work section based on the following input.

    ### Format:
    Each paper is provided as:

    [Citation]
    [Summary]
    ---
    Input:
    {printed_context}
    Related Work:

    """
    response = await call_mistral_api(prompt, 1500)
    time_end = time.time()
    elapsed_time = time_end - start_time
    print(elapsed_time)
    return {"related_work": response}


@router.post("/llm/query")
async def llm_query(request: LLMQueryRequest):
    conn = get_connection()
    cursor = conn.cursor()
    model = load_model()
    if not model:
        raise Exception("Model not loaded. Please check the configuration.")

    query_embedding = model.encode(request.question).tolist()
    paper = request.paper
    top_chunks = []

    if paper and paper.get("id"):
        paper_id = paper["id"]
        print("Selected Paper ID:", paper_id)

        if is_uuid(paper_id):
            cursor.execute("""
                SELECT content, chunk_number, 'Uploaded File' AS title, embedding <=> %s::vector AS similarity
                FROM file_chunks
                WHERE file_id = %s
                ORDER BY similarity ASC
                LIMIT 10;
            """, (query_embedding, paper_id))
            top_chunks = cursor.fetchall()

        else:
            cursor.execute("""
                SELECT arxivID, title FROM papers_new WHERE id = %s;
            """, (paper_id,))
            result = cursor.fetchone()
            if not result:
                raise ValueError(f"No arXiv ID found for paper id: {paper_id}")
            arxiv_id, title = result

            cursor.execute("""
                SELECT content, chunk_number, %s AS title, embedding <=> %s::vector AS similarity
                FROM paper_chunks_new
                WHERE paper_id = %s
                ORDER BY similarity ASC
                LIMIT 10;
            """, (title, query_embedding, arxiv_id))
            top_chunks = cursor.fetchall()

    else:
        print("No specific paper selected. Searching all papers...")

        # Retrieve top summaries
        cursor.execute("""
            SELECT summary AS content, NULL AS chunk_number, title, summary_embedding <=> %s::vector AS similarity
            FROM papers_new
            WHERE summary_embedding IS NOT NULL
            ORDER BY similarity ASC
            LIMIT 5;
        """, (query_embedding,))

        top_chunks = cursor.fetchall()

    cursor.close()
    conn.close()

    # Structure chunks with titles
    structured_chunks = [
        {"content": row[0], "chunk_number": row[1] or 0, "title": row[2]}
        for row in top_chunks
    ]

    while len(structured_chunks) < 3:
        structured_chunks.append({"content": "", "chunk_number": 0, "title": "Unknown"})

    chunk_texts = "\n\n".join(
        f"From paper titled '{chunk['title']}'):\n\n{chunk['content']}"
        for chunk in structured_chunks
    )

    prompt = f"""
    You are a helpful and accurate scientific paper expert.

    Below are excerpts from scientific papers. Your task is to concisely answer the user's question using only the provided information. Use only the content that is relevant. You do not need to use all excerpts. If one is enough, just use that.

    Clearly indicate which paper each piece of information comes from (by title). Do not invent or assume any information that is not explicitly stated in the provided texts.

    If the context does not contain enough information to answer the user's question accurately, respond with exactly: "I do not have enough information to answer this question accurately."

    ---
    Context:

    {chunk_texts}

    ---
    User's Question:
    {request.question}

    ---
    Your Answer:
    """
    start_time = time.time()
    response = await call_mistral_api(prompt, 300)
    time_end = time.time()
    elapsed_time = time_end - start_time
    print(elapsed_time)
    return {"answer": response}


@router.post("/llm/generate-summary/{paper_id}")
async def llm_query(paper_id: UUID):
    summary = await summarize_paper_efficiently(paper_id)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE user_files
    SET summary = %s
    WHERE id = %s
    """, (str(summary), str(paper_id)))
    conn.commit()
    cursor.close()
    conn.close()

    return {"summary": summary}