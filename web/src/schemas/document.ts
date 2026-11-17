import { z } from 'zod';
import { ALLOWED_EXTENSIONS, ALLOWED_LABEL, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '~/constants/uploads';
import { extensionOf } from '~/lib/format';

/** Client-side check of a dropped file, before it is sent. The API validates again. */
export const uploadFileSchema = z
  .instanceof(File)
  .refine((file) => (ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name)), {
    message: `Only ${ALLOWED_LABEL} files can be added.`,
  })
  .refine((file) => file.size > 0, { message: 'This file is empty.' })
  .refine((file) => file.size <= MAX_FILE_SIZE_BYTES, { message: `Files can be up to ${MAX_FILE_SIZE_MB} MB.` });

/** Mirrors `DocumentFromUrl` in api/app/schemas/document.py. The API checks the link itself (safety, type, size). */
export const LINK_MAX_LENGTH = 2048;

export const importUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Paste a link to a file.')
    .max(LINK_MAX_LENGTH, 'This link is too long.')
    .refine((value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === 'https:' || protocol === 'http:';
      } catch {
        return false;
      }
    }, 'Use a full link that starts with https://'),
});

export type ImportUrlValues = z.output<typeof importUrlSchema>;

export type RejectedFile = { name: string; reason: string };

/** Splits a drop into the files to upload and the ones to explain. */
export function validateFiles(files: File[]): { accepted: File[]; rejected: RejectedFile[] } {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    const result = uploadFileSchema.safeParse(file);
    if (result.success) accepted.push(file);
    else rejected.push({ name: file.name, reason: result.error.issues[0]?.message ?? 'This file cannot be added.' });
  }
  return { accepted, rejected };
}
