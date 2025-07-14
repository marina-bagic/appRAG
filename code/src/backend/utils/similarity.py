from database.connection import get_connection
import numpy as np
import ast
from sklearn.metrics.pairwise import cosine_similarity
import time

def load_embeddings_for_ids(paper_ids):
    load_start_time = time.time()
    if not paper_ids:
        return {}
    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ','.join(['%s'] * len(paper_ids))
    query = f"""
        SELECT id, title, summary, summary_embedding
        FROM papers_new
        WHERE id IN ({placeholders})
    """
    cursor.execute(query, tuple(paper_ids))
    data = {}
    for pid, title, summary, embedding in cursor.fetchall():
        if not embedding:
            print(f"Skipping paper {pid} due to missing embedding.")
            continue
        try:
            embedding_array = np.array(ast.literal_eval(embedding), dtype=np.float32)
        except Exception as e:
            print(f"Failed to parse embedding for {pid}: {e}")
            continue
        data[pid] = {
            "title": title,
            "summary": summary if summary else "No summary available.",
            "embeddings": embedding_array
        }
    cursor.close()
    conn.close()
    load_end_time = time.time()
    print(f"Loaded embeddings for {len(data)} papers in {load_end_time - load_start_time:.2f} seconds.")
    return data


def compute_similarities_to_selected(selected_ids, top_n=10, similarity_threshold=0.65):
    start_time = time.time()
    selected_data = load_embeddings_for_ids(selected_ids)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, summary, summary_embedding
        FROM papers_new
        WHERE summary IS NOT NULL
    """)
    candidate_data = {}
    for pid, title, summary, embedding in cursor.fetchall():
        if pid in selected_ids or not embedding:
            continue
        try:
            emb = np.array(ast.literal_eval(embedding), dtype=np.float32)
            candidate_data[pid] = {"title": title, "summary": summary, "embeddings": emb}
        except Exception as e:
            print(f"Error with {pid}: {e}")

    cursor.close()
    conn.close()

    edges = []

    step_1_time = time.time()
    # Step 1: Compare selected papers with each other
    sel_ids = list(selected_data.keys())
    sel_matrix = np.stack([selected_data[pid]["embeddings"] for pid in sel_ids])
    similarities = cosine_similarity(sel_matrix)
    for i in range(len(sel_ids)):
        for j in range(i + 1, len(sel_ids)):
            # sim = cosine_similarity(sel_matrix[i].reshape(1, -1), sel_matrix[j].reshape(1, -1))[0][0]
            sim = similarities[i][j]
            if sim > similarity_threshold:
                edges.append((sel_ids[i], sel_ids[j], sim))

    step_2_time = time.time()
    # Step 2: Compare selected with candidate papers in one go
    cand_ids = list(candidate_data.keys())
    if not cand_ids:
        return {}, []

    cand_matrix = np.stack([candidate_data[pid]["embeddings"] for pid in cand_ids])
    for i, sel_id in enumerate(sel_ids):
        sel_emb = selected_data[sel_id]["embeddings"].reshape(1, -1)
        sims = cosine_similarity(sel_emb, cand_matrix)[0]
        top_indices = np.argsort(sims)[::-1][:top_n]

        for idx in top_indices:
            sim = sims[idx]
            if sim > similarity_threshold:
                edges.append((sel_id, cand_ids[idx], sim))

    step_3_time = time.time()
    # Final: Collect all nodes that appear in edges
    all_ids = set(selected_ids) | {pid for _, pid, _ in edges}
    all_nodes = {}
    for pid in all_ids:
        source = selected_data if pid in selected_data else candidate_data
        all_nodes[pid] = {
            "title": source[pid]["title"],
            "summary": source[pid]["summary"],
            "embeddings": source[pid]["embeddings"]
        }
    end_time = time.time()
    print(f"Step 1 time: {step_1_time - start_time:.2f} seconds")
    print(f"Step 2 time: {step_2_time - step_1_time :.2f} seconds")
    print(f"Step 3 time: {end_time - step_2_time:.2f} seconds")
    print(f"Total computation time: {end_time - start_time:.2f} seconds")
    return all_nodes, edges