import { InfoCircle, MagicStar, Send2 } from 'iconsax-react';
import { Logomark } from '~/components/layout/wordmark';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useDocuments } from '~/hooks/documents';
import { plural } from '~/lib/format';
import { cn } from '~/lib/utils';

const EXAMPLES = [
  'What is the maintenance interval for the main pump?',
  'Summarise the warranty terms in the supplier contract.',
  'Which safety steps come before a filter change?',
];

/**
 * Where conversations will live. The API has no conversation or ask endpoints yet (milestones 5–6),
 * so the composer is shown but disabled, with an honest note. When `POST /conversations/{id}/ask`
 * exists, this becomes the message list + streaming answer with sources.
 */
export function ChatPanel({ projectId }: { projectId: string }) {
  const documents = useDocuments(projectId);
  const ready = documents.data?.filter((d) => d.status === 'ready').length ?? 0;
  const total = documents.data?.length ?? 0;

  const readiness = !documents.isSuccess
    ? 'Checking documents…'
    : total === 0
      ? 'Add a document to give this project something to answer from.'
      : ready === 0
        ? `${plural(total, 'document')} waiting to be processed. Answers can only use ready documents.`
        : `${plural(ready, 'document')} ready to answer from.`;

  return (
    <section
      aria-labelledby="chat-title"
      className="relative isolate flex min-h-128 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs lg:min-h-0"
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 id="chat-title" className="text-h3 text-foreground">
            Chat
          </h2>
          <span className="inline-flex h-5.5 items-center gap-1 rounded-full bg-brand-subtle px-2 text-xs font-medium text-brand-ink">
            <MagicStar aria-hidden className="size-3" />
            Cited answers
          </span>
        </div>
        <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">Only this project’s documents</span>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid mask-fade-edges opacity-70" />
        {/* A soft brand glow: a radial gradient, not a blur filter (cheaper to paint). */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 left-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,var(--highlight)_0%,transparent_65%)] opacity-70"
        />

        <Logomark className="size-11" />
        <div className="flex max-w-md flex-col gap-2">
          <p className="text-display text-[1.75rem] text-foreground">Ask your documents</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Answers stream in word by word and list the document and page they come from.
          </p>
        </div>

        <ul className="flex w-full max-w-md flex-col gap-2" aria-label="Example questions">
          {EXAMPLES.map((q) => (
            <li key={q}>
              <span className="flex w-full items-center gap-2.5 rounded-lg border bg-surface px-3 py-2 text-left text-[13px] text-ink-2 shadow-xs">
                <span aria-hidden className="text-brand">↳</span>
                {q}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="flex flex-col gap-2 border-t bg-surface/60 p-3">
        <div
          className={cn(
            'flex items-end gap-2 rounded-xl border bg-card p-2 shadow-xs',
            'opacity-70',
          )}
        >
          <label htmlFor="chat-input" className="sr-only">
            Ask a question
          </label>
          <textarea
            id="chat-input"
            rows={1}
            disabled
            placeholder="Ask a question about these documents…"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Button size="icon-sm" disabled aria-label="Send">
                  <Send2 aria-hidden />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">Chat turns on with the ask endpoint</TooltipContent>
          </Tooltip>
        </div>
        <p className="flex items-start gap-1.5 px-1 text-xs text-muted-foreground">
          <InfoCircle aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>
            Coming with the API’s conversations and <code className="text-[11px]">/ask</code> endpoint. {readiness}
          </span>
        </p>
      </footer>
    </section>
  );
}
