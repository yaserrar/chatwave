import * as React from 'react';
import { ArrowLeft2, ArrowRight2, ExportSquare } from 'iconsax-react';
import { ErrorState } from '~/components/shared/error-state';
import { FileIcon, fileKind } from '~/components/shared/file-icon';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useDocumentPreviewUrl } from '~/hooks/documents';
import { useMediaQuery } from '~/hooks/use-media-query';
import { extensionOf } from '~/lib/format';
import { cn } from '~/lib/utils';
import type { SourceDto } from '~/types/chat';
import { TextViewer, ViewerSkeleton } from './text-viewer';

// pdf.js is large: loaded the first time a PDF citation is opened, not with the chat
const PdfViewer = React.lazy(() => import('./pdf-viewer'));

export type ViewedSources = { sources: SourceDto[]; index: number };

/**
 * The document behind a citation, opened at the cited passage: a side panel on large screens, a bottom sheet
 * on phones. When an answer has several sources, the reader can move between them without closing it.
 */
export function CitationViewer({
  projectId,
  viewing,
  open,
  onOpenChange,
  onIndexChange,
}: {
  projectId: string;
  viewing: ViewedSources | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}) {
  const phone = useMediaQuery('(max-width: 639px)');
  const source = viewing?.sources[viewing.index];
  // The citation or source that opened the panel: focus goes back to it on close (there is no Radix trigger)
  const opener = React.useRef<HTMLElement | null>(null);

  return (
    <Sheet open={open && Boolean(source)} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        // Focus the panel itself, not its first button: a tooltip popping up on open would cover the title
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          (event.currentTarget as HTMLElement).focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener.current?.isConnected) opener.current.focus();
        }}
        className={cn(
          'gap-0 overflow-hidden p-0',
          phone ? 'rounded-t-2xl data-[side=bottom]:h-[92svh]' : 'w-full sm:max-w-xl lg:max-w-2xl xl:max-w-3xl',
        )}
      >
        {viewing && source ? (
          <SourceView projectId={projectId} viewing={viewing} source={source} onIndexChange={onIndexChange} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SourceView({
  projectId,
  viewing,
  source,
  onIndexChange,
}: {
  projectId: string;
  viewing: ViewedSources;
  source: SourceDto;
  onIndexChange: (index: number) => void;
}) {
  const link = useDocumentPreviewUrl(projectId, source.document_id);
  const { sources, index } = viewing;
  const ext = extensionOf(source.filename);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="gap-3 border-b px-4 pt-4 pb-3 pr-12">
        <div className="flex min-w-0 items-center gap-3">
          <FileIcon filename={source.filename} size="sm" />
          <div className="flex min-w-0 flex-col">
            <SheetTitle className="truncate font-sans text-sm font-medium tracking-normal">{source.filename}</SheetTitle>
            <SheetDescription className="font-mono text-[11px]">
              {fileKind(source.filename).label} · page {source.page_number}
              {sources.length > 1 ? ` · source ${index + 1} of ${sources.length}` : ''}
            </SheetDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sources.length > 1 ? (
            <div className="flex items-center gap-1" role="group" aria-label="Sources of this answer">
              <NavButton label="Previous source" disabled={index === 0} onClick={() => onIndexChange(index - 1)}>
                <ArrowLeft2 aria-hidden className="size-4" />
              </NavButton>
              <span className="min-w-10 text-center font-mono text-xs text-muted-foreground tabular-nums">
                {index + 1} / {sources.length}
              </span>
              <NavButton label="Next source" disabled={index === sources.length - 1} onClick={() => onIndexChange(index + 1)}>
                <ArrowRight2 aria-hidden className="size-4" />
              </NavButton>
            </div>
          ) : null}
          {link.data ? (
            <Button asChild variant="ghost" size="xs" className="ml-auto">
              <a href={link.data.url} target="_blank" rel="noreferrer">
                <ExportSquare aria-hidden />
                Open file
              </a>
            </Button>
          ) : null}
        </div>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col">
        {link.isPending ? (
          <ViewerSkeleton />
        ) : link.isError ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <ErrorState title="This document could not be opened" error={link.error} onRetry={() => link.refetch()} retrying={link.isFetching} />
          </div>
        ) : ext === '.pdf' ? (
          <React.Suspense fallback={<ViewerSkeleton />}>
            <PdfViewer key={source.document_id} source={source} url={link.data.url} onRetry={() => link.refetch()} />
          </React.Suspense>
        ) : (
          <TextViewer key={source.document_id} projectId={projectId} source={source} url={link.data.url} markdown={ext === '.md'} />
        )}
      </div>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon-xs" aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
