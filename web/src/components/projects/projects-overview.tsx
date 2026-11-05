import * as React from 'react';
import { Add, FolderOpen, MessageQuestion, ShieldTick, DocumentUpload } from 'iconsax-react';
import { PageContainer, PageHeader } from '~/components/layout/page-header';
import { EmptyState } from '~/components/shared/empty-state';
import { ErrorState } from '~/components/shared/error-state';
import { Button } from '~/components/ui/button';
import { useProjects } from '~/hooks/projects';
import { plural } from '~/lib/format';
import { ProjectCard, ProjectCardSkeleton } from './project-card';
import { ProjectFormDialog } from './project-form-dialog';

const STEPS = [
  { icon: FolderOpen, title: 'Create a project', text: 'One per supplier, machine or topic. Nothing leaks between them.' },
  { icon: DocumentUpload, title: 'Add documents', text: 'PDF, Markdown or text. Each one is read and indexed in the background.' },
  { icon: MessageQuestion, title: 'Ask questions', text: 'Answers come only from that project’s documents, with sources.' },
] as const;

/** The home page: every project as a card, or a first-run explanation when there are none. */
export function ProjectsOverview() {
  const projects = useProjects();
  const [creating, setCreating] = React.useState(false);
  const count = projects.data?.length ?? 0;

  const newButton = (
    <Button onClick={() => setCreating(true)}>
      <Add aria-hidden />
      New project
    </Button>
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description={
          projects.isSuccess && count > 0
            ? `${plural(count, 'project')}. Each one answers only from its own documents.`
            : 'Each project answers only from its own documents.'
        }
        actions={projects.isSuccess && count > 0 ? newButton : null}
      />

      {projects.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading projects">
          {Array.from({ length: 6 }, (_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : projects.isError ? (
        <ErrorState title="Projects could not be loaded" error={projects.error} onRetry={() => projects.refetch()} retrying={projects.isFetching} />
      ) : count === 0 ? (
        <FirstRun action={newButton} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.data.map((project, i) => (
            <li key={project.id} className="flex animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}

      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
    </PageContainer>
  );
}

function FirstRun({ action }: { action: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <EmptyState
        icon={ShieldTick}
        size="lg"
        title="Start with your first project"
        description="A project is a private knowledge base: upload its documents, then chat with them."
        action={action}
      />
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                <step.icon aria-hidden className="size-4" />
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">0{i + 1}</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-h3 text-foreground">{step.title}</p>
              <p className="text-[13px] leading-5 text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
