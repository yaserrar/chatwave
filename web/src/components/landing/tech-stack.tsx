import { Section, SectionTitle } from './section';

const STACK = [
  { name: 'OpenAI embeddings', role: 'text-embedding-3-small turns text into 1,536-number vectors' },
  { name: 'PostgreSQL + pgvector', role: 'stores vectors and finds the closest ones by cosine distance' },
  { name: 'Claude', role: 'writes the answer from the retrieved passages only' },
  { name: 'S3 storage', role: 'keeps your original files, with short-lived preview links' },
];

export function TechStack() {
  return (
    <Section muted>
      <SectionTitle
        eyebrow="Under the hood"
        title="A real RAG pipeline, not a demo"
        text="Nothing is hidden: these are the building blocks behind every answer."
      />
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STACK.map((item) => (
          <div key={item.name} className="flex flex-col gap-1.5 rounded-xl border bg-surface p-5">
            <dt className="text-h3">{item.name}</dt>
            <dd className="text-sm leading-6 text-ink-2">{item.role}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-8 grid grid-cols-2 gap-6 border-t pt-8 md:grid-cols-4">
        {[
          ['~2,000', 'characters per chunk'],
          ['1,536', 'dimensions per vector'],
          ['Top 5', 'passages sent to the AI'],
          ['10 MB', 'max size per file'],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-kpi">{value}</dt>
            <dd className="text-sm text-muted-foreground">{label}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
