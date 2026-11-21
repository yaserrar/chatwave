/** `ConversationRead` in api/app/schemas/conversation.py. */
export type ConversationDto = {
  id: string;
  project_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * One passage an answer was based on (`SourceRead`). The passage fields are null on answers saved before
 * citations pointed at passages: those open on the cited page, without a highlight.
 */
export type SourceDto = {
  document_id: string;
  filename: string;
  page_number: number;
  /** The [n] number the answer's text uses for this passage. */
  passage?: number | null;
  chunk_id?: number | null;
  /** Where the passage starts and ends in its page's text (whole file for MD/TXT), when known. */
  char_start?: number | null;
  char_end?: number | null;
  /** The passage itself: highlighted in the document, or shown as is if it can't be found there. */
  excerpt?: string | null;
};

/** How strong the retrieved evidence behind an answer was (computed by the API before Claude writes). */
export type Confidence = 'high' | 'medium' | 'low';

export type MessageRole = 'user' | 'assistant';

/** `MessageRead`. `sources` is null on user messages, possibly empty on answers that cite nothing. */
export type MessageDto = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources: SourceDto[] | null;
  /** Answers only; null on user messages and on answers saved before confidence was measured. */
  confidence: Confidence | null;
  /** The documents don't answer the question: `sources` then lists the closest passages. */
  not_found: boolean;
  created_at: string;
};
