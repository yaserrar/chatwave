import * as React from 'react';
import { cn } from '~/lib/utils';

/** Page title block: optional eyebrow, the page's single h1 (Satoshi), one line of description, actions. */
export function PageHeader({
  title,
  description,
  eyebrow,
  leading,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Before the title, e.g. a project tile. */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-5', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            {eyebrow ? <div className="text-eyebrow">{eyebrow}</div> : null}
            <h1 className="text-h1 text-balance wrap-break-word text-foreground">{title}</h1>
            {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

/** Section heading inside a page. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={id} className="text-h2 text-foreground">
          {title}
        </h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Standard padded container for app pages, inside the framed column. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex w-full flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-10', className)}>{children}</div>;
}
