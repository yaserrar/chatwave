import { DOC_STATUS_CLASSES } from '~/lib/colors';
import { cn } from '~/lib/utils';
import type { DocumentStatus } from '~/types/document';

export const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Queued',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

export const DOC_STATUS_HINTS: Record<DocumentStatus, string> = {
  pending: 'Waiting to be read and indexed.',
  processing: 'Reading the text and building the search index.',
  ready: 'Searchable: answers can cite this document.',
  failed: 'Processing stopped. The document is not searchable.',
};

/** Three small bars that rise and fall: "the document is being read". */
function WaveBars({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex h-2.5 items-end gap-[2px]', className)}>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-full w-[2px] origin-bottom animate-wave rounded-full bg-current"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** Coloured dot (a pulsing ring while pending). Always paired with a label for colour-blind readers. */
export function DocStatusDot({ status, className }: { status: DocumentStatus; className?: string }) {
  if (status === 'processing') return <WaveBars className={cn(DOC_STATUS_CLASSES.processing.ink, className)} />;
  return (
    <span aria-hidden className={cn('relative inline-flex size-2 shrink-0', className)}>
      {status === 'pending' ? (
        <span className={cn('absolute inset-0 animate-ping-soft rounded-full', DOC_STATUS_CLASSES.pending.dot)} />
      ) : null}
      <span className={cn('relative size-full rounded-full', DOC_STATUS_CLASSES[status].dot)} />
    </span>
  );
}

/** Pill with dot and label: "● Ready". */
export function DocStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const classes = DOC_STATUS_CLASSES[status];
  return (
    <span
      className={cn(
        'inline-flex h-5.5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        classes.subtle,
        classes.ink,
        className,
      )}
    >
      <DocStatusDot status={status} className="size-1.5" />
      {DOC_STATUS_LABELS[status]}
    </span>
  );
}
