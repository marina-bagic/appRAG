from fastapi import APIRouter, HTTPException
from database.connection import get_connection
from auth.dependecies import get_current_user
from pydantic import BaseModel
from fastapi import Depends
from utils.uuid import is_uuid
from utils.citation import generate_citations_for_papers

router = APIRouter()

@router.post("/generate-citations")
def generate_citations(data: dict):
    return generate_citations_for_papers(data)


@router.get("/get-preferred-style")
def get_citation_style(current_user: str = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT preferred_citation_style
            FROM users
            WHERE id = %s
        """, (current_user, ))
        result = cursor.fetchone()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
    return {"preferred_citation_style": result[0]}


class CitationStyleBody(BaseModel):
    style: str

@router.post("/set-preferred-style")
def set_citation_style(style: CitationStyleBody, current_user: str = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE users
            SET preferred_citation_style = %s
            WHERE id = %s
        """, (style.style, current_user))
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
    return {"message": "Preferred citation style updated"}