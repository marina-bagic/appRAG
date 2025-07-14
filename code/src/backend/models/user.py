from pydantic import BaseModel

class User(BaseModel):
    id: str
    email: str
    preferred_citation_style: str