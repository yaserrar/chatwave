import * as React from 'react';
import { InfoCircle, Lamp, Warning2, type Icon } from 'iconsax-react';
import { cn } from '~/lib/utils';

/** One numbered chapter of the documentation, linkable by `#id`. */
export function DocSection({
  id,
  index,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  index: number;
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-6 border-t border-hairline pt-10 first:border-t-0 first:pt-0">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-eyebrow">
          <span className="font-mono text-brand-ink">[{String(index).padStart(2, '0')}]</span>
          {eyebrow}
        </div>
        <h2 id={`${id}-title`} className="text-h1 text-foreground">
          {title}
        </h2>
        {intro ? <div className="max-w-3xl text-[15px] leading-relaxed text-ink-2">{intro}</div> : null}
      </header>
      {children}
    </section>
  );
}

/** A sub-heading inside a section. */
export function DocSubheading({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h3 id={id} className="scroll-mt-6 text-h2 text-foreground">
      {children}
    </h3>
  );
}

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex max-w-3xl flex-col gap-3 text-sm leading-relaxed text-ink-2', className)}>{children}</div>;
}

const CALLOUTS = {
  info: { icon: InfoCircle, className: 'border-info/25 bg-info-subtle text-info', title: 'Good to know' },
  tip: { icon: Lamp, className: 'border-brand/25 bg-brand-subtle text-brand-ink', title: 'Why it is built this way' },
  warning: { icon: Warning2, className: 'border-warning/25 bg-warning-subtle text-warning', title: 'Watch out' },
} as const;

export function Callout({
  kind = 'info',
  title,
  children,
}: {
  kind?: keyof typeof CALLOUTS;
  title?: string;
  children: React.ReactNode;
}) {
  const c = CALLOUTS[kind];
  const IconComponent = c.icon;
  return (
    <aside className={cn('flex max-w-3xl gap-3 rounded-xl border px-4 py-3', c.className)}>
      <IconComponent aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1 text-[13px] leading-relaxed">
        <p className="font-medium">{title ?? c.title}</p>
        <div className="text-foreground/80">{children}</div>
      </div>
    </aside>
  );
}

/** Monospace block for code, SQL, prompts and folder trees. Not highlighted on purpose: easy to copy and read. */
export function CodeBlock({ children, label, className }: { children: string; label?: string; className?: string }) {
  return (
    <figure className={cn('flex max-w-3xl flex-col overflow-hidden rounded-xl border bg-subtle', className)}>
      {label ? (
        <figcaption className="border-b bg-surface px-4 py-2 font-mono text-[11px] text-muted-foreground">{label}</figcaption>
      ) : null}
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

/** Inline code. */
export function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground">{children}</code>;
}

const METHOD_CLASSES: Record<string, string> = {
  GET: 'bg-info-subtle text-info',
  POST: 'bg-success-subtle text-success',
  PUT: 'bg-warning-subtle text-warning',
  DELETE: 'bg-danger-subtle text-danger',
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className={cn('inline-flex h-5.5 w-14 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold', METHOD_CLASSES[method])}>
      {method}
    </span>
  );
}

/** Small tile with an icon, a title and a sentence (used for overviews and layers). */
export function InfoTile({
  icon: IconComponent,
  title,
  children,
  tone = 'neutral',
}: {
  icon: Icon;
  title: string;
  children: React.ReactNode;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-lg',
          tone === 'brand' ? 'bg-brand-subtle text-brand-ink' : 'border bg-surface text-ink-2',
        )}
      >
        <IconComponent aria-hidden className="size-4" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-h3 text-foreground">{title}</p>
        <div className="text-[13px] leading-5 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export type TocItem = { id: string; label: string };

/**
 * "On this page" list. The section in view is highlighted (IntersectionObserver on the app's scrolling
 * <main>). Clicking scrolls smoothly and updates the URL hash, so a section can be shared by link.
 */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = React.useState(items[0]?.id);

  React.useEffect(() => {
    const root = document.getElementById('main');
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { root, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page" className="flex flex-col gap-2">
      <p className="text-eyebrow">On this page</p>
      <ol className="flex flex-col border-l border-hairline">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', `#${item.id}`);
                setActive(item.id);
              }}
              className="-ml-px flex gap-2 border-l border-transparent py-1 pl-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground aria-[current=true]:border-brand aria-[current=true]:font-medium aria-[current=true]:text-foreground"
            >
              <span className="font-mono text-[11px] text-muted-foreground/80">{String(i + 1).padStart(2, '0')}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
