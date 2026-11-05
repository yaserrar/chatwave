import { DocStatusBadge } from '~/components/shared/doc-status';
import { FileIcon } from '~/components/shared/file-icon';
import { formatBytes, formatRelative, plural } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { DocumentDto, UploadingFile } from '~/types/document';

/** One document in the panel. The whole row opens the details sheet. */
export function DocumentRow({ doc, onOpen, selected }: { doc: DocumentDto; onOpen: () => void; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group/row flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring aria-[current=true]:bg-subtle',
      )}
    >
      <FileIcon filename={doc.filename} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium text-foreground" title={doc.filename}>
          {doc.filename}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
          <span>{formatBytes(doc.size)}</span>
          {doc.page_count ? (
            <>
              <span aria-hidden>·</span>
              <span>{plural(doc.page_count, 'page')}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span className="truncate">{formatRelative(doc.created_at)}</span>
        </span>
      </span>
      <DocStatusBadge status={doc.status} />
    </button>
  );
}

/** A file whose upload request is still running. */
export function UploadingRow({ file }: { file: UploadingFile }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2" aria-live="polite">
      <FileIcon filename={file.name} className="opacity-60" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-[13px] font-medium text-ink-2">{file.name}</span>
        <span className="relative h-1 w-full overflow-hidden rounded-full bg-subtle">
          <span className="absolute inset-y-0 left-0 w-1/3 animate-[upload-slide_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
        </span>
      </span>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">Uploading</span>
    </div>
  );
}
