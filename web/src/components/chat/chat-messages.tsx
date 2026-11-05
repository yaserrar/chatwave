import { DocumentText1 } from 'iconsax-react';
import { Logomark } from '~/components/layout/wordmark';
import { fileKind } from '~/components/shared/file-icon';
import { stripCitations } from '~/lib/chat';
import { formatDateTime } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { MessageDto, SourceDto } from '~/types/chat';
import { Markdown } from '~/components/shared/markdown';

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
 * The answer: Markdown, then the documents and pages it used.
 * `streaming`: Claude is still writing it, so a caret follows the text and the sources come at the end.
 */
export function AssistantMessage({ message, streaming = false }: { message: MessageDto; streaming?: boolean }) {
  const sources = message.sources ?? [];
  return (
    <div className="flex gap-3" aria-busy={streaming}>
      <Logomark className="mt-0.5 size-7" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <Markdown>{stripCitations(message.content, streaming)}</Markdown>
        {streaming ? <span aria-hidden className="-mt-1.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-brand" /> : null}
        {sources.length > 0 ? <SourceList sources={sources} /> : null}
      </div>
    </div>
  );
}

function SourceList({ sources }: { sources: SourceDto[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-eyebrow">Sources</span>
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <li key={`${source.document_id}-${source.page_number}`}>
            <span
              title={source.filename}
              className="inline-flex max-w-64 items-center gap-1.5 rounded-md border bg-surface px-2 py-1 text-xs text-ink-2 shadow-xs"
            >
              <DocumentText1 aria-hidden className={cn('size-3.5 shrink-0', fileKind(source.filename).className, 'bg-transparent')} />
              <span className="truncate">{source.filename}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">p. {source.page_number}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
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
