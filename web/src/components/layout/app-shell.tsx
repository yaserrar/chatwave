import * as React from 'react';
import { useRouterState } from '@tanstack/react-router';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '~/components/ui/sheet';
import { AppTopbar } from './app-topbar';
import { SidebarContent } from './app-sidebar';

/**
 * App chrome: 240px sidebar (a sheet under 1024px), top bar, and the content in a framed column
 * (hairline side rails). `main` scrolls; full-height pages (the project workspace) use `h-full`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [navOpen, setNavOpen] = React.useState(false);
  const [lastPath, setLastPath] = React.useState(pathname);

  // Close the mobile sheet on navigation.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setNavOpen(false);
  }

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only z-[100] rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside
        aria-label="Sidebar"
        className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block"
      >
        <SidebarContent />
      </aside>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="w-72 gap-0 bg-sidebar p-0 text-sidebar-foreground"
          showCloseButton={false}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Projects and settings</SheetDescription>
          <SidebarContent onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onOpenNav={() => setNavOpen(true)} />
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col bg-surface xl:frame-rails">{children}</div>
        </main>
      </div>
    </div>
  );
}
