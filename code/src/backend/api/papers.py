from fastapi import APIRouter
from typing import List
from database.connection import get_connection
from models.papers import Papers

router = APIRouter()

@router.get("/papers", response_model=List[Papers])
def get_latest_papers(limit: int = 10000):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, arxivid, title, authors, summary, is_published, publish_date, doi, journal_ref, url
        FROM papers_new
        ORDER BY publish_date DESC
        LIMIT %s
    """, (limit,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [Papers(
        id=row[0], arxivid=row[1], title=row[2], authors=row[3], summary=row[4], is_published=row[5], 
        publish_date=row[6], doi=row[7], journal_ref=row[8], url=row[9]
    ) for row in rows]