import type { SourceDto } from '~/types/chat';

/**
 * The answer cites passages as [1], [2][3], numbered as in the prompt. While the answer streams (its sources
 * aren't known yet), and on answers saved before sources recorded their number, the markers are removed.
 */
export function stripCitations(text: string, streaming = false): string {
  const stripped = text.replace(/\s?(?:\[\d+\])+/g, '');
  // While streaming, a citation can arrive cut in two ("[1" now, "]" next): hide the unfinished end too
  return streaming ? stripped.replace(/\s?\[\d*$/, '') : stripped;
}

/** Href of the Markdown links `linkCitations` creates; the Markdown component renders them as buttons. */
export const CITATION_HREF = '#cite-';

/**
 * Which number to show for each [n] the answer's text uses: sources are listed in the order the answer first
 * cites them, so [3][1] reads as 1, 2 under the answer. Empty for answers saved before sources recorded `passage`.
 */
export function citationNumbers(sources: SourceDto[]): Map<number, number> {
  const numbers = new Map<number, number>();
  sources.forEach((source, i) => {
    if (source.passage != null) numbers.set(source.passage, i + 1);
  });
  return numbers;
}

/**
 * Turns the answer's [n] markers into Markdown links to the matching source (`[2](#cite-2)`), renumbered with
 * `citationNumbers`. Markers that point at no source are removed, like `stripCitations` does.
 */
export function linkCitations(text: string, numbers: Map<number, number>): string {
  return text.replace(/\s?(?:\[\d+\])+/g, (group) => {
    const shown = [...group.matchAll(/\[(\d+)\]/g)]
      .map((match) => numbers.get(Number(match[1])))
      .filter((n, i, all): n is number => n !== undefined && all.indexOf(n) === i);
    return shown.map((n) => `[${n}](${CITATION_HREF}${n})`).join('');
  });
}

/** The title (the first question, set by the API), or a neutral label while there is none. */
export const conversationLabel = (title: string | null) => title?.trim() || 'New conversation';
