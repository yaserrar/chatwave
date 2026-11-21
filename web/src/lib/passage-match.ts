/**
 * Finds a cited passage inside a page's text, tolerant of how differently the same words come out of a PDF
 * text layer, a Markdown render or the API's extraction: case, accents, ligatures, whitespace, line-break
 * hyphens and Markdown syntax are all ignored. Only letters and digits are compared.
 */

export type TextSpan = { start: number; end: number };

/** Letters and digits only, lowercase, without accents; `map[i]` is where folded character i came from. */
type Folded = { text: string; map: number[] };

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const MARKS = /\p{M}/gu;

function fold(source: string): Folded {
  let text = '';
  const map: number[] = [];
  let index = 0;
  for (const char of source) {
    // NFKD splits accents off ("é" → "e" + accent) and ligatures apart ("ﬁ" → "fi")
    for (const c of char.normalize('NFKD').replace(MARKS, '').toLowerCase()) {
      if (LETTER_OR_DIGIT.test(c)) {
        text += c;
        map.push(index);
      }
    }
    index += char.length; // UTF-16 units, like DOM offsets
  }
  return { text, map };
}

function occurrences(haystack: string, needle: string): number[] {
  const found: number[] = [];
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) found.push(at);
  return found;
}

function closest(positions: number[], target: number): number | undefined {
  return positions.reduce<number | undefined>(
    (best, p) => (best === undefined || Math.abs(p - target) < Math.abs(best - target) ? p : best),
    undefined,
  );
}

// Anchors: when the whole passage doesn't match (a word extracted differently, a table, a link's URL), its
// beginning and its end are looked for separately, from a few positions in case the very first words differ.
const ANCHOR_LENGTH = 48;
const ANCHOR_OFFSETS = [0, 24, 64, 128, 256];

/**
 * Where `passage` is in `text`, as offsets into `text`, or null if it can't be found.
 *
 * `hint` (0 to 1) is roughly where the passage should be, e.g. its known start divided by the file length:
 * when a passage appears several times, the occurrence nearest the hint wins.
 */
export function findPassage(text: string, passage: string, hint?: number): TextSpan | null {
  const hay = fold(text);
  const needle = fold(passage).text;
  if (!needle || !hay.text) return null;
  const target = hint === undefined ? 0 : Math.round(hint * hay.text.length);
  const toSpan = (start: number, end: number): TextSpan => ({ start: hay.map[start]!, end: hay.map[end - 1]! + 1 });

  const exact = closest(occurrences(hay.text, needle), target);
  if (exact !== undefined) return toSpan(exact, exact + needle.length);

  const anchor = Math.min(ANCHOR_LENGTH, Math.floor(needle.length / 3));
  if (anchor < 12) return null; // too short to be told apart from a chance match

  let start: number | undefined;
  for (const offset of ANCHOR_OFFSETS) {
    if (offset + anchor > needle.length) break;
    const at = closest(occurrences(hay.text, needle.slice(offset, offset + anchor)), target + offset);
    if (at !== undefined) {
      start = Math.max(0, at - offset);
      break;
    }
  }

  let end: number | undefined;
  for (const offset of ANCHOR_OFFSETS) {
    if (offset + anchor > needle.length) break;
    const from = needle.length - offset - anchor;
    const positions = occurrences(hay.text, needle.slice(from, from + anchor)).filter((p) => start === undefined || p > start);
    const at = closest(positions, (start ?? target) + from);
    if (at !== undefined) {
      end = Math.min(hay.text.length, at + anchor + offset);
      break;
    }
  }

  // Both ends found, at a plausible distance: everything in between is the passage
  if (start !== undefined && end !== undefined && end - start <= needle.length * 1.5 + 64) return toSpan(start, end);
  if (start !== undefined) return toSpan(start, Math.min(hay.text.length, start + needle.length));
  if (end !== undefined) return toSpan(Math.max(0, end - needle.length), end);
  return null;
}
