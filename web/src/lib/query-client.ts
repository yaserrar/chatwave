import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, errorMessage } from '~/services/api/client';

declare module '@tanstack/react-query' {
  interface Register {
    /** `silent`: the mutation shows its own error (inline form message) instead of the default toast. */
    mutationMeta: { silent?: boolean };
  }
}

export type MutationOptions = { silent?: boolean };

export const createQueryClient = () =>
  new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return;
        toast.error(errorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        // A 4xx will not fix itself (404, 422): fail fast. Network and 5xx errors get two retries.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
