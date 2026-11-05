from pathlib import Path
from pypdf import PdfReader

def extract_pages(path: str) -> list[tuple[int, str]]:
    pages = []

    ext = Path(path).suffix.lower()

    if ext == ".txt" or ext == ".md":
        text = Path(path).read_text(encoding="utf-8", errors="replace").strip()
        if not text:
            raise ValueError("No text could be extracted from the file.")
        pages.append((1, text))

    elif ext == ".pdf":
        path = Path(path)
        reader = PdfReader(str(path))
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