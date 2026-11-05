import { DocumentText, Link2, ShieldTick, Folder2, Lock, Book1, type Icon } from 'iconsax-react';
import { Section, SectionTitle } from './section';

const FEATURES: { icon: Icon; title: string; text: string }[] = [
  { icon: Link2, title: 'Cited answers', text: 'Every answer lists the files and pages it used. Open the source and check it yourself.' },
  { icon: Folder2, title: 'One project per topic', text: 'Group documents by supplier, machine or case. Each project has its own documents and conversations.' },
  { icon: ShieldTick, title: 'Isolated search', text: 'A question only searches the documents of its own project. Nothing leaks from one project to another.' },
  { icon: Book1, title: 'Honest when it does not know', text: 'If the documents do not contain the answer, the assistant says so instead of inventing one.' },
  { icon: DocumentText, title: 'Your own files', text: 'PDF, Markdown and plain text, up to 10 MB each. Preview or download them from the app.' },
  { icon: Lock, title: 'Private by default', text: 'Your workspace is tied to your browser session. Other guests cannot see your projects.' },
];

export function Features() {
  return (
    <Section id="features">
      <SectionTitle eyebrow="What you get" title="Built for answers you can trust" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: FeatureIcon, title, text }) => (
          <li key={title} className="flex flex-col gap-3 rounded-xl border bg-surface p-5 transition-shadow hover:shadow-lift">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
              <FeatureIcon aria-hidden className="size-5" />
            </span>
            <h3 className="text-h3">{title}</h3>
            <p className="text-sm leading-6 text-ink-2">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
