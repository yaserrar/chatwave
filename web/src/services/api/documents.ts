import type { DocumentDto, DocumentUrlDto } from '~/types/document';
import { ApiError, api } from './client';

const base = (projectId: string) => `/projects/${projectId}/documents`;

export const documentsApi = {
  list: (projectId: string) => api.get<DocumentDto[]>(base(projectId)),
  get: (projectId: string, documentId: string) => api.get<DocumentDto>(`${base(projectId)}/${documentId}`),
  /** One file per request: the endpoint takes a single `file` field. */
  upload: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<DocumentDto>(base(projectId), form);
  },
  /** Deletes the row and the file in S3 (204). */
  remove: (projectId: string, documentId: string) => api.delete(`${base(projectId)}/${documentId}`),
  /** Presigned S3 link: inline for the preview, or as an attachment for downloading. */
  url: (projectId: string, documentId: string, { download = false }: { download?: boolean } = {}) =>
    api.get<DocumentUrlDto>(`${base(projectId)}/${documentId}/url`, { download }),
};

/**
 * Reads a Markdown or text file straight from its presigned S3 URL. The browser talks to S3 directly (not
 * through the API), which is why the bucket needs a CORS rule allowing GET from the web app's origin.
 */
export async function fetchFileText(url: string, signal?: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    // A blocked CORS request lands here too: fetch cannot tell the two apart.
    throw new ApiError(0, 'The file could not be loaded from storage. Check the bucket’s CORS rule.');
  }
  if (!res.ok) throw new ApiError(res.status, res.status === 403 ? 'The preview link expired. Open the preview again.' : 'The file could not be loaded.');
  return res.text();
}
