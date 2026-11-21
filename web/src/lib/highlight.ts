import { findPassage } from '~/lib/passage-match';

/**
 * Highlights a passage in rendered text (a PDF page's text layer, a Markdown article) with the CSS Custom
 * Highlight API: the DOM React rendered is not touched, the browser paints the range (`::highlight(name)` in
 * globals.css). Where the API is missing, the range is still returned so the caller can scroll to it.
 */

/** The text nodes under `root` and where each one starts in their concatenated text. */
function textNodes(root: Node): { nodes: Text[]; starts: number[]; text: string } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  const starts: number[] = [];
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
    starts.push(text.length);
    text += (node as Text).data;
  }
  return { nodes, starts, text };
}

/** The node holding character `offset` of the concatenated text, and the offset inside it. */
function locate(nodes: Text[], starts: number[], offset: number, isEnd: boolean): [Text, number] {
  let i = nodes.length - 1;
  // An end offset belongs to the node it closes, not to the next one
  while (i > 0 && (isEnd ? starts[i]! >= offset : starts[i]! > offset)) i--;
  const node = nodes[i]!;
  return [node, Math.min(offset - starts[i]!, node.data.length)];
}

const supported = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

/**
 * Finds `passage` in the text under `root`, paints it with the highlight named `name` and returns its range,
 * or clears that highlight and returns null when the passage isn't there.
 */
export function highlightPassage(root: Node, passage: string, name: string, hint?: number): Range | null {
  const { nodes, starts, text } = textNodes(root);
  const span = nodes.length ? findPassage(text, passage, hint) : null;
  if (!span) {
    clearHighlight(name);
    return null;
  }
  const range = document.createRange();
  range.setStart(...locate(nodes, starts, span.start, false));
  range.setEnd(...locate(nodes, starts, span.end, true));
  if (supported()) CSS.highlights.set(name, new Highlight(range));
  return range;
}

export function clearHighlight(name: string) {
  if (supported()) CSS.highlights.delete(name);
}

/** Scrolls `container` so the range sits a third of the way down (not glued to the top edge). */
export function scrollRangeIntoView(container: HTMLElement, range: Range) {
  const behavior: ScrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const box = range.getBoundingClientRect();
  const frame = container.getBoundingClientRect();
  const top = container.scrollTop + box.top - frame.top - Math.max(24, (frame.height - box.height) / 3);
  container.scrollTo({ top: Math.max(0, top), behavior });
}
