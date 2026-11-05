import * as React from 'react';
import { ArrowRight2, Cpu, DocumentText, DocumentUpload, Flash, MagicStar, MessageQuestion, Scissor, SearchNormal1, Data, type Icon } from 'iconsax-react';
import { cn } from '~/lib/utils';
import { Section, SectionTitle } from './section';

type Phase = 'index' | 'ask';

type Step = {
  icon: Icon;
  title: string;
  short: string;
  text: string;
  visual: React.ReactNode;
};

const PHASES: { id: Phase; label: string; hint: string }[] = [
  { id: 'index', label: '1 · Indexing', hint: 'Once per file' },
  { id: 'ask', label: '2 · Answering', hint: 'Every question' },
];

const STEPS: Record<Phase, Step[]> = {
  index: [
    {
      icon: DocumentUpload,
      title: 'Upload',
      short: 'Add your files',
      text: 'You add PDF, Markdown or text files to a project. The file is stored safely and read page by page, in the background.',
      visual: <UploadVisual />,
    },
    {
      icon: Scissor,
      title: 'Split into chunks',
      short: 'Cut into passages',
      text: 'A whole manual is too big to hand to an AI at once. Each page is cut into passages of about 2,000 characters, with a small overlap so no sentence is lost at the edge.',
      visual: <ChunkVisual />,
    },
    {
      icon: Cpu,
      title: 'Turn into vectors',
      short: 'Meaning as numbers',
      text: 'An embedding model converts every passage into a list of 1,536 numbers. Passages that mean similar things get similar numbers, even if they use different words.',
      visual: <EmbedVisual />,
    },
    {
      icon: Data,
      title: 'Store in a vector database',
      short: 'Save for search',
      text: 'The vectors are saved in PostgreSQL with pgvector, next to the text, the file name and the page number. Indexing is done: the file is now searchable by meaning.',
      visual: <StoreVisual />,
    },
  ],
  ask: [
    {
      icon: MessageQuestion,
      title: 'You ask',
      short: 'Your question',
      text: 'You type a question in plain language. It is converted to a vector with the same embedding model, so it can be compared with your passages.',
      visual: <QuestionVisual />,
    },
    {
      icon: SearchNormal1,
      title: 'Retrieve',
      short: 'Find the best passages',
      text: 'The database finds the 5 passages closest in meaning to the question (cosine similarity). Only this project is searched, so documents from other projects never leak in.',
      visual: <RetrieveVisual />,
    },
    {
      icon: Flash,
      title: 'Augment the prompt',
      short: 'Give the AI the facts',
      text: 'The passages are numbered and added to the prompt, together with the recent conversation and strict rules: answer only from these excerpts, cite them, and say so when the answer is not there.',
      visual: <PromptVisual />,
    },
    {
      icon: MagicStar,
      title: 'Generate a cited answer',
      short: 'Claude writes it',
      text: 'Claude writes the answer from those passages only. The citation markers [1], [2] are matched back to the real files and pages, so you can open the source and check.',
      visual: <AnswerVisual />,
    },
  ],
};

const AUTOPLAY_MS = 5200;

/** The heart of the page: the two RAG pipelines, one step at a time. It plays by itself until you click. */
export function RagExplainer() {
  const [phase, setPhase] = React.useState<Phase>('ask');
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);

  const steps = STEPS[phase];
  const step = steps[index]!;

  React.useEffect(() => {
    if (!playing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => {
        if (current < steps.length - 1) return current + 1;
        setPhase((p) => (p === 'ask' ? 'index' : 'ask'));
        return 0;
      });
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, phase, steps.length]);

  const choose = (nextPhase: Phase, nextIndex: number) => {
    setPlaying(false);
    setPhase(nextPhase);
    setIndex(nextIndex);
  };

  return (
    <Section id="how-rag-works">
      <SectionTitle
        center
        eyebrow="How RAG works"
        title="Retrieval-Augmented Generation, step by step"
        text="A language model only knows what it was trained on, and it guesses when it does not know. RAG fixes that: first retrieve the right passages from your own documents, then let the model write from them."
      />

      <div className="mx-auto mb-8 flex w-fit rounded-lg border bg-subtle p-1" role="tablist" aria-label="RAG phase">
        {PHASES.map((p) => (
          <button
            key={p.id}
            role="tab"
            type="button"
            aria-selected={phase === p.id}
            onClick={() => choose(p.id, 0)}
            className={cn(
              'flex flex-col items-center rounded-md px-4 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:gap-2',
              phase === p.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
            <span className="text-xs font-normal text-muted-foreground">{p.hint}</span>
          </button>
        ))}
      </div>

      <ol className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {steps.map((s, i) => {
          const active = i === index;
          const done = i < index;
          return (
            <li key={s.title} className="relative">
              <button
                type="button"
                onClick={() => choose(phase, i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-full w-full flex-col gap-2 rounded-xl border bg-surface p-4 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'border-brand shadow-lift' : 'hover:border-foreground/30',
                  !active && !done && 'opacity-70',
                )}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex size-8 items-center justify-center rounded-lg',
                      active ? 'bg-brand text-white' : 'bg-brand-subtle text-brand-ink',
                    )}
                  >
                    <s.icon aria-hidden className="size-4.5" />
                  </span>
                  <span className="text-metric text-muted-foreground">0{i + 1}</span>
                </span>
                <span className="text-h3">{s.title}</span>
                <span className="text-xs text-muted-foreground">{s.short}</span>
                {active && playing ? (
                  <span aria-hidden className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full bg-border">
                    <span
                      key={`${phase}-${index}`}
                      className="block h-full origin-left bg-brand"
                      style={{ animation: `rag-progress ${AUTOPLAY_MS}ms linear forwards` }}
                    />
                  </span>
                ) : null}
              </button>
              {i < steps.length - 1 ? (
                <ArrowRight2
                  aria-hidden
                  className="absolute top-1/2 -right-[1.15rem] z-10 hidden size-4 -translate-y-1/2 text-muted-foreground md:block"
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div
        key={`${phase}-${index}`}
        className="grid animate-fade-in gap-6 rounded-2xl border bg-surface p-5 shadow-lift sm:p-8 md:grid-cols-[1fr_1.15fr] md:items-center"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3">
          <span className="text-eyebrow">
            Step {index + 1} of {steps.length} · {phase === 'index' ? 'Indexing' : 'Answering'}
          </span>
          <h3 className="text-h1">{step.title}</h3>
          <p className="text-base leading-7 text-ink-2 text-pretty">{step.text}</p>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="mt-1 w-fit rounded-md text-sm font-medium text-brand-ink underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {playing ? 'Pause the tour' : 'Play the tour'}
          </button>
        </div>
        <div className="min-h-56 rounded-xl border bg-subtle p-4 sm:p-5">{step.visual}</div>
      </div>
    </Section>
  );
}

/* ───────────────────────── Step visuals (illustrative) ───────────────────────── */

function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'brand' }) {
  return (
    <span
      className={cn(
        'text-metric inline-flex items-center gap-1.5 rounded-md border px-2 py-1',
        tone === 'brand' ? 'border-brand/30 bg-brand-subtle text-brand-ink' : 'bg-surface text-ink-2',
      )}
    >
      {children}
    </span>
  );
}

function UploadVisual() {
  const files = [
    { name: 'pump-manual.pdf', size: '2.4 MB', state: 'Indexed' },
    { name: 'safety-sheet.pdf', size: '640 KB', state: 'Indexed' },
    { name: 'procedures.md', size: '48 KB', state: 'Reading…' },
  ];
  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => (
        <div key={file.name} className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5">
          <DocumentText aria-hidden className="size-5 text-brand-ink" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-metric text-muted-foreground">{file.size}</p>
          </div>
          <Chip tone={file.state === 'Indexed' ? 'brand' : 'default'}>{file.state}</Chip>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">PDF, Markdown or text · up to 10 MB each</p>
    </div>
  );
}

function ChunkVisual() {
  const colors = ['bg-brand/15', 'bg-emerald-500/15', 'bg-amber-500/15'];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-metric text-muted-foreground">pump-manual.pdf · page 12</p>
      <div className="flex flex-col gap-1.5">
        {[
          'Operating limits. The pump is rated for continuous operation up to 85 °C at nominal flow…',
          '…nominal flow. Above 90 °C the thermal cut-off stops the motor. Restart only after cooling…',
          '…after cooling. Maintenance: replace the seal every 4,000 hours or once a year…',
        ].map((text, i) => (
          <div key={i} className={cn('rounded-lg border px-3 py-2 text-xs leading-5 text-ink-2', colors[i])}>
            <span className="text-metric mr-2 text-foreground">chunk {i + 1}</span>
            {text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Chip>~2,000 characters</Chip>
        <Chip>200 overlap</Chip>
      </div>
    </div>
  );
}

function EmbedVisual() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="rounded-lg border bg-surface px-3 py-2 text-xs leading-5 text-ink-2">
        “…rated for continuous operation up to 85 °C at nominal flow…”
      </p>
      <ArrowRight2 aria-hidden className="size-4 rotate-90 self-center text-muted-foreground" />
      <div className="text-metric w-full overflow-hidden rounded-lg border bg-surface p-3 text-brand-ink">
        [ 0.021, −0.384, 0.157, 0.902, −0.066, 0.248, −0.719, 0.033, 0.511, −0.140, …
        <span className="text-muted-foreground"> 1,526 more ]</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Similar meaning, similar numbers: “max temperature” lands next to “rated up to 85 °C”.
      </p>
    </div>
  );
}

function StoreVisual() {
  const rows = [
    ['pump-manual.pdf', '12', '[0.021, −0.384, …]'],
    ['pump-manual.pdf', '12', '[0.140, 0.092, …]'],
    ['safety-sheet.pdf', '3', '[−0.208, 0.447, …]'],
    ['procedures.md', '1', '[0.317, −0.015, …]'],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border bg-surface">
        <div className="text-metric grid grid-cols-[1.4fr_0.4fr_1.2fr] gap-2 border-b bg-subtle px-3 py-1.5 text-muted-foreground">
          <span>file</span>
          <span>page</span>
          <span>embedding</span>
        </div>
        {rows.map(([file, page, vector], i) => (
          <div key={i} className="text-metric grid grid-cols-[1.4fr_0.4fr_1.2fr] gap-2 border-b px-3 py-1.5 last:border-b-0">
            <span className="truncate text-foreground">{file}</span>
            <span>{page}</span>
            <span className="truncate text-brand-ink">{vector}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Chip>PostgreSQL</Chip>
        <Chip tone="brand">pgvector</Chip>
      </div>
    </div>
  );
}

function QuestionVisual() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
        What is the maximum operating temperature of the pump?
      </p>
      <ArrowRight2 aria-hidden className="size-4 rotate-90 self-center text-muted-foreground" />
      <div className="text-metric w-full rounded-lg border bg-surface p-3 text-brand-ink">
        [ 0.018, −0.402, 0.171, 0.887, … ]
        <span className="text-muted-foreground"> · same 1,536 dimensions</span>
      </div>
    </div>
  );
}

function RetrieveVisual() {
  const hits = [
    { file: 'pump-manual.pdf · p. 12', score: 92, used: true },
    { file: 'safety-sheet.pdf · p. 3', score: 84, used: true },
    { file: 'pump-manual.pdf · p. 13', score: 71, used: false },
    { file: 'procedures.md · p. 1', score: 48, used: false },
    { file: 'pump-manual.pdf · p. 2', score: 31, used: false },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {hits.map((hit) => (
        <div key={hit.file} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className={cn('text-metric', hit.used ? 'text-foreground' : 'text-muted-foreground')}>{hit.file}</span>
            <span className="text-metric text-muted-foreground">{hit.score}% match</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', hit.used ? 'bg-brand' : 'bg-muted-foreground/40')} style={{ width: `${hit.score}%` }} />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Illustrative scores. The best passages are sent to the AI.</p>
    </div>
  );
}

function PromptVisual() {
  return (
    <div className="text-metric flex flex-col gap-2 leading-5">
      <div className="rounded-lg border bg-surface p-3">
        <p className="mb-1 text-brand-ink">SYSTEM</p>
        <p className="text-ink-2">Answer only from the excerpts. Cite them as [1], [2]. If the answer is not there, say so.</p>
      </div>
      <div className="rounded-lg border bg-surface p-3">
        <p className="mb-1 text-brand-ink">EXCERPTS</p>
        <p className="text-ink-2">[1] (pump-manual.pdf, page 12) …up to 85 °C…</p>
        <p className="text-ink-2">[2] (safety-sheet.pdf, page 3) …above 90 °C the cut-off…</p>
      </div>
      <div className="rounded-lg border bg-surface p-3">
        <p className="mb-1 text-brand-ink">QUESTION</p>
        <p className="text-ink-2">What is the maximum operating temperature of the pump?</p>
      </div>
    </div>
  );
}

function AnswerVisual() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl rounded-bl-sm border bg-surface px-3.5 py-2.5 text-sm leading-6 text-ink-2">
        The pump is rated for continuous operation up to <strong className="text-foreground">85 °C</strong>{' '}
        <sup className="font-semibold text-brand">[1]</sup>. Above 90 °C the thermal cut-off stops it{' '}
        <sup className="font-semibold text-brand">[2]</sup>.
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip tone="brand">[1] pump-manual.pdf · p. 12</Chip>
        <Chip tone="brand">[2] safety-sheet.pdf · p. 3</Chip>
      </div>
      <p className="text-xs text-muted-foreground">Each marker is matched back to the real file and page.</p>
    </div>
  );
}
