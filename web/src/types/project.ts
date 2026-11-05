/** What the API returns for a project (`ProjectRead` in api/app/schemas/project.py). */
export type ProjectDto = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};
