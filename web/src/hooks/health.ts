import { useQuery } from '@tanstack/react-query';
import { qk } from '~/lib/query-keys';
import { healthApi } from '~/services/api/health';

/** GET /api/health every 30 s, for the API status pill in the top bar. */
export const useHealth = () =>
  useQuery({
    queryKey: qk.health,
    queryFn: healthApi.get,
    refetchInterval: 30_000,
    retry: false,
    staleTime: 10_000,
  });
