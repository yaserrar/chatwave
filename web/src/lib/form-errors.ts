import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, errorMessage } from '~/services/api/client';

/**
 * Puts FastAPI's validation issues (422) on the matching form fields and returns the message to show above
 * the form, or null when every issue landed on a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (error instanceof ApiError && error.issues.length) {
    const unplaced = error.issues.filter((issue) => {
      const name = issue.path.join('.') as Path<T>;
      if (!fields.includes(name)) return true;
      setError(name, { type: 'server', message: issue.message }, { shouldFocus: true });
      return false;
    });
    return unplaced.length ? (unplaced[0]?.message ?? error.message) : null;
  }
  return errorMessage(error);
}
