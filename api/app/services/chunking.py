def chunk_pages(pages: list[tuple[int, str]], chunk_size: int = 2000, overlap: int = 200) -> list[tuple[int, int, str]]:
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

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append((page_num, chunk_index, chunk_text))
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
