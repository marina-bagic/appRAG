from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.papers import router as papers_router
from api.citation import router as citation_router
from api.auth import router as auth_router
from api.search import router as search_router
from api.graph import router as graph_router
from api.user import router as user_router
from api.upload import router as upload_router
from api.llm import router as llm_router
from config import load_model

app = FastAPI()

model = load_model()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(search_router)
app.include_router(papers_router)
app.include_router(citation_router)
app.include_router(graph_router)
app.include_router(user_router)
app.include_router(upload_router)
app.include_router(llm_router)