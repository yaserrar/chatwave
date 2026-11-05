import * as React from 'react';
import { DocumentUpload } from 'iconsax-react';
import { ACCEPT_ATTRIBUTE, ALLOWED_LABEL, MAX_FILE_SIZE_MB } from '~/constants/uploads';
import { cn } from '~/lib/utils';

export type UploadDropzoneHandle = { browse: () => void };

/**
 * Drop files here or click to browse. `compact` is the slim bar shown above a non-empty list;
 * the full version is the empty state of the documents panel.
 */
export function UploadDropzone({
  onFiles,
  compact = false,
  disabled = false,
  ref,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
  disabled?: boolean;
  ref?: React.Ref<UploadDropzoneHandle>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  // dragenter/dragleave fire for every child element; count them so the highlight does not flicker.
  const depth = React.useRef(0);

  React.useImperativeHandle(ref, () => ({ browse: () => inputRef.current?.click() }), []);

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current--;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
      className={cn(
        'group/drop relative isolate overflow-hidden rounded-xl border border-dashed border-border-strong/80 transition-colors',
        dragging && 'border-brand bg-brand-subtle/60',
        disabled && 'opacity-60',
      )}
    >
      {!compact ? <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid-sm mask-radial opacity-80" /> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full items-center rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
          compact ? 'gap-3 px-3 py-2.5' : 'flex-col justify-center gap-4 px-6 py-10 text-center',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border bg-card text-ink-2 shadow-xs transition-colors group-hover/drop:text-foreground',
            compact ? 'size-8' : 'size-11',
            dragging && 'border-brand/40 text-brand-ink',
          )}
        >
          <DocumentUpload aria-hidden className={compact ? 'size-4' : 'size-5'} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn('font-medium text-foreground', compact ? 'text-[13px]' : 'font-display text-base tracking-tight')}>
            {dragging ? 'Drop to upload' : compact ? 'Add more documents' : 'Drop documents here'}
          </span>
          <span className="text-xs text-muted-foreground">
            {compact ? (
              <>
                {ALLOWED_LABEL} · up to {MAX_FILE_SIZE_MB} MB
              </>
            ) : (
              <>
                or <span className="font-medium text-brand-ink underline-offset-2 group-hover/drop:underline">browse your files</span>.{' '}
                {ALLOWED_LABEL}, up to {MAX_FILE_SIZE_MB} MB each.
              </>
            )}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = ''; // the same file can be picked again
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}
