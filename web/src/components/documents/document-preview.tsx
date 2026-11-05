import { DocumentDownload, ExportSquare } from 'iconsax-react';
import { ErrorState } from '~/components/shared/error-state';
import { FileIcon, fileKind } from '~/components/shared/file-icon';
import { Markdown } from '~/components/shared/markdown';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { useDocumentPreviewUrl, useDocumentText, useDownloadDocument } from '~/hooks/documents';
import { extensionOf, formatBytes } from '~/lib/format';
import type { DocumentDto } from '~/types/document';

/**
 * Full-size preview of an uploaded file, read straight from S3 through a presigned link:
 * PDF in the browser's own viewer (iframe), Markdown rendered, plain text as is.
 */
export function DocumentPreview({
  projectId,
  doc,
  open,
  onOpenChange,
}: {
  projectId: string;
  doc: DocumentDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const download = useDownloadDocument(projectId);
  const link = useDocumentPreviewUrl(projectId, doc.id, { enabled: open });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <header className="flex items-center gap-3 border-b py-3 pr-14 pl-4">
          <FileIcon filename={doc.filename} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col">
            <DialogTitle className="truncate text-sm font-medium">{doc.filename}</DialogTitle>
            <DialogDescription className="font-mono text-[11px]">
              {fileKind(doc.filename).label} · {formatBytes(doc.size)}
            </DialogDescription>
          </div>
          {link.data ? (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <a href={link.data.url} target="_blank" rel="noreferrer">
                <ExportSquare aria-hidden />
                Open in new tab
              </a>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => download.mutate(doc.id)} disabled={download.isPending}>
            <DocumentDownload aria-hidden />
            {download.isPending ? 'Preparing…' : 'Download'}
          </Button>
        </header>

        <div className="relative min-h-0 flex-1 bg-subtle">
          {link.isPending ? (
            <PreviewSkeleton />
          ) : link.isError ? (
            <div className="flex h-full items-center justify-center p-6">
              <ErrorState title="The preview could not be opened" error={link.error} onRetry={() => link.refetch()} retrying={link.isFetching} />
            </div>
          ) : (
            <PreviewBody projectId={projectId} doc={doc} url={link.data.url} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({ projectId, doc, url }: { projectId: string; doc: DocumentDto; url: string }) {
  const ext = extensionOf(doc.filename);

  if (ext === '.pdf') {
    // The browser's PDF viewer: pages, zoom, search and print for free.
    return <iframe src={url} title={`Preview of ${doc.filename}`} className="size-full border-0 bg-white" />;
  }
  return <TextPreview projectId={projectId} doc={doc} url={url} markdown={ext === '.md'} />;
}

function TextPreview({ projectId, doc, url, markdown }: { projectId: string; doc: DocumentDto; url: string; markdown: boolean }) {
  const text = useDocumentText(projectId, doc.id, url);

  if (text.isPending) return <PreviewSkeleton />;
  if (text.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState title="The file could not be read" error={text.error} onRetry={() => text.refetch()} retrying={text.isFetching} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {markdown ? (
          <article className="rounded-xl border bg-card px-6 py-6 shadow-xs sm:px-10">
            <Markdown>{text.data}</Markdown>
          </article>
        ) : (
          <pre className="rounded-xl border bg-card p-6 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground shadow-xs">
            {text.data}
          </pre>
        )}
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-3 px-6 py-8" aria-busy="true" aria-label="Loading preview">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-11/12" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  );
}
