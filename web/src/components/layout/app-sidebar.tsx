import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { Add, Element3, type Icon } from 'iconsax-react';
import { ProjectFormDialog } from '~/components/projects/project-form-dialog';
import { ProjectTile } from '~/components/shared/project-tile';
import { Skeleton } from '~/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useProjects } from '~/hooks/projects';
import { cn } from '~/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { Wordmark } from './wordmark';

const itemClass =
  'group/nav flex h-8 min-w-0 items-center gap-2.5 rounded-md px-2 text-[13px] text-ink-2 transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-sidebar-foreground aria-[current=page]:shadow-xs dark:aria-[current=page]:bg-sidebar-accent';

const ACTIVE = { 'aria-current': 'page' } as const;

function NavLink({ icon: Icon, label, onNavigate }: { icon: Icon; label: string; onNavigate?: () => void }) {
  return (
    <Link to="/" activeOptions={{ exact: true }} activeProps={ACTIVE} className={itemClass} onClick={onNavigate}>
      <Icon aria-hidden className="size-[18px] shrink-0" />
      {label}
    </Link>
  );
}

/** Sidebar content, shared by the desktop rail and the mobile sheet. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const projects = useProjects();
  const [creating, setCreating] = React.useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-1 px-4 pt-4 pb-3">
        <Link to="/" onClick={onNavigate} className="w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <Wordmark />
        </Link>
        <p className="pl-8 text-xs text-muted-foreground">Chat with your documents</p>
      </div>

      <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2.5 py-2">
        <ul className="flex flex-col gap-0.5">
          <li>
            <NavLink icon={Element3} label="All projects" onNavigate={onNavigate} />
          </li>
        </ul>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-eyebrow">Projects</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="New project"
                  onClick={() => setCreating(true)}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <Add aria-hidden className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">New project</TooltipContent>
            </Tooltip>
          </div>

          {projects.isPending ? (
            <ul className="flex flex-col gap-1 px-2 py-1" aria-hidden>
              {[60, 75, 50, 68].map((w) => (
                <li key={w} className="flex h-7 items-center gap-2.5">
                  <Skeleton className="size-5 rounded-[5px]" />
                  <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
                </li>
              ))}
            </ul>
          ) : projects.isError ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Projects could not be loaded.{' '}
              <button type="button" className="text-brand-ink underline-offset-2 hover:underline" onClick={() => projects.refetch()}>
                Retry
              </button>
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {projects.data.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    activeProps={ACTIVE}
                    onClick={onNavigate}
                    className={itemClass}
                  >
                    <ProjectTile id={p.id} name={p.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setCreating(true)} className={cn(itemClass, 'w-full text-muted-foreground')}>
                  <span className="inline-flex size-5 items-center justify-center rounded-[5px] border border-dashed border-border-strong">
                    <Add aria-hidden className="size-3.5" />
                  </span>
                  New project
                </button>
              </li>
            </ul>
          )}
        </div>
      </nav>

      <div className="flex items-center justify-between border-t border-sidebar-border p-2.5 pl-4.5">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>

      <ProjectFormDialog open={creating} onOpenChange={setCreating} onSaved={onNavigate} />
    </div>
  );
}
