from typing import List, Optional, Union
from fastapi import APIRouter
from models.paper import Paper
from utils.graph import build_graph_html
from utils.similarity import compute_similarities_to_selected
from utils.uuid import is_uuid
from uuid import UUID
from pydantic import BaseModel
import time


router = APIRouter()

class MyPapers(BaseModel):
    id: Union[str, int, UUID]
    title: str
    summary: Optional[str] = ''

@router.post("/generate-graph-from-selection")
def generate_graph(papers: List[MyPapers]):
    start_time = time.time()
    selected_ids = [paper.id for paper in papers]
    filtered_paper_ids = [pid for pid in selected_ids if not is_uuid(pid)]
    loading_time = time.time() - start_time
    print(f"Loading time: {loading_time} seconds")
    nodes, edges = compute_similarities_to_selected(filtered_paper_ids)
    cosine_time = time.time() - start_time - loading_time
    print(f"Cosine similarity computation time: {cosine_time} seconds")
    build_graph_html(filtered_paper_ids, nodes, edges)
    building_graph_time = time.time() - start_time - loading_time - cosine_time
    print(f"Graph building time: {building_graph_time} seconds")
    elapsed_time = time.time() - start_time
    print(f"Total elapsed time: {elapsed_time} seconds")
    return {"message": "Graph generated", "url": "/public/graph.html"}