import { Refresh, Warning2 } from 'iconsax-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { errorMessage } from '~/services/api/client';

/** A failed load: what went wrong, in the API's words, and a retry. */
export function ErrorState({
  title = 'This could not be loaded',
  error,
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-strong/80 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-lg border bg-card text-danger shadow-xs">
        <Warning2 aria-hidden className="size-5" />
      </div>
      <div className="flex max-w-sm flex-col gap-1.5">
        <p className="font-display text-base font-medium tracking-tight">{title}</p>
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
          <Refresh aria-hidden className={cn(retrying && 'animate-spin')} />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
