import * as React from 'react';
import { Folder2, MagicStar, Send2 } from 'iconsax-react';
import { Logomark } from '~/components/layout/wordmark';
import { DocStatusBadge } from '~/components/shared/doc-status';
import { FileIcon } from '~/components/shared/file-icon';
import { cn } from '~/lib/utils';

/**
 * The hero's product preview: a mock of the real app window that plays the whole flow on a loop.
 * The question is typed, the project's documents are searched (the cited ones light up), the answer
 * appears word by word with its citations, then the source chips. Static (final frame) with reduced motion.
 */

const DOCS = [
  { name: 'pump-manual.pdf', meta: '2.1 MB · 38 pages' },
  { name: 'maintenance-guide.md', meta: '24 KB · 1 page' },
  { name: 'warranty-contract.pdf', meta: '640 KB · 12 pages' },
];

const QUESTION = 'How often must the pump filters be replaced? Is that covered by the warranty?';

// The answer as segments, so citations can be styled while the text is revealed character by character.
const ANSWER: { text: string; cite?: number }[] = [
  { text: 'Replace the filters every ' },
  { text: '500 operating hours' },
  { text: '.', cite: 1 },
  { text: ' Filters are wear parts, so they are ' },
  { text: 'not covered' },
  { text: ' by the 24-month warranty.', cite: 2 },
];
const BOLD = new Set([1, 4]);
const ANSWER_LENGTH = ANSWER.reduce((n, s) => n + s.text.length, 0);

const SOURCES = [
  { n: 1, doc: 1, label: 'maintenance-guide.md', page: 'p. 1' },
  { n: 2, doc: 2, label: 'warranty-contract.pdf', page: 'p. 4' },
];

// Timeline, in milliseconds from the start of a loop.
const T = {
  typeQuestion: [300, 2000],
  send: 2200,
  search: [2400, 3900],
  answer: [3900, 6900],
  sources: 7100,
  loop: 12500,
} as const;
const FINAL = 12000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Milliseconds since the loop started (0 → T.loop, then again). Frozen on the final frame with reduced motion. */
function useLoopClock() {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const id = window.setInterval(() => setT((performance.now() - start) % T.loop), 40);
    return () => window.clearInterval(id);
  }, [reduced]);
  return reduced ? FINAL : t;
}

const progress = (t: number, [from, to]: readonly [number, number]) => Math.min(1, Math.max(0, (t - from) / (to - from)));

export function HeroDemo() {
  const t = useLoopClock();

  const typed = QUESTION.slice(0, Math.round(progress(t, T.typeQuestion) * QUESTION.length));
  const sent = t >= T.send;
  const searching = t >= T.search[0] && t < T.search[1];
  const answered = t >= T.answer[0];
  const shownChars = Math.round(progress(t, T.answer) * ANSWER_LENGTH);
  const showSources = t >= T.sources;
  // The cited documents light up during the search and stay marked once the answer cites them.
  const litDocs = t >= T.search[0] + 700 ? new Set(SOURCES.map((s) => s.doc)) : new Set<number>();

  return (
    <div aria-hidden className="overflow-hidden rounded-2xl border bg-card shadow-float">
      {/* Window chrome */}
      <div className="flex h-10 items-center gap-3 border-b bg-subtle px-4">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </div>
        <div className="mx-auto flex h-6 max-w-xs flex-1 items-center justify-center rounded-md border bg-surface px-3 font-mono text-[11px] text-muted-foreground">
          chatwave · Supplier A
        </div>
        <div className="w-10" />
      </div>

      <div className="grid h-[25rem] text-left sm:h-[27rem] md:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Documents column */}
        <div className="hidden flex-col gap-3 border-r bg-surface p-4 md:flex">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-tile-amber-subtle text-tile-amber-ink">
              <Folder2 className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">Supplier A</p>
              <p className="font-mono text-[10.5px] text-muted-foreground">3 documents · 3 ready</p>
            </div>
          </div>
          <ul className="flex flex-col gap-1">
            {DOCS.map((doc, i) => {
              const lit = litDocs.has(i);
              return (
                <li
                  key={doc.name}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 transition-all duration-500',
                    lit && 'border-brand/30 bg-brand-subtle/70',
                    searching && !lit && 'opacity-60',
                  )}
                >
                  <FileIcon filename={doc.name} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-medium text-foreground">{doc.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{doc.meta}</span>
                  </span>
                  <DocStatusBadge status="ready" className="h-5 px-1.5 text-[10px]" />
                </li>
              );
            })}
          </ul>
          <div className="mt-auto rounded-lg border border-dashed border-border-strong/80 px-3 py-2.5 text-center text-[11px] text-muted-foreground">
            Drop PDF, Markdown or text
          </div>
        </div>

        {/* Chat column */}
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <span className="truncate text-[12.5px] font-medium text-foreground">{sent ? 'Filter replacement' : 'New conversation'}</span>
            <span className="inline-flex h-5 items-center gap-1 rounded-full bg-brand-subtle px-2 text-[10.5px] font-medium text-brand-ink">
              <MagicStar className="size-3" />
              Cited answers
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-5">
            {!sent ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <Logomark className="size-9" />
                <p className="font-display text-lg font-medium tracking-tight text-foreground">Ask your documents</p>
                <p className="max-w-xs text-[12.5px] text-muted-foreground">Answers come only from these 3 files, with the page they used.</p>
              </div>
            ) : null}
            {sent ? (
              <div className="flex animate-fade-up justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13px] leading-relaxed text-primary-foreground">
                  {QUESTION}
                </p>
              </div>
            ) : null}

            {searching ? (
              <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
                <Logomark className="size-6" />
                <span className="inline-flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="size-1.5 animate-pulse rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
                Searching 3 documents…
              </div>
            ) : null}

            {answered ? (
              <div className="flex gap-2.5">
                <Logomark className="mt-0.5 size-6" />
                <div className="flex min-w-0 flex-col gap-2.5">
                  <p className="text-[13px] leading-relaxed text-foreground">
                    <TypedAnswer chars={shownChars} />
                    {shownChars < ANSWER_LENGTH ? <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-brand align-middle" /> : null}
                  </p>
                  {showSources ? (
                    <div className="flex animate-fade-up flex-col gap-1.5">
                      <span className="text-eyebrow text-[10px]">Sources</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SOURCES.map((s) => (
                          <span key={s.n} className="inline-flex items-center gap-1.5 rounded-md border bg-surface px-2 py-1 text-[11px] text-ink-2 shadow-xs">
                            <span className="font-mono font-semibold text-brand-ink">[{s.n}]</span>
                            {s.label}
                            <span className="font-mono text-[10px] text-muted-foreground">{s.page}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* Composer: the question is typed here first */}
          <div className="border-t bg-surface/60 p-3">
            <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-xs">
              <span className={cn('min-h-5 flex-1 truncate text-[13px]', typed && !sent ? 'text-foreground' : 'text-muted-foreground')}>
                {!sent && typed ? (
                  <>
                    {typed}
                    <span className="ml-px inline-block h-3.5 w-px animate-pulse bg-foreground align-middle" />
                  </>
                ) : (
                  'Ask a question about these documents…'
                )}
              </span>
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
                  typed && !sent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <Send2 className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The answer revealed up to `chars` characters, keeping bold parts and citation markers. */
function TypedAnswer({ chars }: { chars: number }) {
  let left = chars;
  return (
    <>
      {ANSWER.map((segment, i) => {
        if (left <= 0) return null;
        const text = segment.text.slice(0, left);
        const complete = left >= segment.text.length;
        left -= segment.text.length;
        return (
          <React.Fragment key={i}>
            {BOLD.has(i) ? <strong className="font-semibold">{text}</strong> : text}
            {segment.cite && complete ? (
              <sup className="ml-0.5 font-mono text-[10px] font-semibold text-brand-ink">[{segment.cite}]</sup>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
}
