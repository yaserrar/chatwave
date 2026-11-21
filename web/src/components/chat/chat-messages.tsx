import * as React from 'react';
import { DocumentText1, SearchZoomOut } from 'iconsax-react';
import { Logomark } from '~/components/layout/wordmark';
import { fileKind } from '~/components/shared/file-icon';
import { Markdown } from '~/components/shared/markdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { citationNumbers, linkCitations, stripCitations } from '~/lib/chat';
import { formatDateTime } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { MessageDto, SourceDto } from '~/types/chat';
import { ConfidenceBadge } from './confidence-badge';

/** Opens the source viewer on `sources[index]` (the viewer can then move between them). */
export type OpenSource = (sources: SourceDto[], index: number) => void;

/** The question, right-aligned in a neutral bubble. Optimistic (not yet saved) questions are slightly faded. */
export function UserMessage({ message }: { message: MessageDto }) {
  const pending = message.id.startsWith('optimistic-');
  return (
    <div className="flex justify-end">
      <div
        title={pending ? 'Sending…' : formatDateTime(message.created_at)}
        className={cn(
          'max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground shadow-xs',
          pending && 'opacity-80',
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

/**
 * The answer: Markdown with clickable citations, its confidence, then the passages it used.
 * `streaming`: Claude is still writing it, so a caret follows the text and the rest comes at the end.
 * An answer the documents don't support (`not_found`) gets its own design, with the closest passages.
 */
export function AssistantMessage({
  message,
  streaming = false,
  onOpenSource,
}: {
  message: MessageDto;
  streaming?: boolean;
  onOpenSource: OpenSource;
}) {
  const sources = React.useMemo(() => message.sources ?? [], [message.sources]);
  const numbers = React.useMemo(() => citationNumbers(sources), [sources]);
  const renderCitation = React.useCallback(
    (n: number) => {
      const source = sources[n - 1];
      return source ? <CitationButton n={n} source={source} onOpen={() => onOpenSource(sources, n - 1)} /> : null;
    },
    [sources, onOpenSource],
  );

  if (message.not_found) return <NotFoundMessage message={message} onOpenSource={onOpenSource} />;

  // Answers saved before sources recorded their [n] can't link their markers: they are removed instead
  const linked = !streaming && numbers.size > 0;
  return (
    <div className="flex gap-3" aria-busy={streaming}>
      <Logomark className="mt-0.5 size-7" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Markdown renderCitation={linked ? renderCitation : undefined}>
          {linked ? linkCitations(message.content, numbers) : stripCitations(message.content, streaming)}
        </Markdown>
        {streaming ? <span aria-hidden className="-mt-1.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-brand" /> : null}
        {!streaming && (sources.length > 0 || message.confidence) ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex min-h-5.5 items-center justify-between gap-3">
              {sources.length > 0 ? <span className="text-eyebrow">Sources</span> : <span />}
              {message.confidence ? <ConfidenceBadge confidence={message.confidence} /> : null}
            </div>
            {sources.length > 0 ? <SourceList sources={sources} numbered={linked} onOpenSource={onOpenSource} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** "Not found in your documents": the documents don't answer the question, so nothing is made up. */
function NotFoundMessage({ message, onOpenSource }: { message: MessageDto; onOpenSource: OpenSource }) {
  const sources = message.sources ?? [];
  return (
    <div className="flex gap-3" data-not-found>
      <Logomark className="mt-0.5 size-7" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-dashed border-border-strong bg-subtle/60 p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-warning shadow-xs">
            <SearchZoomOut aria-hidden className="size-[18px]" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-display text-[15px] leading-snug font-medium tracking-tight">Not found in your documents</p>
            <Markdown className="text-ink-2">{stripCitations(message.content)}</Markdown>
          </div>
        </div>
        {sources.length > 0 ? (
          <div className="flex flex-col gap-1.5 border-t border-dashed pt-3">
            <span className="text-eyebrow">Closest passages, not a match</span>
            <SourceList sources={sources} numbered={false} onOpenSource={onOpenSource} />
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">Try other words, or add a document that covers this.</p>
      </div>
    </div>
  );
}

/** A citation marker inside the answer: its number, opening the cited passage. */
function CitationButton({ n, source, onOpen }: { n: number; source: SourceDto; onOpen: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Source ${n}: ${source.filename}, page ${source.page_number}`}
          className="mx-px inline-flex h-4.5 min-w-4.5 translate-y-[-0.1em] items-center justify-center rounded-sm bg-brand-subtle px-1 align-middle font-mono text-[10.5px] leading-none font-semibold text-brand-ink tabular-nums transition-colors outline-none hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-ring dark:hover:text-background"
        >
          {n}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {source.filename} · p. {source.page_number}
      </TooltipContent>
    </Tooltip>
  );
}

function SourceList({
  sources,
  numbered,
  onOpenSource,
}: {
  sources: SourceDto[];
  /** Show each source's number, matching the markers in the text. */
  numbered: boolean;
  onOpenSource: OpenSource;
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {sources.map((source, i) => (
        <li key={`${source.document_id}-${source.chunk_id ?? source.page_number}`} className="min-w-0">
          <button
            type="button"
            title={source.filename}
            onClick={() => onOpenSource(sources, i)}
            aria-label={`Open ${source.filename}, page ${source.page_number}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-surface px-2 py-1 text-xs text-ink-2 shadow-xs transition-colors outline-none hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:max-w-72"
          >
            {numbered ? (
              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-sm bg-brand-subtle px-0.5 font-mono text-[10px] font-semibold text-brand-ink">
                {i + 1}
              </span>
            ) : null}
            <DocumentText1 aria-hidden className={cn('size-3.5 shrink-0', fileKind(source.filename).className, 'bg-transparent')} />
            <span className="truncate">{source.filename}</span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">p. {source.page_number}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** While the API searches the documents, until the first words of the answer arrive. */
export function ThinkingMessage() {
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <Logomark className="mt-0.5 size-7" />
      <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
        <span aria-hidden className="inline-flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span key={delay} className="size-1.5 animate-pulse rounded-full bg-brand" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </span>
        Searching the documents…
      </div>
    </div>
  );
}
