import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, DocumentText, DocumentUpload, Folder2, Link2, MessageQuestion, ShieldTick, type Icon } from 'iconsax-react';
import { ThemeToggle } from '~/components/layout/theme-toggle';
import { Wordmark } from '~/components/layout/wordmark';
import { Button } from '~/components/ui/button';
import { SITE } from '~/constants/site';
import { useSession, useStartGuestSession } from '~/hooks/auth';

const STEPS: { icon: Icon; title: string; text: string }[] = [
  { icon: Folder2, title: 'Create a project', text: 'One project per supplier, machine or topic. Each keeps its own documents and conversations.' },
  { icon: DocumentUpload, title: 'Upload documents', text: 'Add PDF, Markdown or text files. They are read and indexed in the background.' },
  { icon: MessageQuestion, title: 'Ask questions', text: 'Get answers written from your documents only, with the document and page behind each one.' },
];

const FEATURES: { icon: Icon; title: string; text: string }[] = [
  { icon: ShieldTick, title: 'Isolated projects', text: 'A question only searches the documents of its own project. Nothing leaks between projects.' },
  { icon: Link2, title: 'Cited answers', text: 'Every answer lists the documents and pages it used, so you can check it.' },
  { icon: DocumentText, title: 'Your own files', text: 'Manuals, contracts, procedures: PDF, Markdown and plain text up to 10 MB each.' },
];

/** The public home page: what Chatwave is, and a one-click way in. */
export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Header />
      <main id="main">
        <Hero />
        <Steps />
        <Features />
        <GuestNote />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <Wordmark />
          <p>{SITE.tagline}. Answers come only from your documents.</p>
        </div>
      </footer>
    </div>
  );
}

/** The one action of the page: continue as a guest, or open the dashboard if a session already exists. */
function EntryButton({ size = 'lg', variant = 'default' }: { size?: 'lg' | 'sm'; variant?: 'default' | 'outline' }) {
  const session = useSession();
  const startGuest = useStartGuestSession();
  const navigate = useNavigate();

  if (session.data) {
    return (
      <Button asChild size={size} variant={variant}>
        <Link to="/dashboard">
          Open dashboard
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      disabled={startGuest.isPending}
      onClick={() => startGuest.mutate(undefined, { onSuccess: () => navigate({ to: '/dashboard' }) })}
    >
      {startGuest.isPending ? 'Starting…' : 'Continue as guest'}
      {startGuest.isPending ? null : <ArrowRight aria-hidden />}
    </Button>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link to="/" aria-label="Chatwave home" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:inline-flex" />
          <EntryButton size="sm" variant="outline" />
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const session = useSession();

  return (
    <section className="relative overflow-hidden border-b">
      <div aria-hidden className="bg-dot-grid mask-fade-edges pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col items-start gap-6">
          <span className="text-eyebrow">{SITE.tagline}</span>
          <h1 className="text-display max-w-xl text-balance sm:text-5xl sm:leading-[1.08]">
            Ask your documents. Get answers you can check.
          </h1>
          <p className="max-w-lg text-base leading-7 text-ink-2 text-pretty">{SITE.description}</p>
          <div className="flex flex-col items-start gap-3">
            <EntryButton />
            <p className="text-sm text-muted-foreground">
              {session.data
                ? `Welcome back, ${session.data.name}.`
                : 'No sign-up and no personal details. Your guest workspace is ready in a second.'}
            </p>
          </div>
        </div>
        <ChatPreview />
      </div>
    </section>
  );
}

/** A static mock of the product: a question and a cited answer. */
function ChatPreview() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-md rounded-xl border bg-surface p-4 shadow-lift sm:p-5">
      <div className="mb-4 flex items-center gap-2 border-b pb-3 text-xs text-muted-foreground">
        <Folder2 className="size-4" />
        <span className="font-medium text-foreground">Supplier A</span>
        <span className="ml-auto text-metric">3 documents</span>
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <p className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-foreground">
          What is the maximum operating temperature of the pump?
        </p>
        <div className="max-w-[92%] rounded-xl rounded-bl-sm border bg-subtle px-3.5 py-2.5 text-ink-2">
          <p className="leading-6">
            The pump is rated for continuous operation up to <strong className="text-foreground">85 °C</strong> [1]. Above
            90 °C the thermal cut-off stops it [2].
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {['pump-manual.pdf · p. 12', 'safety-sheet.pdf · p. 3'].map((source) => (
              <span key={source} className="text-metric rounded-md border bg-surface px-2 py-0.5 text-muted-foreground">
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10 flex flex-col gap-2">
      <span className="text-eyebrow">{eyebrow}</span>
      <h2 className="text-h1 max-w-xl text-balance">{title}</h2>
    </div>
  );
}

function Steps() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-20">
        <SectionTitle eyebrow="How it works" title="From a pile of files to answers in three steps" />
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: StepIcon, title, text }, index) => (
            <li key={title} className="flex flex-col gap-3 rounded-xl border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                  <StepIcon aria-hidden className="size-5" />
                </span>
                <span className="text-metric text-muted-foreground">0{index + 1}</span>
              </div>
              <h3 className="text-h2">{title}</h3>
              <p className="text-sm leading-6 text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="border-b bg-subtle/50">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-20">
        <SectionTitle eyebrow="Why Chatwave" title="Answers you can trust, from documents you control" />
        <ul className="grid gap-x-8 gap-y-8 md:grid-cols-3">
          {FEATURES.map(({ icon: FeatureIcon, title, text }) => (
            <li key={title} className="flex flex-col gap-2">
              <FeatureIcon aria-hidden className="size-6 text-brand-ink" />
              <h3 className="text-h3">{title}</h3>
              <p className="text-sm leading-6 text-ink-2">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GuestNote() {
  return (
    <section>
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="flex max-w-xl flex-col gap-3">
          <h2 className="text-h1 text-balance">Try it now, as a guest</h2>
          <p className="text-sm leading-6 text-ink-2">
            A guest workspace is private to this browser and needs no email. Keep in mind that it is tied to this browser:
            if you clear your cookies, sign out or switch device, you will not get back to it. Workspaces that stay unused
            for a long time are deleted.
          </p>
        </div>
        <EntryButton />
      </div>
    </section>
  );
}
