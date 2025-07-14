import re

def remove_references(text):
    pattern = r'\b(References|REFERENCES|Bibliography|BIBLIOGRAPHY|Works Cited|WORKS CITED)\b'
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if match:
        start = match.start()
        return text[:start].strip()

    return text