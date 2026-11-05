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

/** Id prefix of the answer while it is being written (not saved yet). */
export const STREAMING_PREFIX = 'streaming-';

/**
 * Asks a question. The question shows at once (optimistic message with a temporary id). The answer is
 * streamed: a draft assistant message appears with the first words and grows as Claude writes, then it is
 * replaced by the saved message (real id, sources). On failure the optimistic messages are removed, then the
 * messages are refetched: the API may have saved the question before the LLM failed.
 */
export function useAsk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, question }: AskVariables) => {
      const key = qk.messages(conversationId);
      const draft: MessageDto = {
        id: `${STREAMING_PREFIX}${crypto.randomUUID()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        sources: null,
        created_at: new Date().toISOString(),
      };
      // Puts `message` in place of the draft, or at the end the first time
      const upsert = (message: MessageDto) =>
        qc.setQueryData<MessageDto[]>(key, (list = []) =>
          list.some((m) => m.id === draft.id) ? list.map((m) => (m.id === draft.id ? message : m)) : [...list, message],
        );

      const answer = await conversationsApi.ask(conversationId, question, (text) => {
        draft.content += text;
        upsert({ ...draft });
      });
      upsert(answer);
      return answer;
    },
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
    onSettled: (_data, _error, { conversationId }) => {
      // Real id for the optimistic question, plus the new title / order of the conversations list
      void qc.invalidateQueries({ queryKey: qk.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: qk.conversations.list(projectId) });
    },
  });
}
