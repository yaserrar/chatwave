import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { FormAlert, FormField } from '~/components/shared/form-field';
import { ProjectTile } from '~/components/shared/project-tile';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { useCreateProject, useUpdateProject } from '~/hooks/projects';
import { applyServerErrors } from '~/lib/form-errors';
import { PROJECT_LIMITS, projectFormSchema, toProjectBody } from '~/schemas/project';
import type { ProjectDto } from '~/types/project';

const FIELDS = ['name', 'description'] as const;

/**
 * Create or edit a project. Creating opens the new project, unless `onSaved` is passed
 * (it receives the saved project).
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectDto;
  onSaved?: (project: ProjectDto) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? <ProjectForm project={project} onDone={() => onOpenChange(false)} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({
  project,
  onDone,
  onSaved,
}: {
  project?: ProjectDto;
  onDone: () => void;
  onSaved?: (project: ProjectDto) => void;
}) {
  const navigate = useNavigate();
  const create = useCreateProject({ silent: true });
  const update = useUpdateProject(project?.id ?? '', { silent: true });
  const pending = create.isPending || update.isPending;
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: project?.name ?? '', description: project?.description ?? '' },
  });
  const name = useWatch({ control: form.control, name: 'name' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const body = toProjectBody(values);
      const saved = project ? await update.mutateAsync(body) : await create.mutateAsync(body);
      onDone();
      onSaved?.(saved);
      if (!project) navigate({ to: '/projects/$projectId', params: { projectId: saved.id } });
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="contents">
      <DialogHeader className="flex-row items-center gap-3">
        <ProjectTile id={project?.id ?? 'new'} name={name || '·'} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
          <DialogDescription>
            {project ? 'Changes apply everywhere the project appears.' : 'A space with its own documents and conversations.'}
          </DialogDescription>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <FormField control={form.control} name="name" label="Name">
          {(field, aria) => (
            <Input {...field} {...aria} maxLength={PROJECT_LIMITS.name} placeholder="Supplier A — technical manuals" autoFocus />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="description"
          label="Description"
          optional
          description="What these documents are about. It helps you find the project later."
        >
          {(field, aria) => (
            <Textarea
              {...field}
              {...aria}
              rows={3}
              maxLength={PROJECT_LIMITS.description}
              placeholder="Manuals, contracts and maintenance procedures for line 3."
            />
          )}
        </FormField>
        <FormAlert message={formError} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
        </Button>
      </DialogFooter>
    </form>
  );
}
