import * as React from 'react';
import { Send2 } from 'iconsax-react';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { askSchema, QUESTION_MAX_LENGTH } from '~/schemas/chat';

export type ChatComposerHandle = { setValue: (value: string) => void; focus: () => void };

/**
 * Question box: Enter sends, Shift+Enter adds a line, grows up to ~6 lines. The text is cleared when the
 * question is sent and put back if `onSend` rejects, so a failed question is never lost.
 */
export function ChatComposer({
  onSend,
  disabled = false,
  busy = false,
  placeholder = 'Ask a question about these documents…',
  ref,
}: {
  onSend: (question: string) => Promise<unknown>;
  disabled?: boolean;
  busy?: boolean;
  placeholder?: string;
  ref?: React.Ref<ChatComposerHandle>;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = React.useState('');
  const parsed = askSchema.safeParse({ question: value });
  const canSend = parsed.success && !disabled && !busy;
  const tooLong = value.length > QUESTION_MAX_LENGTH;

  React.useImperativeHandle(
    ref,
    () => ({
      setValue: (next) => setValue(next),
      focus: () => textareaRef.current?.focus(),
    }),
    [],
  );

  // Auto-grow: reset, then fit the content (capped by max-h in CSS).
  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  async function submit() {
    if (!canSend || !parsed.success) return;
    const question = parsed.data.question;
    setValue('');
    try {
      await onSend(question);
    } catch {
      setValue(question); // the error is toasted by the mutation; keep the text so it can be retried
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className={cn(
        'flex items-end gap-2 rounded-xl border bg-card p-2 shadow-xs transition-colors focus-within:border-border-strong focus-within:ring-2 focus-within:ring-ring/20',
        disabled && 'opacity-70',
      )}
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask a question
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={tooLong || undefined}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="submit" size="icon-sm" disabled={!canSend} aria-label="Send question">
            <Send2 aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {tooLong ? `Up to ${QUESTION_MAX_LENGTH} characters` : busy ? 'Waiting for the answer…' : 'Send (Enter)'}
        </TooltipContent>
      </Tooltip>
    </form>
  );
}
