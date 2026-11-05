import * as React from 'react';
import { Logout } from 'iconsax-react';
import { ConfirmDialog } from '~/components/shared/confirm-dialog';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useSession, useSignOut } from '~/hooks/auth';

/** Who is signed in, with sign out. Every user is a guest for now, so signing out is confirmed first. */
export function UserMenu() {
  const session = useSession();
  const signOut = useSignOut();
  const [confirming, setConfirming] = React.useState(false);

  const user = session.data;
  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-2.5 border-t border-sidebar-border px-2.5 py-2.5 pl-4.5">
        <span
          aria-hidden
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-ink"
        >
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-4 font-medium text-sidebar-foreground">{user.name}</p>
          <p className="truncate text-xs leading-4 text-muted-foreground">Guest session</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Sign out" onClick={() => setConfirming(true)}>
              <Logout aria-hidden className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        destructive
        title="Sign out?"
        description="You are using a guest session. Once you sign out there is no way back in: your projects, documents and conversations become unreachable."
        confirmLabel="Sign out"
        onConfirm={() => signOut.mutateAsync()}
      />
    </>
  );
}
