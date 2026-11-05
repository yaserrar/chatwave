import * as React from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { Toaster } from '~/components/ui/sonner';
import { TooltipProvider } from '~/components/ui/tooltip';
import { ThemeProvider } from './theme-provider';

/** App-wide providers, mounted once in main.tsx around the router. */
export function Providers({ queryClient, children }: { queryClient: QueryClient; children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          {/* In dev, lifted above the devtools buttons. */}
          <Toaster position="bottom-right" closeButton offset={import.meta.env.DEV ? { bottom: 72, right: 24 } : undefined} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
