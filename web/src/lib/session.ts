import type { QueryClient } from '@tanstack/react-query';
import { qk } from '~/lib/query-keys';

/** Drops every cached query except the session, so one user's projects never show up for the next. */
export function clearUserData(qc: QueryClient) {
  qc.removeQueries({ predicate: (query) => query.queryKey[0] !== qk.session[0] });
}
