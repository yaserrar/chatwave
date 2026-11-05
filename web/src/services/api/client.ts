import type { FastApiErrorBody } from '~/types/api';

/**
 * Fetch wrapper for the FastAPI app. The browser only calls its own origin: Vite proxies `/api` to the API
 * (vite.config.ts), so there is no CORS in development. Components never call this directly:
 * component → hook → service → client.
 */
export type ApiIssue = { path: (string | number)[]; message: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  query?: Query;
  /** A plain object is sent as JSON; FormData as multipart (the browser sets the boundary). */
  body?: unknown;
  signal?: AbortSignal;
};

const UNREACHABLE = 'Chatwave could not reach the API. Check that the FastAPI server is running.';

function buildPath(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return `/api${path}${search ? `?${search}` : ''}`;
}

/** FastAPI 422 → issues on fields. `loc` starts with where the value came from ("body", "path", "query"). */
function toApiError(status: number, body: FastApiErrorBody | null, fallback: string): ApiError {
  const detail = body?.detail;
  if (typeof detail === 'string') return new ApiError(status, detail);
  if (Array.isArray(detail) && detail.length > 0) {
    const issues = detail.map((d) => ({ path: d.loc.slice(1), message: d.msg }));
    return new ApiError(status, issues[0]!.message, issues);
  }
  return new ApiError(status, fallback);
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(buildPath(path, options.query), {
      method,
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, UNREACHABLE);
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload: unknown = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    // A 5xx without JSON comes from the Vite proxy: the API itself is not answering.
    const fallback =
      res.status >= 500 ? (isJson ? 'Something went wrong on the server. Try again.' : UNREACHABLE) : res.statusText || 'Request failed';
    throw toApiError(res.status, payload as FastApiErrorBody | null, fallback);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body: body ?? {} }),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, { body: form }),
};

/** The API's message for an error, or a calm fallback. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (error instanceof ApiError || error instanceof Error) return error.message || fallback;
  return fallback;
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;
