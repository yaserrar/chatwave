import { ArrowDown, DocumentUpload, MessageQuestion, TickCircle, type Icon } from 'iconsax-react';
import { useSession } from '~/hooks/auth';
import { EntryButton } from './entry-button';
import { HeroDemo } from './hero-demo';

/** What happens, in the order it happens: readable in two seconds. */
const STEPS: { icon: Icon; title: string; text: string }[] = [
  { icon: DocumentUpload, title: 'Drop your files', text: 'PDF, Markdown or text' },
  { icon: MessageQuestion, title: 'Ask a question', text: 'In plain language' },
  { icon: TickCircle, title: 'Get a cited answer', text: 'With the file and page' },
];

/**
 * Landing hero. The headline says what the app does, one sentence says how, one button lets you in,
 * then the product plays the whole flow so nobody has to imagine it.
 */
export function Hero() {
  const session = useSession();

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b">
      {/* Background: a fine grid fading out, and a soft brand glow (a radial gradient, not a heavy blur) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid mask-fade-edges opacity-70" />
        <div className="absolute top-[38%] left-1/2 h-[34rem] w-[min(70rem,140%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,var(--highlight)_0%,transparent_65%)]" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-5 pt-16 text-center sm:px-8 sm:pt-24">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border bg-card/80 py-1 pr-3 pl-1 text-xs text-muted-foreground shadow-xs backdrop-blur">
          <span className="rounded-full bg-brand-subtle px-2 py-0.5 font-medium text-brand-ink">Free</span>
          No sign-up · your private workspace in one click
        </span>

        <h1
          id="hero-title"
          className="mt-7 animate-fade-up font-display text-[2.6rem] leading-[1.02] font-medium tracking-[-0.035em] text-balance [animation-delay:60ms] sm:text-6xl lg:text-[4.5rem]"
        >
          Upload your documents.
          <br />
          <span className="bg-linear-to-r from-brand to-tile-purple bg-clip-text text-transparent">Ask them anything.</span>
        </h1>

        <p className="mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-pretty text-ink-2 [animation-delay:120ms] sm:text-lg">
          Chatwave reads your manuals, contracts and notes, then answers your questions{' '}
          <strong className="font-medium text-foreground">using only what is written in them</strong>. Every answer shows
          the file and page it came from, so you can check it.
        </p>

        <div className="mt-8 flex animate-fade-up flex-col items-center gap-3 [animation-delay:180ms]">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <EntryButton />
            <a
              href="#how-rag-works"
              className="inline-flex h-11 items-center gap-1.5 rounded-md px-4 text-[15px] font-medium text-ink-2 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              How it works
              <ArrowDown aria-hidden className="size-4" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            {session.data ? `Welcome back, ${session.data.name}. Your projects are waiting.` : 'Your files stay in your own workspace.'}
          </p>
        </div>

        <ol className="mt-12 grid w-full max-w-3xl animate-fade-up gap-3 [animation-delay:240ms] sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-center gap-3 rounded-xl border bg-card/80 px-4 py-3 text-left shadow-xs backdrop-blur">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                <step.icon aria-hidden className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-h3 text-foreground">
                  <span className="mr-1.5 font-mono text-[11px] text-brand-ink">0{i + 1}</span>
                  {step.title}
                </span>
                <span className="text-[13px] text-muted-foreground">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* The product, playing the flow above */}
      <div className="mx-auto mt-12 max-w-5xl animate-fade-up px-3 pb-16 [animation-delay:320ms] sm:mt-14 sm:px-8 sm:pb-24">
        <HeroDemo />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          A real answer from three supplier documents: the question is matched to the right passages, then answered from them only.
        </p>
      </div>
    </section>
  );
}
