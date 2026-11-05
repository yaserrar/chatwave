/**
 * The answer cites passages as [1], [2][3]. Those numbers point at the prompt's passages, not at the
 * sources list shown under the answer, so they are removed from the displayed text.
 */
export function stripCitations(text: string, streaming = false): string {
  const stripped = text.replace(/\s?(?:\[\d+\])+/g, '');
  // While streaming, a citation can arrive cut in two ("[1" now, "]" next): hide the unfinished end too
  return streaming ? stripped.replace(/\s?\[\d*$/, '') : stripped;
}

/** The title (the first question, set by the API), or a neutral label while there is none. */
export const conversationLabel = (title: string | null) => title?.trim() || 'New conversation';
