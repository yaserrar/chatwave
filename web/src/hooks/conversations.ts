import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '~/lib/query-keys';
import { conversationsApi } from '~/services/api/conversations';
import type { ConversationDto, MessageDto } from '~/types/chat';

export const conversationsQuery = (projectId: string) =>
  queryOptions({ queryKey: qk.conversations.list(projectId), queryFn: () => conversationsApi.list(projectId) });

/** A project's conversations, most recently active first (the API orders them). */
export const useConversations = (projectId: string) => useQuery(conversationsQuery(projectId));

export const useMessages = (conversationId: string | null) =>
  useQuery({
    queryKey: qk.messages(conversationId ?? ''),
    queryFn: () => conversationsApi.messages(conversationId!),
    enabled: Boolean(conversationId),
  });

export function useCreateConversation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => conversationsApi.create(projectId),
    onSuccess: (conversation) => {
      qc.setQueryData<ConversationDto[]>(qk.conversations.list(projectId), (list) => [conversation, ...(list ?? [])]);
      // A brand-new conversation has no messages: seed the cache so the panel doesn't flash a loader
      qc.setQueryData<MessageDto[]>(qk.messages(conversation.id), []);
    },
  });
}

export type AskVariables = { conversationId: string; question: string };

/**
 * Asks a question. The question shows at once (optimistic message with a temporary id) and the answer is
 * appended when the API returns it. On failure the optimistic question is removed, then the messages are
 * refetched: the API may have saved the question before the LLM failed.
 */
export function useAsk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, question }: AskVariables) => conversationsApi.ask(conversationId, question),
    onMutate: async ({ conversationId, question }) => {
      const key = qk.messages(conversationId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<MessageDto[]>(key);
      const optimistic: MessageDto = {
        id: `optimistic-${crypto.randomUUID()}`,
        conversation_id: conversationId,
        role: 'user',
        content: question,
        sources: null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<MessageDto[]>(key, (list) => [...(list ?? []), optimistic]);
      return { previous };
    },
    onError: (_error, { conversationId }, context) => {
      qc.setQueryData(qk.messages(conversationId), context?.previous);
    },
    onSuccess: (answer, { conversationId }) => {
      qc.setQueryData<MessageDto[]>(qk.messages(conversationId), (list) => [...(list ?? []), answer]);
    },
    onSettled: (_data, _error, { conversationId }) => {
      // Real ids for the optimistic question, plus the new title / order of the conversations list
      void qc.invalidateQueries({ queryKey: qk.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: qk.conversations.list(projectId) });
    },
  });
}
