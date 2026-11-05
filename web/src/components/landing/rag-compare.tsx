import { CloseCircle, TickCircle } from 'iconsax-react';
import { Section, SectionTitle } from './section';

const WITHOUT = [
  'Answers from what it memorised in training, not from your files',
  'Guesses with confidence when it does not know',
  'No way to check where a claim comes from',
  'Cannot know your private or recent documents',
];

const WITH = [
  'Answers from passages retrieved in your documents',
  'Says it cannot find the answer when it is not there',
  'Every claim cites a file and a page you can open',
  'Works on your private manuals, contracts and notes',
];

export function RagCompare() {
  return (
    <Section muted>
      <SectionTitle
        center
        eyebrow="Why RAG"
        title="Not just another chatbot"
        text="A plain chatbot answers from memory. A RAG assistant looks things up first, then answers."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="A plain chatbot" tone="bad" items={WITHOUT} question="What is the pump's maximum temperature?" answer="Most industrial pumps run up to around 80 °C." note="Sounds right. Is it your pump? No way to know." />
        <Card title="Chatwave (RAG)" tone="good" items={WITH} question="What is the pump's maximum temperature?" answer="Up to 85 °C for continuous operation [1]." note="[1] pump-manual.pdf · page 12" />
      </div>
    </Section>
  );
}

function Card({
  title,
  tone,
  items,
  question,
  answer,
  note,
}: {
  title: string;
  tone: 'good' | 'bad';
  items: string[];
  question: string;
  answer: string;
  note: string;
}) {
  const good = tone === 'good';
  const Mark = good ? TickCircle : CloseCircle;
  return (
    <div className={good ? 'rounded-2xl border border-brand/40 bg-surface p-6 shadow-lift' : 'rounded-2xl border bg-surface p-6'}>
      <h3 className="text-h2 mb-4">{title}</h3>
      <div className="mb-5 flex flex-col gap-2 rounded-xl border bg-subtle p-3 text-sm">
        <p className="ml-auto max-w-[90%] rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">{question}</p>
        <p className="max-w-[92%] rounded-lg border bg-surface px-3 py-1.5 text-ink-2">{answer}</p>
        <p className={good ? 'text-metric px-1 text-brand-ink' : 'px-1 text-xs text-muted-foreground'}>{note}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-ink-2">
            <Mark aria-hidden variant="Bold" className={good ? 'mt-0.5 size-5 shrink-0 text-brand' : 'mt-0.5 size-5 shrink-0 text-muted-foreground'} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
