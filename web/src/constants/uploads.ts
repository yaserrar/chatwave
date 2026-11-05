/**
 * Upload rules from docs/askwave-spec.md. Keep them in sync with the API settings
 * (`allowed_extensions`, `max_file_size_mb`): the API is the real gate, this only saves a round trip.
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.md', '.txt'] as const;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** For `<input type="file" accept>`; markdown has no reliable MIME type, so extensions only. */
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.join(',');

export const ALLOWED_LABEL = 'PDF, Markdown or text';

/**
 * The API's limits (MAX_DOCUMENTS_PER_PROJECT, MAX_PROJECTS_PER_USER in api/.env, defaults shown). Checked here
 * too so the user learns it before uploading; the API still enforces them (409).
 */
export const MAX_DOCUMENTS_PER_PROJECT = 10;
export const MAX_PROJECTS_PER_USER = 5;

/** How often the documents list refreshes while a document is pending or processing. */
export const STATUS_POLL_MS = 4000;
