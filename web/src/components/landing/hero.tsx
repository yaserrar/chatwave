import { DocumentText, Flash, Folder2 } from 'iconsax-react';
import { SITE } from '~/constants/site';
import { useSession } from '~/hooks/auth';
import { EntryButton } from './entry-button';

export function Hero() {
  const session = useSession();

  return (
    <section className="relative overflow-hidden border-b">
      <div aria-hidden className="bg-dot-grid mask-fade-edges pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.05fr_1fr]">
        <div className="flex animate-fade-up flex-col items-start gap-6">
          <a
            href="#how-rag-works"
            className="inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-foreground"
          >
            <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-brand-ink">RAG</span>
            Retrieval-Augmented Generation, ready to use
          </a>
          <h1 className="text-display max-w-xl text-balance sm:text-5xl sm:leading-[1.06]">
            An AI that answers from <span className="text-brand">your documents</span>, and shows its sources.
          </h1>
          <p className="max-w-lg text-base leading-7 text-ink-2 text-pretty">
            {SITE.name} reads your PDFs, Markdown and text files, finds the passages that match your question, and gives
            them to the AI to write the answer. It cannot invent facts from thin air: every answer points to the document
            and page behind it.
          </p>
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <EntryButton />
              <a
                href="#how-rag-works"
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-2 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                See how it works
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              {session.data
                ? `Welcome back, ${session.data.name}.`
                : 'No sign-up, no email. Your guest workspace is ready in a second.'}
            </p>
          </div>
        </div>
        <HeroDemo />
      </div>
    </section>
  );
}

const SOURCES = [
  { n: 1, file: 'pump-manual.pdf', page: 12, text: '…rated for continuous operation up to 85 °C at nominal flow…' },
  { n: 2, file: 'safety-sheet.pdf', page: 3, text: '…above 90 °C the thermal cut-off stops the motor…' },
];

/** A static mock of the product: a question, the passages retrieved, and a cited answer. */
function HeroDemo() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms]">
      <div className="rounded-xl border bg-surface p-4 shadow-lift sm:p-5">
        <div className="mb-4 flex items-center gap-2 border-b pb-3 text-xs text-muted-foreground">
          <Folder2 className="size-4" />
          <span className="font-medium text-foreground">Supplier A</span>
          <span className="text-metric ml-auto">3 documents</span>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-foreground">
            What is the maximum operating temperature of the pump?
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flash className="size-3.5 text-brand" />
            Found 2 relevant passages in 3 documents
          </div>

          <div className="max-w-[94%] rounded-xl rounded-bl-sm border bg-subtle px-3.5 py-2.5 text-ink-2">
            <p className="leading-6">
              The pump is rated for continuous operation up to <strong className="text-foreground">85 °C</strong>{' '}
              <sup className="font-semibold text-brand">[1]</sup>. Above 90 °C the thermal cut-off stops it{' '}
              <sup className="font-semibold text-brand">[2]</sup>.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {SOURCES.map((source) => (
                <div key={source.n} className="flex items-start gap-2 rounded-lg border bg-surface px-2.5 py-1.5">
                  <span className="text-metric mt-px text-brand">[{source.n}]</span>
                  <div className="min-w-0">
                    <p className="text-metric flex items-center gap-1 text-foreground">
                      <DocumentText className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {source.file} · p. {source.page}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{source.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
