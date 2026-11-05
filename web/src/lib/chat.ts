/**
 * The answer cites passages as [1], [2][3]. Those numbers point at the prompt's passages, not at the
 * sources list shown under the answer, so they are removed from the displayed text.
 */
export function stripCitations(text: string): string {
  return text.replace(/\s?(?:\[\d+\])+/g, '');
}

/** The title (the first question, set by the API), or a neutral label while there is none. */
export const conversationLabel = (title: string | null) => title?.trim() || 'New conversation';
