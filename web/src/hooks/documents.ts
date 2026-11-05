import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { STATUS_POLL_MS } from '~/constants/uploads';
import { qk } from '~/lib/query-keys';
import { documentsApi } from '~/services/api/documents';
import type { DocumentDto } from '~/types/document';

const isWorking = (doc: DocumentDto) => doc.status === 'pending' || doc.status === 'processing';

export const documentsQuery = (projectId: string) =>
  queryOptions({ queryKey: qk.documents.list(projectId), queryFn: () => documentsApi.list(projectId) });

/**
 * Documents of a project. With `poll`, the list refreshes while any document is still pending or
 * processing, so statuses move to "ready" (or "failed") on their own.
 */
export const useDocuments = (projectId: string, { poll = false }: { poll?: boolean } = {}) =>
  useQuery({
    ...documentsQuery(projectId),
    refetchInterval: poll ? (query) => (query.state.data?.some(isWorking) ? STATUS_POLL_MS : false) : false,
  });

export function useDocument(projectId: string, documentId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.documents.detail(projectId, documentId ?? ''),
    queryFn: () => documentsApi.get(projectId, documentId!),
    enabled: Boolean(documentId),
    // Shown instantly from the cached list while the detail request runs.
    placeholderData: () =>
      qc.getQueryData<DocumentDto[]>(qk.documents.list(projectId))?.find((d) => d.id === documentId),
  });
}

/** Uploads one file. The documents panel calls it once per dropped file. */
export function useUploadDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    meta: { silent: true },
    mutationFn: (file: File) => documentsApi.upload(projectId, file),
    onSuccess: (doc) => {
      qc.setQueryData<DocumentDto[]>(qk.documents.list(projectId), (list) => (list ? [...list, doc] : [doc]));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.documents.list(projectId) }),
  });
}
