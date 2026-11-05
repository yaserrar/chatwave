import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { MutationOptions } from '~/lib/query-client';
import { qk } from '~/lib/query-keys';
import type { ProjectBody } from '~/schemas/project';
import { projectsApi } from '~/services/api/projects';
import type { ProjectDto } from '~/types/project';

export const projectsQuery = () => queryOptions({ queryKey: qk.projects.list(), queryFn: projectsApi.list });

export const projectQuery = (projectId: string) =>
  queryOptions({ queryKey: qk.projects.detail(projectId), queryFn: () => projectsApi.get(projectId) });

export const useProjects = () => useQuery(projectsQuery());

export const useProject = (projectId: string) => useQuery(projectQuery(projectId));

export function useCreateProject({ silent }: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    meta: { silent },
    mutationFn: (body: ProjectBody) => projectsApi.create(body),
    onSuccess: (project) => {
      qc.setQueryData(qk.projects.detail(project.id), project);
      return qc.invalidateQueries({ queryKey: qk.projects.list() });
    },
  });
}

export function useUpdateProject(projectId: string, { silent }: MutationOptions = {}) {
  const qc = useQueryClient();
  return useMutation({
    meta: { silent },
    mutationFn: (body: Partial<ProjectBody>) => projectsApi.update(projectId, body),
    onSuccess: (project) => {
      qc.setQueryData(qk.projects.detail(projectId), project);
      // Patch the list in place so the sidebar and cards update without a refetch flash.
      qc.setQueryData<ProjectDto[]>(qk.projects.list(), (list) => list?.map((p) => (p.id === projectId ? project : p)));
    },
  });
}

/**
 * Deletes a project and drops it from the list. Its detail and documents caches are left for the caller
 * to clear with `forgetProject` once the project page has unmounted: clearing them while it is still
 * on screen would make it refetch a project that no longer exists.
 */
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectsApi.remove(projectId),
    onSuccess: (_, projectId) => {
      qc.setQueryData<ProjectDto[]>(qk.projects.list(), (list) => list?.filter((p) => p.id !== projectId));
    },
  });
}

export function forgetProject(qc: QueryClient, projectId: string) {
  qc.removeQueries({ queryKey: qk.projects.detail(projectId) });
  qc.removeQueries({ queryKey: qk.documents.all(projectId) });
  qc.removeQueries({ queryKey: qk.conversations.all(projectId) });
}
