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
