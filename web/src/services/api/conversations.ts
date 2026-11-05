import type { ConversationDto, MessageDto } from '~/types/chat';
import { api } from './client';

export const conversationsApi = {
  list: (projectId: string) => api.get<ConversationDto[]>(`/projects/${projectId}/conversations`),
  create: (projectId: string, body: { title?: string | null } = {}) =>
    api.post<ConversationDto>(`/projects/${projectId}/conversations`, body),
  messages: (conversationId: string) => api.get<MessageDto[]>(`/conversations/${conversationId}/messages`),
  /** Not streamed yet (milestone 6): resolves with the whole assistant message, sources included. */
  ask: (conversationId: string, question: string) =>
    api.post<MessageDto>(`/conversations/${conversationId}/ask`, { question }),
};
