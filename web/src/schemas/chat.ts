import { z } from 'zod';

/** Mirrors `AskRequest` in api/app/schemas/conversation.py. */
export const QUESTION_MAX_LENGTH = 4000;

export const askSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Type a question.')
    .max(QUESTION_MAX_LENGTH, `Keep the question under ${QUESTION_MAX_LENGTH} characters.`),
});

export type AskValues = z.output<typeof askSchema>;
