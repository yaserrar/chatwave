import * as React from 'react';
import { ErrorState } from '~/components/shared/error-state';
import { Markdown } from '~/components/shared/markdown';
import { Skeleton } from '~/components/ui/skeleton';
import { useDocumentText } from '~/hooks/documents';
import { clearHighlight, highlightPassage, scrollRangeIntoView } from '~/lib/highlight';
import type { SourceDto } from '~/types/chat';
import { PassageStatus, type PassageState } from './passage-status';

const HIGHLIGHT = 'cw-passage';

/** A Markdown or text file, rendered, with the cited passage highlighted and scrolled into view. */
export function TextViewer({
  projectId,
  source,
  url,
  markdown,
}: {
  projectId: string;
  source: SourceDto;
  url: string;
  markdown: boolean;
}) {
  const text = useDocumentText(projectId, source.document_id, url);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const range = React.useRef<Range | null>(null);
  const [state, setState] = React.useState<PassageState>('locating');
  const excerpt = source.excerpt;

  // After the text is on screen: find the passage, paint it, bring it into view
  React.useLayoutEffect(() => {
    const content = contentRef.current;
    const scroller = scrollRef.current;
    if (!text.data || !content || !scroller) return;
    if (!excerpt) {
      setState('unknown');
      return;
    }
    // The passage's known position, as a share of the file: picks the right one if the text repeats
    const hint = source.char_start != null ? source.char_start / Math.max(text.data.length, 1) : undefined;
    range.current = highlightPassage(content, excerpt, HIGHLIGHT, hint);
    setState(range.current ? 'found' : 'missing');
    if (range.current) scrollRangeIntoView(scroller, range.current);
  }, [text.data, excerpt, source.char_start]);

  React.useEffect(() => () => clearHighlight(HIGHLIGHT), []);

  if (text.isPending) return <ViewerSkeleton />;
  if (text.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <ErrorState title="The file could not be read" error={text.error} onRetry={() => text.refetch()} retrying={text.isFetching} />
      </div>
    );
  }

  return (
    <>
      <PassageStatus
        state={state}
        excerpt={excerpt}
        onShow={() => range.current && scrollRef.current && scrollRangeIntoView(scrollRef.current, range.current)}
      />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-subtle">
        <div ref={contentRef} className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {markdown ? (
            <article className="rounded-xl border bg-card px-5 py-6 shadow-xs sm:px-8">
              <Markdown>{text.data}</Markdown>
            </article>
          ) : (
            <pre className="rounded-xl border bg-card p-5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground shadow-xs">
              {text.data}
            </pre>
          )}
        </div>
      </div>
    </>
  );
}

export function ViewerSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-8" aria-busy="true" aria-label="Loading the document">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-11/12" />
      <Skeleton className="h-3.5 w-4/5" />
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  );
}
