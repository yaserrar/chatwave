/** `ConversationRead` in api/app/schemas/conversation.py. */
export type ConversationDto = {
  id: string;
  project_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

/** One passage an answer was based on (`SourceRead`). */
export type SourceDto = {
  document_id: string;
  filename: string;
  page_number: number;
};

export type MessageRole = 'user' | 'assistant';

/** `MessageRead`. `sources` is null on user messages, possibly empty on answers that cite nothing. */
export type MessageDto = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources: SourceDto[] | null;
  created_at: string;
};
