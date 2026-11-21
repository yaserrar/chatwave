from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    """
    One piece of a page. `char_start` / `char_end` locate `content` in the page's text
    (`page_text[char_start:char_end] == content`), so a viewer can jump to the exact passage.
    For Markdown and text files the "page" is the whole file.
    """

    page_number: int
    chunk_index: int
    content: str
    char_start: int
    char_end: int


def chunk_pages(pages: list[tuple[int, str]], chunk_size: int = 2000, overlap: int = 200) -> list[TextChunk]:
    chunks = []
    chunk_index = 0  # position in the whole document, so it keeps counting across pages

    for page_num, text in pages:
        start = 0
        while start < len(text):
            end = start + chunk_size

            # Don't cut a word in half: end at the last space, if there is one in the second half of the window
            if end < len(text):
                last_space = text.rfind(" ", start, end)
                if last_space > start + chunk_size // 2:
                    end = last_space

            window = text[start:end]
            chunk_text = window.strip()
            if chunk_text:
                # Where the stripped text really starts and ends in the page
                chunk_start = start + (len(window) - len(window.lstrip()))
                chunks.append(TextChunk(page_num, chunk_index, chunk_text, chunk_start, chunk_start + len(chunk_text)))
                chunk_index += 1

            # Reached the end of the page: stop, otherwise the overlap would become an extra duplicate chunk
            if end >= len(text):
                break

            start = end - overlap if end - overlap > start else end

            # The overlap usually lands mid-word too: start the next chunk after the next space
            next_space = text.find(" ", start, end)
            if next_space != -1:
                start = next_space + 1

    return chunks
