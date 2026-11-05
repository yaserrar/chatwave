import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Edit2, More, Trash } from 'iconsax-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '~/components/shared/confirm-dialog';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { forgetProject, useDeleteProject } from '~/hooks/projects';
import { plural } from '~/lib/format';
import type { ProjectDto } from '~/types/project';
import { ProjectFormDialog } from './project-form-dialog';

/** "⋯" menu with Edit and Delete. Deleting leaves the project page for the overview. */
export function ProjectActions({
  project,
  documentCount,
  variant = 'outline',
  className,
}: {
  project: ProjectDto;
  documentCount?: number;
  variant?: 'outline' | 'ghost';
  className?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const remove = useDeleteProject();
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function confirmDelete() {
    await remove.mutateAsync(project.id);
    toast.success(`Deleted “${project.name}”`);
    await navigate({ to: '/dashboard' });
    forgetProject(qc, project.id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size="icon-sm" aria-label={`Actions for ${project.name}`} className={className}>
            <More aria-hidden className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Edit2 aria-hidden />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash aria-hidden />
            Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={project} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        destructive
        title={`Delete “${project.name}”?`}
        description={
          documentCount
            ? `Its ${plural(documentCount, 'document')} and every conversation go with it. This cannot be undone.`
            : 'Its documents and conversations go with it. This cannot be undone.'
        }
        confirmLabel="Delete project"
        onConfirm={confirmDelete}
      />
    </>
  );
}
