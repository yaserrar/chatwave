export const DOCUMENT_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** What the API returns for a document (`DocumentRead` in api/app/schemas/document.py). */
export type DocumentDto = {
  id: string;
  project_id: string;
  filename: string;
  mime_type: string;
  size: number;
  status: DocumentStatus;
  error_message: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
};

/**
 * A short-lived presigned S3 link to the file (GET …/documents/{id}/url). `download: true` makes S3 send it as
 * an attachment with the original filename; otherwise it is served inline for the preview.
 */
export type DocumentUrlDto = {
  url: string;
  expires_in: number; // seconds
};

/** A file the user dropped, while its upload request is in flight (never stored by the API). */
export type UploadingFile = {
  key: string;
  name: string;
  size: number;
};
