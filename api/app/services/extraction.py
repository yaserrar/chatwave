from io import BytesIO

from pypdf import PdfReader


def extract_pages(content: bytes, ext: str) -> list[tuple[int, str]]:
    """
    (page number, text) for every page that has text.

    Markdown and text files are one page holding the file exactly as a browser decodes it (UTF-8, byte order
    mark dropped, nothing trimmed), so chunk offsets point at the same characters in the viewer.
    """
    pages = []

    if ext == ".txt" or ext == ".md":
        text = content.decode("utf-8-sig", errors="replace")
        if not text.strip():
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
