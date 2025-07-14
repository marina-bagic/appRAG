import re
from fastapi import HTTPException
from database.connection import get_connection

def sentence_case(text):
    if not text:
        return text
    text = text.strip()
    return text[0].upper() + text[1:].lower()


def parse_journal_ref(journal_ref):
    """
    Parses a journal reference into components (name, volume, issue, pages, year).

    Parameters:
    - journal_ref: str (e.g., "Remote Sensing, 15(21), 5238, 2023" or URL)

    Returns:
    - dict: Components of the journal reference (name, volume, issue, pages, year)
    """
    if not journal_ref or not journal_ref.strip():
        return {"name": "", "volume": "", "issue": "", "pages": "", "year": ""}

    journal_ref = journal_ref.strip()

    if journal_ref.startswith("http"):
        match = re.match(r"https?://(?:www\.)?mdpi\.com/(\d{4}-\d{4})/(\d+)/(\d+)/(\d+)", journal_ref)
        if match:
            issn, volume, issue, article = match.groups()
            return {
                "name": "Remote Sensing",  # Map ISSN to journal name if known
                "volume": volume,
                "issue": issue,
                "pages": article,
                "year": ""
            }
        return {"name": "", "volume": "", "issue": "", "pages": "", "year": ""}

    # Define regex patterns for common journal reference formats
    patterns = [
        # Standard: "Journal Name, Vol(Issue), Pages, Year" or "Journal Name, Volume Vol, Pages, Year"
        r"^(.*?),\s*(?:Volume\s*|Vol\.?\s*)?(\d+)(?:\s*\((\d+)\))?,?\s*(\d+\s*[-–]\s*\d+|\d+)?,?\s*(\d{4})$",
        # Compact: "Journal Name Volume, Pages (Year)" or "Journal Name Volume, Pages, Year"
        r"^(.*?)\s+(\d+),?\s*(\d+\s*[-–]\s*\d+|\d+)?\s*\(?(\d{4})\)?$",
        # With "no.": "Journal Name Volume, no. Issue, Pages, Year"
        r"^(.*?)\s+(\d+),\s*no\.\s*(\d+),?\s*(\d+\s*[-–]\s*\d+|\d+)?,?\s*(\d{4})$",
        # Minimal: "Journal Name Year" or "Journal Name, Year"
        r"^(.*?),\s*(\d{4})$",
        # Book chapter: "In: Book Title, pp. Pages, Year"
        r"^(In:.*?),\s*pp\.?\s*(\d+\s*[-–]\s*\d+|\d+)?,?\s*(\d{4})$"
    ]

    for pattern in patterns:
        match = re.match(pattern, journal_ref, re.IGNORECASE)
        if match:
            groups = match.groups()
            if len(groups) == 5:  # Full journal pattern
                name, volume, issue, pages, year = groups
                return {
                    "name": (name or "").strip(),
                    "volume": (volume or "").strip(),
                    "issue": (issue or "").strip(),
                    "pages": (pages or "").strip(),
                    "year": (year or "").strip()
                }
            elif len(groups) == 4:  # Compact or minimal journal pattern
                name, volume, pages, year = groups
                return {
                    "name": (name or "").strip(),
                    "volume": (volume or "").strip(),
                    "issue": "",
                    "pages": (pages or "").strip(),
                    "year": (year or "").strip()
                }
            elif len(groups) == 3:  # Book chapter or very minimal
                name, pages, year = groups
                return {
                    "name": (name or "").strip(),
                    "volume": "",
                    "issue": "",
                    "pages": (pages or "").strip(),
                    "year": (year or "").strip()
                }

    # Fallback: Extract year and treat rest as journal name
    year_match = re.search(r"\b(19|20)\d{2}\b", journal_ref)
    year = year_match.group(0) if year_match else ""
    name = journal_ref
    if year:
        name = re.sub(r"\b(19|20)\d{2}\b", "", journal_ref).strip(", ")
    
    return {
        "name": name.strip(),
        "volume": "",
        "issue": "",
        "pages": "",
        "year": year
    }

def format_authors_by_style(authors, style):
    """
    Formats a list of author names into the requested citation style.

    Parameters:
    - authors: list of str (e.g. ["John Smith", "Alice Doe"])
    - style: str ("APA", "MLA", "ISO690", "Chicago", "IEEE", "AMA", "ACS")

    Returns:
    - str: formatted authors string
    """
    VALID_STYLES = {"APA", "MLA", "ISO690", "Chicago", "IEEE", "AMA", "ACS"}
    if style not in VALID_STYLES:
        raise ValueError(f"Unsupported style: {style}. Supported styles: {', '.join(VALID_STYLES)}")

    def split_name(name):
        name = name.strip()
        if "," in name:
            last, first = [part.strip() for part in name.split(",", 1)]
        else:
            parts = name.split()
            first = " ".join(parts[:-1])
            last = parts[-1]
        return first, last

    formatted = []
    for name in authors:
        first, last = split_name(name)
        initials = " ".join([f"{part[0]}." for part in first.split() if part])

        if style == "APA":
            formatted.append(f"{last}, {initials}")
        elif style == "MLA":
            if name == authors[0]:
                formatted.append(f"{last}, {first}")
            else:
                formatted.append(f"{first} {last}")
        elif style == "ISO690":
            formatted.append(f"{last.upper()}, {initials}")
        elif style == "Chicago":
            if name == authors[0]:
                formatted.append(f"{last}, {first}")
            else:
                formatted.append(f"{first} {last}")
        elif style == "IEEE":
            formatted.append(f"{initials} {last}")
        elif style == "AMA":
            formatted.append(f"{last} {''.join([part[0] for part in first.split()])}")
        elif style == "ACS":
            formatted.append(f"{last}, {initials}")

    # Join authors according to style
    if style == "APA":
        if len(formatted) == 1:
            return formatted[0]
        elif len(formatted) == 2:
            return f"{formatted[0]} & {formatted[1]}"
        else:
            return ", ".join(formatted[:-1]) + ", & " + formatted[-1]
    elif style in ["Chicago", "MLA"]:
        if len(formatted) == 1:
            return formatted[0]
        elif len(formatted) == 2:
            return f"{formatted[0]} and {formatted[1]}"
        else:
            return ", ".join(formatted[:-1]) + ", and " + formatted[-1]
    

    elif style == "IEEE":
        return ", ".join(formatted[:-1]) + ", and " + formatted[-1] if len(formatted) > 1 else formatted[0]
    elif style in ["ISO690", "ACS"]:
        return "; ".join(formatted)
    elif style == "AMA":
        return ", ".join(formatted)
    else:
        return ", ".join(formatted)

def format_citation(authors, title, journal_ref=None, arxiv_id=None, year=None, doi=None):
    """
    Format a citation in the specified style with volume, issue, and pages.

    Parameters:
    - authors: str (formatted author string)
    - title: str (article title)
    - journal_ref: str (journal reference, e.g., "Remote Sensing, 15(21), 5238, 2023")
    - arxiv_id: str (arXiv ID, if applicable)
    - year: str (publication year, if known)
    - doi: str (DOI, e.g., "10.3390/rs15215238")

    Returns:
    - dict: Citation details including reference type, year, and formatted citations per style
    """

    # Determine reference type
    has_journal = bool(journal_ref and re.search(r"\d{4}", journal_ref))  # crude check for year
    has_arxiv = bool(doi)

    if has_journal:
        if re.search(r"\bed\.?\)?[:]", journal_ref, re.IGNORECASE) or "In:" in journal_ref:
            ref_type = "book_chapter"
        else:
            ref_type = "journal"
    elif has_arxiv:
        ref_type = "unknown"
    else:
        ref_type = "preprint_arxiv"


    # Parse journal reference
    journal_info = parse_journal_ref(journal_ref)
    journal_name = journal_info["name"] or "[Journal Name Missing]"
    volume = journal_info["volume"]
    issue = journal_info["issue"]
    pages = journal_info["pages"]

    # Use provided year or fallback to journal_ref year or "n.d."
    if not year:
        year = journal_info["year"] if journal_info["year"] else "n.d."


    # Normalize APA-style title (sentence case)
    title_apa = sentence_case(title)

    # Format journal string (APA style)
    journal_str = journal_name.strip().rstrip(".")  # Clean trailing dots
    if volume and issue:
        journal_str += f", {volume}({issue})"
    elif volume:
        journal_str += f", {volume}"
    if pages:
        journal_str += f", {pages}"



    # DOI suffix
    doi_suffix = f" https://doi.org/{doi}" if doi else ""

    # Standardize authors for ISO690
    authors_upper = authors.upper()

    # Style templates (no asterisks)
    citation_styles = {}
    if ref_type == "journal":
        citation_styles = {
            "APA": f"{authors} ({year}). {title_apa}. {journal_str}.{doi_suffix}",
            "MLA": f"{authors}. \"{title}.\" {journal_str}.{doi_suffix}",
            "ISO690": f"{authors_upper}. {title}. {journal_str}.{doi_suffix}",
            "Chicago": f"{authors}. \"{title}.\" {journal_str}.{doi_suffix}",
            "IEEE": f"{authors}, \"{title},\" {journal_name}, vol. {volume}, no. {issue}, pp. {pages}, {year}.{doi_suffix}",
            "AMA": f"{authors}. {title}. {journal_str}. {year};{doi_suffix}",
            "ACS": f"{authors}. {title}. {journal_str}, {year}.{doi_suffix}"
        }
    elif ref_type == "book_chapter":
        citation_styles = {
            "APA": f"{authors} ({year}). {title}. In {journal_ref}.{doi_suffix}",
            "MLA": f"{authors}. \"{title}.\" {journal_ref}.{doi_suffix}",
            "ISO690": f"{authors_upper}. {title}. In: {journal_ref}.{doi_suffix}",
            "Chicago": f"{authors}. \"{title}.\" In {journal_ref}.{doi_suffix}",
            "IEEE": f"{authors}, \"{title},\" in {journal_ref}, {year}.{doi_suffix}",
            "AMA": f"{authors}. {title}. In: {journal_ref}. {year};{doi_suffix}",
            "ACS": f"{authors}. {title}. In {journal_ref}, {year}.{doi_suffix}"
        }
    elif ref_type == "preprint_arxiv":
        base_arxiv_id = arxiv_id.split("v")[0] if arxiv_id else ""
        arxiv_url = f"https://arxiv.org/abs/{base_arxiv_id}" if base_arxiv_id else ""

        citation_styles = {
            "APA": f"{authors} ({year}). {title_apa}. arXiv. {arxiv_url}",
            "MLA": f"{authors}. \"{title}.\" arXiv, {year}. {arxiv_url}",
            "ISO690": f"{authors_upper}. {title}. arXiv, {year}. {arxiv_url}",
            "Chicago": f"{authors}. \"{title}.\" arXiv, {year}. {arxiv_url}",
            "IEEE": f"{authors}, \"{title},\" arXiv, {year}. {arxiv_url}",
            "AMA": f"{authors}. {title}. arXiv. Published {year}. {arxiv_url}",
            "ACS": f"{authors}. {title}. arXiv {year}. {arxiv_url}"
        }

    else:
        citation_styles = {
            style: f"{authors} ({year}). {title}. [Reference type unknown].{doi_suffix}" for style in
            ["APA", "MLA", "ISO690", "Chicago", "IEEE", "AMA", "ACS"]
        }

    return {
        "reference_type": ref_type,
        "year": year,
        **citation_styles
    }

def generate_citations_for_papers(data: dict):
    """
    Generate citations for papers based on database records.

    Parameters:
    - data: dict with paperIds (list) and style (str)

    Returns:
    - dict: Citations for each paper ID
    """
    paper_ids = data.get("paperIds")
    style = data.get("style")

    if not paper_ids or not isinstance(paper_ids, list) or not style:
        raise HTTPException(status_code=400, detail="Missing or invalid paperIds or style")

    conn = get_connection()
    cursor = conn.cursor()
    citations = {}

    # Filter paper_ids to ensure they are integers
    try:
        filtered_paper_ids = [int(pid) for pid in paper_ids if isinstance(pid, (str, int)) and str(pid).isdigit()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid paper IDs: must be integers")

    if not filtered_paper_ids:
        return {"citations": {}}

    try:
        cursor.execute("""
            SELECT id, title, authors, journal_ref, arxivID, publish_date, doi
            FROM papers_new
            WHERE id = ANY(%s)
        """, (filtered_paper_ids,))
        rows = cursor.fetchall()

        for row in rows:
            pid, title, authors, journal_ref, arxiv_id, publish_date, doi = row
            if not title:
                title = "[Title Missing]"
            if not authors:
                authors = ["[Unknown Author]"]
            formatted_authors = format_authors_by_style(authors, style)
            year = str(publish_date.year) if publish_date else None

            citation_dict = format_citation(
                authors=formatted_authors,
                title=title,
                journal_ref=journal_ref,
                arxiv_id=arxiv_id,
                year=year,
                doi=doi
            )
            citations[pid] = citation_dict.get(style, "Unsupported style")

        return {"citations": citations}

    finally:
        cursor.close()
        conn.close()