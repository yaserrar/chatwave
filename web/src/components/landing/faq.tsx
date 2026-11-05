import { ArrowDown2 } from 'iconsax-react';
import { Section, SectionTitle } from './section';

const QUESTIONS = [
  {
    q: 'What is RAG?',
    a: 'Retrieval-Augmented Generation. Instead of asking an AI to answer from memory, the system first retrieves the most relevant passages from your documents, then asks the AI to write the answer using only those passages.',
  },
  {
    q: 'Does the AI learn from or train on my documents?',
    a: 'No. Your files are split and indexed so they can be searched, and the relevant passages are sent along with each question. Nothing is trained into the model.',
  },
  {
    q: 'What if the answer is not in my documents?',
    a: 'The assistant is instructed to say that it cannot find it, instead of guessing. You can then add the missing document or rephrase.',
  },
  {
    q: 'Which files can I upload?',
    a: 'PDF, Markdown and plain text, up to 10 MB each. They are read and indexed in the background, and show as ready when you can ask about them.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Continue as a guest and a private workspace is created for this browser. It has no email, so if you clear your cookies or switch device you will not get back to it, and workspaces that stay unused for a long time are deleted.',
  },
];

export function Faq() {
  return (
    <Section id="faq">
      <SectionTitle eyebrow="Questions" title="Good to know" />
      <div className="mx-auto flex max-w-3xl flex-col divide-y rounded-xl border bg-surface">
        {QUESTIONS.map(({ q, a }) => (
          <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-h3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {q}
              <ArrowDown2 aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="pt-3 text-sm leading-6 text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
