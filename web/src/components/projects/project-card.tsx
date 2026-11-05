import { Link } from '@tanstack/react-router';
import { DocStatusDot } from '~/components/shared/doc-status';
import { ProjectTile } from '~/components/shared/project-tile';
import { Skeleton } from '~/components/ui/skeleton';
import { useDocuments } from '~/hooks/documents';
import { formatDate, formatRelative, plural } from '~/lib/format';
import type { DocumentStatus } from '~/types/document';
import type { ProjectDto } from '~/types/project';
import { ProjectActions } from './project-actions';

/**
 * A project at a glance. The whole card links to the project (stretched link on the name), while the
 * actions menu stays clickable above it.
 */
export function ProjectCard({ project }: { project: ProjectDto }) {
  const documents = useDocuments(project.id);
  const docs = documents.data ?? [];
  const count = (status: DocumentStatus) => docs.filter((d) => d.status === status).length;

  return (
    <article className="group/card relative isolate flex w-full flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring motion-reduce:hover:translate-y-0">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <ProjectTile id={project.id} name={project.name} />
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="truncate text-sm leading-5 font-semibold text-foreground">
              <Link
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="outline-none after:absolute after:inset-0 after:content-['']"
              >
                {project.name}
              </Link>
            </h3>
            <p className="font-mono text-[11px] leading-5 text-muted-foreground tabular-nums">
              Created {formatDate(project.created_at)}
            </p>
          </div>
          <ProjectActions
            project={project}
            documentCount={docs.length}
            variant="ghost"
            className="relative z-10 -mt-1 -mr-1 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100"
          />
        </div>

        <p className="line-clamp-2 min-h-10 text-[13px] leading-5 text-ink-2">
          {project.description || <span className="text-muted-foreground">No description</span>}
        </p>
      </div>

      <footer className="flex min-h-12 items-center justify-between gap-3 border-t border-hairline px-4 py-2.5">
        {documents.isPending ? (
          <Skeleton className="h-3.5 w-28" />
        ) : (
          <div className="flex min-w-0 items-center gap-3 text-xs">
            <span className="font-medium text-foreground">{plural(docs.length, 'document')}</span>
            {count('ready') > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <DocStatusDot status="ready" className="size-1.5" />
                {count('ready')} ready
              </span>
            ) : null}
            {count('pending') + count('processing') > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <DocStatusDot status="pending" className="size-1.5" />
                {count('pending') + count('processing')} queued
              </span>
            ) : null}
          </div>
        )}
        <span className="shrink-0 truncate font-mono text-[11px] text-muted-foreground tabular-nums">
          Updated {formatRelative(project.updated_at)}
        </span>
      </footer>
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      <div className="flex h-12 items-center justify-between border-t border-hairline px-4">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}
