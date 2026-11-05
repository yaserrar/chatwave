import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { clearUserData } from '~/lib/session';
import { qk } from '~/lib/query-keys';
import { ApiError } from '~/services/api/client';
import { authApi } from '~/services/api/auth';

/** The current user, or `null` when nobody is signed in (a 401 is an answer here, not an error). */
export const sessionQuery = () =>
  queryOptions({
    queryKey: qk.session,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });

export const useSession = () => useQuery(sessionQuery());

/** "Continue as guest": the API creates an anonymous user and sets the session cookie. */
export function useStartGuestSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.startAnonymous,
    onSuccess: (user) => {
      clearUserData(qc);
      qc.setQueryData(qk.session, user);
    },
  });
}

/** Ends the session, goes back to the landing page, then forgets everything that belonged to the user. */
export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch (error) {
        // Already signed out (expired cookie): same outcome.
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
      qc.setQueryData(qk.session, null);
      await navigate({ to: '/' });
      clearUserData(qc);
    },
  });
}
