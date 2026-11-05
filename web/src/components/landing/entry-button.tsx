import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'iconsax-react';
import { Button } from '~/components/ui/button';
import { useSession, useStartGuestSession } from '~/hooks/auth';

/** The one action of the page: continue as a guest, or open the dashboard if a session already exists. */
export function EntryButton({ size = 'lg', variant = 'default' }: { size?: 'lg' | 'sm'; variant?: 'default' | 'outline' }) {
  const session = useSession();
  const startGuest = useStartGuestSession();
  const navigate = useNavigate();

  if (session.data) {
    return (
      <Button asChild size={size} variant={variant}>
        <Link to="/dashboard">
          Open dashboard
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      disabled={startGuest.isPending}
      onClick={() => startGuest.mutate(undefined, { onSuccess: () => navigate({ to: '/dashboard' }) })}
    >
      {startGuest.isPending ? 'Starting…' : 'Continue as guest'}
      {startGuest.isPending ? null : <ArrowRight aria-hidden />}
    </Button>
  );
}
