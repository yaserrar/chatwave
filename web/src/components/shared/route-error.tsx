import type { ErrorComponentProps } from '@tanstack/react-router';
import { Danger } from 'iconsax-react';
import { Button } from '~/components/ui/button';
import { errorMessage } from '~/services/api/client';
import { EmptyState } from './empty-state';

/** A page crashed while rendering. Shown inside the shell, so navigation still works. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={Danger}
        size="lg"
        variant="plain"
        title="Something broke on this page"
        description={errorMessage(error)}
        action={
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
