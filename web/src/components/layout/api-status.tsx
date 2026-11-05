import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useHealth } from '~/hooks/health';
import { cn } from '~/lib/utils';
import { errorMessage } from '~/services/api/client';

/** "● API online" from GET /api/health. Handy while the API is being built. */
export function ApiStatus({ className }: { className?: string }) {
  const health = useHealth();
  const state = health.isPending ? 'checking' : health.isError ? 'offline' : 'online';
  const label = { checking: 'Checking API', offline: 'API offline', online: 'API online' }[state];
  const detail =
    state === 'offline'
      ? errorMessage(health.error)
      : state === 'online'
        ? `FastAPI is up${health.data?.database ? `, database ${health.data.database}` : ''}.`
        : 'Calling /api/health…';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => health.refetch()}
          className={cn(
            'inline-flex h-7 items-center gap-2 rounded-full border bg-surface px-2.5 text-xs font-medium text-ink-2 shadow-xs transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <span aria-hidden className="relative inline-flex size-2">
            {state === 'online' ? <span className="absolute inset-0 animate-ping-soft rounded-full bg-success" /> : null}
            <span
              className={cn(
                'relative size-2 rounded-full',
                state === 'online' && 'bg-success',
                state === 'offline' && 'bg-danger',
                state === 'checking' && 'bg-border-strong',
              )}
            />
          </span>
          <span className="hidden sm:inline">{label}</span>
          <span className="sr-only sm:hidden">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}
