from pydantic import BaseModel
from typing import Optional

class QueryRequest(BaseModel):
    query: str
    maxResults: int

class QueryResponse(BaseModel):
    id: int
    title: str
    summary: Optional[str]