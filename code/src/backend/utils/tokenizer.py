import nltk
from transformers import AutoTokenizer
nltk.download('punkt')
from nltk.tokenize import sent_tokenize
tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased', model_max_length=8192)
def chunk_text_by_sentences(text, max_tokens=250, overlap_tokens=50):
    sentences = sent_tokenize(text)
    if not sentences:
        return []

    # Batch tokenize all sentences at once
    tokenized = tokenizer(sentences, add_special_tokens=False)
    sentence_tokens_list = tokenized["input_ids"]

    chunks = []
    current_chunk = []
    current_chunk_token_lists = []

    def flatten(tokens_list):
        return [tok for tokens in tokens_list for tok in tokens]

    for sentence, sentence_tokens in zip(sentences, sentence_tokens_list):
        if len(sentence_tokens) > max_tokens - 2:
            continue  # Skip too-long sentences

        current_flat_tokens = flatten(current_chunk_token_lists)
        if len(current_flat_tokens) + len(sentence_tokens) > max_tokens - 2:
            if current_chunk:
                chunks.append(' '.join(current_chunk))

            # Handle overlap
            if overlap_tokens > 0 and current_chunk:
                overlap_chunk = []
                overlap_token_lists = []
                current_len = 0
                for s, s_tokens in reversed(list(zip(current_chunk, current_chunk_token_lists))):
                    if current_len + len(s_tokens) > overlap_tokens:
                        break
                    overlap_chunk.insert(0, s)
                    overlap_token_lists.insert(0, s_tokens)
                    current_len += len(s_tokens)
                current_chunk = overlap_chunk
                current_chunk_token_lists = overlap_token_lists
            else:
                current_chunk = []
                current_chunk_token_lists = []

        current_chunk.append(sentence)
        current_chunk_token_lists.append(sentence_tokens)

    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks