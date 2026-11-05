import { z } from 'zod';

/** Mirrors `ProjectCreate` in api/app/schemas/project.py. */
export const PROJECT_LIMITS = { name: 255, description: 2000 } as const;

export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the project a name.')
    .max(PROJECT_LIMITS.name, `Keep the name under ${PROJECT_LIMITS.name} characters.`),
  description: z
    .string()
    .trim()
    .max(PROJECT_LIMITS.description, `Keep the description under ${PROJECT_LIMITS.description} characters.`),
});

export type ProjectFormInput = z.input<typeof projectFormSchema>;
export type ProjectFormValues = z.output<typeof projectFormSchema>;

/** The JSON body of POST /projects and PUT /projects/{id}. */
export type ProjectBody = { name: string; description: string | null };

/** An empty description is stored as null, not "". */
export const toProjectBody = (values: ProjectFormValues): ProjectBody => ({
  name: values.name,
  description: values.description || null,
});
