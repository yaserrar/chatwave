import type { DocumentDto } from '~/types/document';
import { api } from './client';

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
};
