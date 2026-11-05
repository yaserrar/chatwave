import { Link, useParams, useRouterState } from '@tanstack/react-router';
import { ArrowRight2, HambergerMenu } from 'iconsax-react';
import { Button } from '~/components/ui/button';
import { useProject } from '~/hooks/projects';
import { cn } from '~/lib/utils';

/** The current project's name, from the cache the page already filled. */
function ProjectCrumb({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  return <>{project.data?.name ?? (project.isError ? 'Not found' : '…')}</>;
}

/** Top bar: menu button (< lg) and breadcrumbs (Projects › project, or Documentation). */
export function AppTopbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { projectId } = useParams({ strict: false });
  const onDocumentation = useRouterState({ select: (s) => s.location.pathname.startsWith('/documentation') });

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation" onClick={onOpenNav}>
        <HambergerMenu aria-hidden className="size-5" />
      </Button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center">
        {onDocumentation ? (
          <span aria-current="page" className="truncate px-1 text-sm font-medium text-foreground">
            Documentation
          </span>
        ) : (
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          <li className={cn('flex min-w-0 items-center gap-1', projectId && 'hidden sm:flex')}>
            {projectId ? (
              <Link
                to="/"
                className="truncate rounded-sm px-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Projects
              </Link>
            ) : (
              <span aria-current="page" className="truncate px-1 font-medium text-foreground">
                Projects
              </span>
            )}
            {projectId ? <ArrowRight2 aria-hidden className="size-3 shrink-0 text-muted-foreground" /> : null}
          </li>
          {projectId ? (
            <li className="flex min-w-0 items-center">
              <span aria-current="page" className="truncate px-1 font-medium text-foreground">
                <ProjectCrumb projectId={projectId} />
              </span>
            </li>
          ) : null}
        </ol>
        )}
      </nav>
    </header>
  );
}
