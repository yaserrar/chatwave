import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ArrowLeft, SearchNormal1 } from 'iconsax-react';
import { AppShell } from '~/components/layout/app-shell';
import { EmptyState } from '~/components/shared/empty-state';
import { RouteError } from '~/components/shared/route-error';
import { Button } from '~/components/ui/button';

export type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
  // Child routes use the router's defaultErrorComponent (inside the shell); this one is for the root itself.
  errorComponent: (props) => (
    <AppShell>
      <RouteError {...props} />
    </AppShell>
  ),
});

function RootLayout() {
  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      {/* Dev only, bottom-right so they never cover the sidebar. Toasts sit above them (providers.tsx). */}
      {import.meta.env.DEV ? (
        <>
          <ReactQueryDevtools buttonPosition="bottom-right" />
          <TanStackRouterDevtools position="bottom-right" toggleButtonProps={{ style: { marginRight: 52 } }} />
        </>
      ) : null}
    </>
  );
}

function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={SearchNormal1}
        size="lg"
        variant="plain"
        title="This page does not exist"
        description="The link may be old, or the address has a typo."
        action={
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft aria-hidden />
              All projects
            </Link>
          </Button>
        }
      />
    </div>
  );
}
