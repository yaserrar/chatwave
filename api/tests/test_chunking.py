from app.services.chunking import chunk_pages
from app.services.extraction import extract_pages


def test_offsets_point_at_the_chunk_in_its_page():
    words = " ".join(f"word{i}" for i in range(1500))
    pages = [(1, "  Intro line.\n\n" + words + "\n  "), (2, "Second page text.")]
    chunks = chunk_pages(pages, chunk_size=500, overlap=50)
    texts = dict(pages)
    assert len(chunks) > 3
    for chunk in chunks:
        assert texts[chunk.page_number][chunk.char_start : chunk.char_end] == chunk.content
        assert chunk.content == chunk.content.strip()
    assert [c.chunk_index for c in chunks] == list(range(len(chunks)))
    assert chunks[-1].page_number == 2


def test_text_files_keep_their_exact_characters():
    content = "﻿# Title\n\nBody with an accent: café.\n".encode("utf-8")
    [(page, text)] = extract_pages(content, ".md")
    assert page == 1
    # Decoded like a browser does: byte order mark dropped, nothing trimmed
    assert text == "# Title\n\nBody with an accent: café.\n"
    [chunk] = chunk_pages([(page, text)])
    assert text[chunk.char_start : chunk.char_end] == "# Title\n\nBody with an accent: café."
