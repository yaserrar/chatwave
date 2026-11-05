import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, TickCircle, Trash, Warning2 } from 'iconsax-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '~/components/shared/confirm-dialog';
import { DOC_STATUS_HINTS, DocStatusBadge } from '~/components/shared/doc-status';
import { ErrorState } from '~/components/shared/error-state';
import { FileIcon, fileKind } from '~/components/shared/file-icon';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { forgetDocument, useDeleteDocument, useDocument } from '~/hooks/documents';
import { formatBytes, formatCount, formatDateTime, plural } from '~/lib/format';

/** Details of one document (GET /projects/{id}/documents/{documentId}), opened from its row. */
export function DocumentSheet({
  projectId,
  documentId,
  onOpenChange,
}: {
  projectId: string;
  documentId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={Boolean(documentId)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {documentId ? (
          <DocumentDetails projectId={projectId} documentId={documentId} onClose={() => onOpenChange(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DocumentDetails({ projectId, documentId, onClose }: { projectId: string; documentId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const doc = useDocument(projectId, documentId);
  const remove = useDeleteDocument(projectId);
  const [confirming, setConfirming] = React.useState(false);

  async function confirmDelete() {
    const name = doc.data?.filename ?? 'Document';
    await remove.mutateAsync(documentId);
    toast.success(`Deleted “${name}”`, { description: 'Future answers will no longer use it.' });
    onClose();
    forgetDocument(qc, projectId, documentId);
  }

  if (doc.isError) {
    return (
      <div className="p-5 pt-12">
        <SheetTitle className="sr-only">Document</SheetTitle>
        <SheetDescription className="sr-only">This document could not be loaded.</SheetDescription>
        <ErrorState title="This document could not be loaded" error={doc.error} onRetry={() => doc.refetch()} />
      </div>
    );
  }

  if (!doc.data) {
    return (
      <div className="flex flex-col gap-4 p-5 pt-12" aria-busy="true">
        <SheetTitle className="sr-only">Loading document</SheetTitle>
        <SheetDescription className="sr-only">Loading</SheetDescription>
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const d = doc.data;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="gap-4 border-b p-5 pr-12">
        <FileIcon filename={d.filename} className="size-11 rounded-xl" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <SheetTitle className="font-display text-lg leading-snug font-medium tracking-tight wrap-break-word">{d.filename}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <DocStatusBadge status={d.status} />
            <span className="text-xs text-muted-foreground">{DOC_STATUS_HINTS[d.status]}</span>
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
        {d.status === 'failed' && d.error_message ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger-subtle px-3 py-2.5 text-[13px] text-danger">
            <Warning2 aria-hidden className="mt-px size-4 shrink-0" />
            <span className="wrap-break-word">{d.error_message}</span>
          </div>
        ) : null}

        <section aria-labelledby="doc-details" className="flex flex-col gap-3">
          <h3 id="doc-details" className="text-eyebrow">
            Details
          </h3>
          <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-[13px]">
            <Row label="Type">
              {fileKind(d.filename).label} <span className="text-muted-foreground">· {d.mime_type}</span>
            </Row>
            <Row label="Size" mono>
              {formatBytes(d.size)}
              {d.size >= 1024 ? <span className="text-muted-foreground"> ({formatCount(d.size)} bytes)</span> : null}
            </Row>
            <Row label="Pages" mono>
              {d.page_count ? plural(d.page_count, 'page') : <span className="text-muted-foreground">Counted when processed</span>}
            </Row>
            <Row label="Uploaded" mono>
              {formatDateTime(d.created_at)}
            </Row>
            <Row label="Last change" mono>
              {formatDateTime(d.updated_at)}
            </Row>
            <Row label="Document ID">
              <CopyId value={d.id} />
            </Row>
          </dl>
        </section>

        <section aria-labelledby="doc-pipeline" className="flex flex-col gap-3">
          <h3 id="doc-pipeline" className="text-eyebrow">
            Processing
          </h3>
          <ol className="flex flex-col gap-2.5">
            {(['Uploaded', 'Text extracted', 'Split into chunks', 'Embedded and searchable'] as const).map((step, i) => {
              const done = i === 0 || d.status === 'ready';
              return (
                <li key={step} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    aria-hidden
                    className={
                      done
                        ? 'flex size-5 items-center justify-center rounded-full bg-doc-ready-subtle text-doc-ready-ink'
                        : 'flex size-5 items-center justify-center rounded-full border border-dashed border-border-strong font-mono text-[10px] text-muted-foreground'
                    }
                  >
                    {done ? <TickCircle className="size-3.5" /> : i + 1}
                  </span>
                  <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{step}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <SheetFooter className="border-t p-4">
        <Button variant="destructive" onClick={() => setConfirming(true)}>
          <Trash aria-hidden />
          Delete document
        </Button>
      </SheetFooter>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        destructive
        title={`Delete “${d.filename}”?`}
        description="The file and everything learned from it are removed. Answers will no longer cite it. This cannot be undone."
        confirmLabel="Delete document"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Row({ label, mono = false, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? 'min-w-0 font-mono text-xs leading-5 tabular-nums' : 'min-w-0'}>{children}</dd>
    </>
  );
}

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group/copy inline-flex max-w-full items-center gap-1.5 rounded-sm font-mono text-xs text-ink-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={copied ? 'Copied' : 'Copy document ID'}
    >
      <span className="truncate">{value}</span>
      {copied ? <TickCircle aria-hidden className="size-3.5 shrink-0 text-success" /> : <Copy aria-hidden className="size-3.5 shrink-0" />}
    </button>
  );
}
