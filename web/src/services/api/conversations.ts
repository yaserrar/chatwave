import type { ConversationDto, MessageDto } from '~/types/chat';
import { api, ApiError } from './client';

export const conversationsApi = {
  list: (projectId: string) => api.get<ConversationDto[]>(`/projects/${projectId}/conversations`),
  create: (projectId: string, body: { title?: string | null } = {}) =>
    api.post<ConversationDto>(`/projects/${projectId}/conversations`, body),
  messages: (conversationId: string) => api.get<MessageDto[]>(`/conversations/${conversationId}/messages`),
  /**
   * Streams the answer (Server-Sent Events): `onText` gets each piece of text as Claude writes it, then the
   * promise resolves with the saved assistant message, sources included.
   */
  ask: async (conversationId: string, question: string, onText: (text: string) => void): Promise<MessageDto> => {
    for await (const { event, data } of api.stream(`/conversations/${conversationId}/ask`, { question })) {
      if (event === 'delta') onText((data as { text: string }).text);
      else if (event === 'done') return data as MessageDto;
      else if (event === 'error') throw new ApiError(502, (data as { detail: string }).detail);
    }
    throw new ApiError(502, 'The answer stopped before it was finished. Try again.');
  },
};
