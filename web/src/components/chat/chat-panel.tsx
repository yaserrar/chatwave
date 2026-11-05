import * as React from 'react';
import { Add, MagicStar } from 'iconsax-react';
import { Logomark } from '~/components/layout/wordmark';
import { ErrorState } from '~/components/shared/error-state';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useAsk, useConversations, useCreateConversation, useMessages } from '~/hooks/conversations';
import { useDocuments } from '~/hooks/documents';
import { plural } from '~/lib/format';
import { AssistantMessage, ThinkingMessage, UserMessage } from './chat-messages';
import { ChatComposer, type ChatComposerHandle } from './chat-composer';
import { ConversationSwitcher } from './conversation-switcher';

const EXAMPLES = [
  'Summarise these documents in a few bullet points.',
  'What are the key numbers or deadlines mentioned?',
  'Which topics do these documents cover?',
];

/**
 * Chat with the project's documents: pick or start a conversation, ask, read cited answers.
 *
 * Which conversation is shown: `selected === undefined` means the user has not picked one yet, so the most
 * recent conversation is shown; `null` is an explicit new (draft) conversation, created on the first question.
 */
export function ChatPanel({ projectId }: { projectId: string }) {
  const conversations = useConversations(projectId);
  const documents = useDocuments(projectId);
  const createConversation = useCreateConversation(projectId);
  const ask = useAsk(projectId);
  const [selected, setSelected] = React.useState<string | null | undefined>(undefined);
  const composer = React.useRef<ChatComposerHandle>(null);

  const activeId = selected === undefined ? (conversations.data?.[0]?.id ?? null) : selected;
  const messages = useMessages(activeId);

  const docs = documents.data ?? [];
  const ready = docs.filter((d) => d.status === 'ready').length;
  const waitingOnAnswer = ask.isPending && ask.variables?.conversationId === activeId;

  async function send(question: string) {
    let conversationId = activeId;
    if (!conversationId) {
      const created = await createConversation.mutateAsync();
      conversationId = created.id;
      setSelected(created.id);
    }
    await ask.mutateAsync({ conversationId, question });
  }

  function startNew() {
    setSelected(null);
    composer.current?.focus();
  }

  // When a question is sent, show the bottom (question + "Searching…"). When an answer arrives, show its
  // start: answers are often longer than the panel, and jumping to their end would hide the beginning.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const messageCount = messages.data?.length ?? 0;
  const lastRole = messages.data?.at(-1)?.role;
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>('[data-message]');
    const last = items[items.length - 1];
    if (lastRole === 'assistant' && last && !waitingOnAnswer) {
      // offsetTop is relative to the scroll container (it is `relative`)
      el.scrollTo({ top: last.offsetTop - 16, behavior: 'smooth' });
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messageCount, waitingOnAnswer, activeId, lastRole]);

  const hint =
    !documents.isSuccess
      ? null
      : docs.length === 0
        ? 'Add a document first: answers only come from this project’s documents.'
        : ready === 0
          ? `${plural(docs.length, 'document')} still processing. Answers can only use ready documents.`
          : `Answers use only this project’s ${plural(ready, 'ready document')}.`;

  return (
    <section
      aria-labelledby="chat-title"
      className="relative isolate flex h-[70svh] min-h-112 flex-col overflow-hidden rounded-2xl border bg-card shadow-xs lg:sticky lg:top-6 lg:h-[calc(100svh-8.5rem)] lg:self-start"
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="chat-title" className="sr-only">
            Chat
          </h2>
          {conversations.isPending ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <ConversationSwitcher
              conversations={conversations.data ?? []}
              activeId={activeId}
              onSelect={setSelected}
              onNew={startNew}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden h-5.5 items-center gap-1 rounded-full bg-brand-subtle px-2 text-xs font-medium text-brand-ink sm:inline-flex">
            <MagicStar aria-hidden className="size-3" />
            Cited answers
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="New conversation" onClick={startNew} disabled={activeId === null}>
                <Add aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New conversation</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        {activeId && messages.isPending ? (
          <MessagesSkeleton />
        ) : activeId && messages.isError ? (
          <div className="p-4">
            <ErrorState title="Messages could not be loaded" error={messages.error} onRetry={() => messages.refetch()} />
          </div>
        ) : messageCount === 0 && !waitingOnAnswer ? (
          <EmptyChat
            disabled={docs.length === 0}
            onPick={(question) => {
              composer.current?.setValue(question);
              composer.current?.focus();
            }}
          />
        ) : (
          <ol className="flex flex-col gap-6 px-4 py-5 sm:px-6">
            {messages.data?.map((message) => (
              <li key={message.id} data-message data-role={message.role} className="animate-fade-up">
                {message.role === 'user' ? <UserMessage message={message} /> : <AssistantMessage message={message} />}
              </li>
            ))}
            {waitingOnAnswer ? (
              <li>
                <ThinkingMessage />
              </li>
            ) : null}
          </ol>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t bg-surface/60 p-3">
        <ChatComposer
          ref={composer}
          onSend={send}
          busy={ask.isPending || createConversation.isPending}
          disabled={documents.isSuccess && docs.length === 0}
          placeholder={docs.length === 0 && documents.isSuccess ? 'Add a document to start asking…' : undefined}
        />
        {hint ? <p className="px-1 text-xs text-muted-foreground">{hint}</p> : null}
      </footer>
    </section>
  );
}

function EmptyChat({ onPick, disabled }: { onPick: (question: string) => void; disabled: boolean }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid mask-fade-edges opacity-70" />
      {/* A soft brand glow: a radial gradient, not a blur filter (cheaper to paint). */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 -z-10 size-112 -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,var(--highlight)_0%,transparent_65%)] opacity-70"
      />
      <Logomark className="size-11" />
      <div className="flex max-w-md flex-col gap-2">
        <p className="text-display text-[1.75rem] text-foreground">Ask your documents</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Answers come only from this project’s documents, and list the file and page they used.
        </p>
      </div>
      <ul className="flex w-full max-w-md flex-col gap-2" aria-label="Example questions">
        {EXAMPLES.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="flex w-full items-center gap-2.5 rounded-lg border bg-surface px-3 py-2 text-left text-[13px] text-ink-2 shadow-xs transition-colors outline-none hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
            >
              <span aria-hidden className="text-brand">
                ↳
              </span>
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-4 py-5 sm:px-6" aria-busy="true" aria-label="Loading messages">
      <Skeleton className="ml-auto h-9 w-1/2 rounded-2xl" />
      <div className="flex gap-3">
        <Skeleton className="size-7 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
    </div>
  );
}
