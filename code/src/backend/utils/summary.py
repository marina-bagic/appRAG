from transformers import AutoTokenizer
from database.connection import get_connection
from utils.llm import call_mistral_api


def promt_for_chunk_summary(context):
    promt = (
        f"Here is a section from a scientific paper:\n\n{context}\n\n"
        "Write a concise summary in 3–5 complete sentences."
        "Use natural language and proper paragraph structure. Do not use bullet points or numbered lists."
        "Keep the tone neutral and informative."
        "\n\nSummary:"
    )
    return promt

def promt_for_paper_summary(context):
    promt = (
        f"Here are the individual section summaries from a scientific paper:\n\n{context}\n\n"
        "Based on these, write an abstract-style summary of the entire paper in 4–6 complete sentences. "
        "Begin with the scientific motivation or problem being addressed. "
        "Then describe the main contribution or method introduced in the paper. "
        "Highlight any key technical advantages or results, and conclude with the broader impact or applications. "
        "Use formal academic language. Avoid bullet points or lists."
        "\n\nSummary:"
    )
    return promt

def group_chunks_by_token_limit(chunks, tokenizer, max_tokens=6500):
    groups = []
    current_group = []
    current_tokens = 0

    for chunk in chunks:
        token_len = len(tokenizer(chunk)["input_ids"])
        if current_tokens + token_len > max_tokens:
            groups.append(current_group)
            current_group = [chunk]
            current_tokens = token_len
        else:
            current_group.append(chunk)
            current_tokens += token_len

    if current_group:
        groups.append(current_group)

    return groups

async def summarize_paper_efficiently(paper_id):
    tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased', model_max_length=8192)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT content FROM file_chunks
        WHERE file_id = %s
        ORDER BY chunk_number
    """, (str(paper_id),))
    chunk_texts = [row[0] for row in cursor.fetchall()]
    cursor.close()
    groups = group_chunks_by_token_limit(chunk_texts, tokenizer, max_tokens=6500)
    group_summaries = []
    for i, group in enumerate(groups):
        text_block = "\n\n".join(group)
        prompt = promt_for_chunk_summary(text_block)
        summary = await call_mistral_api(prompt, 300)
        group_summaries.append(summary)
    final_prompt = promt_for_paper_summary("\n\n".join(group_summaries))
    final_summary = await call_mistral_api(final_prompt, 500)
    return final_summary