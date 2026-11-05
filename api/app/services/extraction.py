from pathlib import Path
from pypdf import PdfReader
from app.services import storage
from io import BytesIO

def extract_pages(content: bytes, ext: str) -> list[tuple[int, str]]:
    pages = []

    if ext == ".txt" or ext == ".md":
        text = content.decode("utf-8", errors="replace").strip()
        if not text:
            raise ValueError("No text could be extracted from the file.")
        pages.append((1, text))

    elif ext == ".pdf":
        reader = PdfReader(BytesIO(content))
        for i, page in enumerate(reader.pages):
            text = page.extract_text().strip()
            if not text:
                continue
            pages.append((i + 1, text))

    else:
        raise ValueError(f"Unsupported file extension: {ext}")

    if not pages:
        raise ValueError("No text could be extracted from the file.")
    
    return pages