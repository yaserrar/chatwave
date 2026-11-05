import { cn } from '~/lib/utils';

export function Section({
  children,
  className,
  id,
  muted,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  muted?: boolean;
}) {
  return (
    <section id={id} className={cn('scroll-mt-16 border-b', muted && 'bg-subtle/50')}>
      <div className={cn('mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24', className)}>{children}</div>
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  text,
  center,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-12 flex flex-col gap-3', center && 'mx-auto items-center text-center')}>
      <span className="text-eyebrow text-brand-ink">{eyebrow}</span>
      <h2 className="text-h1 max-w-2xl text-balance sm:text-4xl sm:leading-[1.12]">{title}</h2>
      {text ? <p className="max-w-2xl text-base leading-7 text-ink-2 text-pretty">{text}</p> : null}
    </div>
  );
}
