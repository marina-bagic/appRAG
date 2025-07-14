from typing import List
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class Papers(BaseModel):
    id: int
    arxivid: str
    title: str
    authors: List[str]
    summary: Optional[str]
    is_published: bool
    publish_date: date
    doi: Optional[str]
    journal_ref: Optional[str]
    url: str