/**
 * Every model has an `all` prefix, so a mutation can invalidate a whole family in one call
 * (e.g. every documents query of a project).
 */
export const qk = {
  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  },
  documents: {
    all: (projectId: string) => ['documents', projectId] as const,
    list: (projectId: string) => ['documents', projectId, 'list'] as const,
    detail: (projectId: string, documentId: string) => ['documents', projectId, 'detail', documentId] as const,
    /** The inline preview link and the file's text (MD/TXT), both short-lived. */
    previewUrl: (projectId: string, documentId: string) => ['documents', projectId, 'preview-url', documentId] as const,
    previewText: (projectId: string, documentId: string) => ['documents', projectId, 'preview-text', documentId] as const,
  },
  conversations: {
    all: (projectId: string) => ['conversations', projectId] as const,
    list: (projectId: string) => ['conversations', projectId, 'list'] as const,
  },
  messages: (conversationId: string) => ['messages', conversationId] as const,
};
