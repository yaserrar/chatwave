import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '~/components/layout/app-shell';
import { RouteError } from '~/components/shared/route-error';
import { sessionQuery } from '~/hooks/auth';

/** Everything inside the app (sidebar + top bar) needs a session: without one, go to the landing page. */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(sessionQuery());
    if (!user) throw redirect({ to: '/' });
    return { user };
  },
  component: AppLayout,
  // The session check itself failed (API down): no shell yet, so show the error on its own.
  errorComponent: (props) => (
    <div className="flex min-h-svh flex-col">
      <RouteError {...props} />
    </div>
  ),
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
