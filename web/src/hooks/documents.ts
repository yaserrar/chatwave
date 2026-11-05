import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { STATUS_POLL_MS } from '~/constants/uploads';
import { qk } from '~/lib/query-keys';
import { documentsApi, fetchFileText } from '~/services/api/documents';
import type { DocumentDto, DocumentUrlDto } from '~/types/document';

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

/**
 * Deletes a document and drops it from the cached list right away. The detail cache is cleared by the
 * caller once the sheet showing it has closed (see `forgetDocument`), so it is not refetched as a 404.
 */
export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.remove(projectId, documentId),
    onSuccess: (_, documentId) => {
      qc.setQueryData<DocumentDto[]>(qk.documents.list(projectId), (list) => list?.filter((d) => d.id !== documentId));
    },
  });
}

export function forgetDocument(qc: QueryClient, projectId: string, documentId: string) {
  qc.removeQueries({ queryKey: qk.documents.detail(projectId, documentId) });
  qc.removeQueries({ queryKey: qk.documents.previewUrl(projectId, documentId) });
  qc.removeQueries({ queryKey: qk.documents.previewText(projectId, documentId) });
}

/**
 * Presigned links expire (expires_in, 300 s by default). Treat a cached link as stale a minute before that,
 * so reopening the preview later asks the API for a fresh one instead of showing a dead link.
 */
const linkStaleTime = (data: DocumentUrlDto | undefined) => (data ? Math.max(data.expires_in - 60, 30) * 1000 : 0);

/** Inline link used by the preview (PDF in an iframe, MD/TXT fetched as text). */
export function useDocumentPreviewUrl(projectId: string, documentId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: qk.documents.previewUrl(projectId, documentId),
    queryFn: () => documentsApi.url(projectId, documentId),
    enabled,
    staleTime: (query) => linkStaleTime(query.state.data),
    // Refetching on focus would swap the iframe's link and reload the PDF under the reader.
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** The text of a Markdown or text file, read from its preview link. */
export function useDocumentText(projectId: string, documentId: string, url: string | undefined) {
  return useQuery({
    queryKey: qk.documents.previewText(projectId, documentId),
    queryFn: ({ signal }) => fetchFileText(url!, signal),
    enabled: Boolean(url),
    staleTime: 5 * 60_000, // a stored file never changes
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Asks for an attachment link and starts the download. S3 sends the original filename
 * (Content-Disposition), so the anchor's `download` attribute is only a hint for same-origin links.
 */
export function useDownloadDocument(projectId: string) {
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.url(projectId, documentId, { download: true }),
    onSuccess: ({ url }) => {
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
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
