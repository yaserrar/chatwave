import type { ProjectBody } from '~/schemas/project';
import type { ProjectDto } from '~/types/project';
import { api } from './client';

export const projectsApi = {
  list: () => api.get<ProjectDto[]>('/projects'),
  get: (projectId: string) => api.get<ProjectDto>(`/projects/${projectId}`),
  create: (body: ProjectBody) => api.post<ProjectDto>('/projects', body),
  // The API exposes PUT with partial semantics (only the fields sent are changed).
  update: (projectId: string, body: Partial<ProjectBody>) => api.put<ProjectDto>(`/projects/${projectId}`, body),
  remove: (projectId: string) => api.delete(`/projects/${projectId}`),
};
