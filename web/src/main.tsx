import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import "@fontsource-variable/inter";
import "@fontsource-variable/geist-mono";
import "~/styles/globals.css";
import { Providers } from "~/components/layout/providers";
import { RouteError } from "~/components/shared/route-error";
import { toast } from "sonner";
import { createQueryClient } from "~/lib/query-client";
import { qk } from "~/lib/query-keys";
import { clearUserData } from "~/lib/session";
import { routeTree } from "./routeTree.gen";

const queryClient = createQueryClient({
  onUnauthorized: () => {
    // Several requests can fail at once: only the first one ends the session.
    if (queryClient.getQueryData(qk.session) === null) return;
    queryClient.setQueryData(qk.session, null);
    toast.info("Your guest session ended. Continue as a guest to start again.");
    void router.navigate({ to: "/" }).then(() => clearUserData(queryClient));
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultErrorComponent: RouteError,
  defaultPreload: "intent",
  // React Query owns caching; the router always re-runs loaders (they only prefetch).
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
