import * as React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ErrorState } from '~/components/shared/error-state';
import { clearHighlight, highlightPassage, scrollRangeIntoView } from '~/lib/highlight';
import { cn } from '~/lib/utils';
import type { SourceDto } from '~/types/chat';
import { PassageStatus, type PassageState } from './passage-status';
import { ViewerSkeleton } from './text-viewer';

// Must be set in the module that renders react-pdf (see its README). Vite emits the worker as its own file.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Files pdf.js loads on demand for some PDFs (Asian text, non-embedded standard fonts, JPEG 2000 images),
// copied from pdfjs-dist into the build by vite.config.ts
const OPTIONS = { cMapUrl: '/pdfjs/cmaps/', standardFontDataUrl: '/pdfjs/standard_fonts/', wasmUrl: '/pdfjs/wasm/' };

const HIGHLIGHT = 'cw-passage-pdf';
const MAX_PAGE_WIDTH = 860;
const GUTTER = 16; // around the pages, in px

/**
 * A PDF from its presigned URL, scrolled to the cited page with the passage highlighted.
 * Every page keeps its real size from the start (so scrolling is stable), but only the pages near the
 * viewport are drawn: a long PDF stays light.
 */
export default function PdfViewer({ source, url, onRetry }: { source: SourceDto; url: string; onRetry: () => void }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const pageRefs = React.useRef(new Map<number, HTMLDivElement>());
  const range = React.useRef<Range | null>(null);
  const [width, setWidth] = React.useState(0);
  const [ratios, setRatios] = React.useState<number[] | null>(null); // height / width of each page
  const [nearby, setNearby] = React.useState<ReadonlySet<number>>(() => new Set());
  const [state, setState] = React.useState<PassageState>('locating');
  const target = source.page_number;
  const excerpt = source.excerpt;

  // Pages fill the panel's width, up to a comfortable reading size
  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(Math.min(el.clientWidth - GUTTER * 2, MAX_PAGE_WIDTH)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function onLoad(pdf: pdfjs.PDFDocumentProxy) {
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then((page) => {
          const { width: w, height: h } = page.getViewport({ scale: 1 });
          return h / w;
        }),
      ),
    );
    setRatios(pages);
  }

  // Draw only the pages within about a screen of the viewport
  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root || !ratios) return;
    const observer = new IntersectionObserver(
      (entries) =>
        setNearby((current) => {
          const next = new Set(current);
          for (const entry of entries) {
            const n = Number((entry.target as HTMLElement).dataset.page);
            if (entry.isIntersecting) next.add(n);
            else next.delete(n);
          }
          return next;
        }),
      { root, rootMargin: '100% 0px' },
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ratios]);

  // Open on the cited page (before the passage is found, so the reader sees the right page at once).
  // Only when the cited source changes or the pages first get their size, not on every resize.
  const sized = width > 0;
  React.useLayoutEffect(() => {
    const root = scrollRef.current;
    const page = pageRefs.current.get(target);
    if (!root || !page || !width) return;
    // From the page's label above it (the scroll area is the offset parent)
    root.scrollTop = (page.parentElement ?? page).offsetTop - GUTTER / 2;
    setState(excerpt ? 'locating' : 'unknown');
  }, [target, excerpt, ratios, sized]);

  const locate = React.useCallback(() => {
    const layer = pageRefs.current.get(target)?.querySelector('.textLayer');
    const root = scrollRef.current;
    if (!layer || !root || !excerpt) return;
    range.current = highlightPassage(layer, excerpt, HIGHLIGHT);
    setState(range.current ? 'found' : 'missing');
    if (range.current) scrollRangeIntoView(root, range.current);
  }, [target, excerpt]);

  // Moving to another passage of the same page: its text layer is already there
  React.useEffect(() => {
    if (pageRefs.current.get(target)?.querySelector('.textLayer span')) locate();
  }, [locate, target]);

  React.useEffect(() => () => clearHighlight(HIGHLIGHT), []);

  return (
    <>
      {ratios ? (
        <PassageStatus
          state={state}
          page={target}
          excerpt={excerpt}
          onShow={() => range.current && scrollRef.current && scrollRangeIntoView(scrollRef.current, range.current)}
        />
      ) : null}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto bg-subtle">
        <Document
          file={url}
          options={OPTIONS}
          suspense={false}
          onLoadSuccess={onLoad}
          loading={<ViewerSkeleton />}
          error={
            <div className="flex h-full items-center justify-center p-6">
              <ErrorState
                title="The PDF could not be opened"
                error={new Error('The link may have expired, or the file is not reachable.')}
                onRetry={onRetry}
              />
            </div>
          }
          className="flex flex-col items-center gap-6 py-4"
        >
          {ratios && width > 0
            ? ratios.map((ratio, i) => {
                const n = i + 1;
                return (
                  <section key={n} aria-label={`Page ${n}`} className="flex flex-col gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-[11px] text-muted-foreground',
                        n === target && 'font-semibold text-brand-ink',
                      )}
                    >
                      Page {n}
                      {n === target ? ' · cited' : ''}
                    </span>
                    <div
                      ref={(el) => {
                        if (el) pageRefs.current.set(n, el);
                        else pageRefs.current.delete(n);
                      }}
                      data-page={n}
                      style={{ width, height: Math.round(width * ratio) }}
                      className={cn(
                        'relative overflow-hidden rounded-sm bg-white shadow-sm',
                        n === target && 'ring-2 ring-brand/40 ring-offset-2 ring-offset-subtle',
                      )}
                    >
                      {nearby.has(n) || n === target ? (
                        <Page
                          pageNumber={n}
                          width={width}
                          renderAnnotationLayer={false}
                          loading={null}
                          onRenderTextLayerSuccess={n === target ? locate : undefined}
                        />
                      ) : null}
                    </div>
                  </section>
                );
              })
            : null}
        </Document>
      </div>
    </>
  );
}
