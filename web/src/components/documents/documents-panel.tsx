import * as React from 'react';
import { toast } from 'sonner';
import { ErrorState } from '~/components/shared/error-state';
import { Skeleton } from '~/components/ui/skeleton';
import { useDocuments, useUploadDocument } from '~/hooks/documents';
import { MAX_DOCUMENTS_PER_PROJECT } from '~/constants/uploads';
import { plural } from '~/lib/format';
import { validateFiles } from '~/schemas/document';
import { errorMessage } from '~/services/api/client';
import type { UploadingFile } from '~/types/document';
import { DocumentRow, UploadingRow } from './document-row';
import { DocumentSheet } from './document-sheet';
import { UploadDropzone, type UploadDropzoneHandle } from './upload-dropzone';

/**
 * The project's documents: drop zone, files being uploaded, the list with live statuses (it polls
 * while something is pending or processing) and the details sheet.
 */
export function DocumentsPanel({ projectId, dropzoneRef }: { projectId: string; dropzoneRef?: React.Ref<UploadDropzoneHandle> }) {
  const documents = useDocuments(projectId, { poll: true });
  const upload = useUploadDocument(projectId);
  const [uploading, setUploading] = React.useState<UploadingFile[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const docCount = documents.data?.length ?? 0;
  // Uploads in flight count too: dropping 6 files twice must not go over the limit.
  const slotsLeft = Math.max(0, MAX_DOCUMENTS_PER_PROJECT - docCount - uploading.length);

  const addFiles = React.useCallback(
    async (files: File[]) => {
      const { accepted: valid, rejected } = validateFiles(files);
      for (const r of rejected) toast.error(`${r.name} was not added`, { description: r.reason });
      if (!valid.length) return;

      // Project limit: keep the first files that fit, explain the rest in one message.
      const accepted = valid.slice(0, slotsLeft);
      const overLimit = valid.length - accepted.length;
      if (overLimit > 0) {
        toast.error(
          accepted.length ? `${plural(overLimit, 'file')} not added` : 'This project is full',
          { description: `A project can hold up to ${MAX_DOCUMENTS_PER_PROJECT} documents. Delete one to make room.` },
        );
      }
      if (!accepted.length) return;

      const items = accepted.map((file) => ({ key: crypto.randomUUID(), name: file.name, size: file.size, file }));
      setUploading((q) => [...q, ...items]);

      // In parallel: one request per file, each row disappears when its own request ends.
      const results = await Promise.allSettled(
        items.map(async (item) => {
          try {
            return await upload.mutateAsync(item.file);
          } catch (error) {
            toast.error(`${item.name} could not be uploaded`, { description: errorMessage(error) });
            throw error;
          } finally {
            setUploading((q) => q.filter((u) => u.key !== item.key));
          }
        }),
      );
      const done = results.filter((r) => r.status === 'fulfilled').length;
      if (done > 0) toast.success(`${plural(done, 'document')} added`, { description: 'Processing starts in the background.' });
    },
    [upload, slotsLeft],
  );

  const docs = documents.data ?? [];
  const ready = docs.filter((d) => d.status === 'ready').length;
  const isEmpty = documents.isSuccess && docs.length === 0 && uploading.length === 0;

  return (
    <section aria-labelledby="documents-title" className="flex min-h-0 flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="documents-title" className="text-h2 text-foreground">
            Documents
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {documents.isSuccess && docs.length > 0
              ? `${docs.length} of ${MAX_DOCUMENTS_PER_PROJECT} documents · ${ready} ready to answer`
              : `The knowledge this project answers from. Up to ${MAX_DOCUMENTS_PER_PROJECT} documents.`}
          </p>
        </div>
      </div>

      {documents.isSuccess && docs.length > 0 ? <ReadinessBar ready={ready} total={docs.length} /> : null}

      <UploadDropzone
        ref={dropzoneRef}
        onFiles={addFiles}
        compact={!isEmpty && !documents.isPending}
        disabled={documents.isError || (documents.isSuccess && slotsLeft === 0)}
      />
      {documents.isSuccess && slotsLeft === 0 && uploading.length === 0 ? (
        <p className="-mt-2 px-1 text-xs text-muted-foreground">
          This project is full ({MAX_DOCUMENTS_PER_PROJECT} documents). Delete one to add another.
        </p>
      ) : null}

      {documents.isPending ? (
        <ul className="flex flex-col gap-1" aria-busy="true" aria-label="Loading documents">
          {[70, 55, 80].map((w) => (
            <li key={w} className="flex items-center gap-3 px-2.5 py-2">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5.5 w-16 rounded-full" />
            </li>
          ))}
        </ul>
      ) : documents.isError ? (
        <ErrorState title="Documents could not be loaded" error={documents.error} onRetry={() => documents.refetch()} retrying={documents.isFetching} />
      ) : docs.length > 0 || uploading.length > 0 ? (
        <ul className="-mx-2.5 flex flex-col gap-0.5">
          {uploading.map((file) => (
            <li key={file.key}>
              <UploadingRow file={file} />
            </li>
          ))}
          {[...docs].reverse().map((doc) => (
            <li key={doc.id} className="animate-fade-in">
              <DocumentRow doc={doc} selected={openId === doc.id} onOpen={() => setOpenId(doc.id)} />
            </li>
          ))}
        </ul>
      ) : null}

      <DocumentSheet projectId={projectId} documentId={openId} onOpenChange={(open) => !open && setOpenId(null)} />
    </section>
  );
}

/** "2 of 3 ready" with a thin progress bar. */
function ReadinessBar({ ready, total }: { ready: number; total: number }) {
  const ratio = total ? ready / total : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-metric">
        <span className="text-ink-2">
          {ready} of {total} ready
        </span>
        <span className="text-muted-foreground">{Math.round(ratio * 100)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Documents ready"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={ready}
        className="h-1.5 w-full overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-doc-ready transition-[width] duration-500 ease-out" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
