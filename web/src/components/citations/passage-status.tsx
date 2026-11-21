import { Gps, InfoCircle, Warning2 } from 'iconsax-react';
import { Button } from '~/components/ui/button';

/** Where the viewer stands with the cited passage. */
export type PassageState = 'locating' | 'found' | 'missing' | 'unknown';

/**
 * The strip above the document: the passage is highlighted (with a way back to it), or it couldn't be
 * pinpointed and is shown as is, or the answer is older than recorded passages.
 */
export function PassageStatus({
  state,
  page,
  excerpt,
  onShow,
}: {
  state: PassageState;
  /** The cited page, for PDFs. */
  page?: number;
  excerpt?: string | null;
  onShow: () => void;
}) {
  const where = page ? ` on page ${page}` : '';

  if (state === 'found') {
    return (
      <div className="flex items-center justify-between gap-3 border-b bg-brand-subtle/60 px-4 py-2 text-[13px] text-brand-ink" role="status">
        <span className="flex min-w-0 items-center gap-2">
          <Gps aria-hidden className="size-4 shrink-0" />
          <span className="truncate">Passage highlighted{where}</span>
        </span>
        <Button variant="ghost" size="xs" onClick={onShow} className="shrink-0 text-brand-ink hover:bg-brand-subtle hover:text-brand-ink">
          Show passage
        </Button>
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div className="flex flex-col gap-2 border-b bg-warning-subtle px-4 py-2.5 text-[13px]" role="status">
        <p className="flex items-start gap-2 text-warning">
          <Warning2 aria-hidden className="mt-px size-4 shrink-0" />
          <span>The exact text couldn’t be pinpointed{where}. Here is the passage the answer cites:</span>
        </p>
        {excerpt ? (
          <blockquote className="max-h-32 overflow-y-auto rounded-md border bg-card px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-2">
            {excerpt}
          </blockquote>
        ) : null}
      </div>
    );
  }

  if (state === 'unknown') {
    return (
      <div className="flex items-start gap-2 border-b bg-subtle px-4 py-2 text-[13px] text-ink-2" role="status">
        <InfoCircle aria-hidden className="mt-px size-4 shrink-0" />
        <span>Opened{where}. This answer is older than passage highlighting, so the exact text isn’t marked.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2 text-[13px] text-muted-foreground" role="status">
      <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-brand" />
      Finding the passage…
    </div>
  );
}
