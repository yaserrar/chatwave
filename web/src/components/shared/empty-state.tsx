import * as React from 'react';
import type { Icon as IconsaxIcon } from 'iconsax-react';
import { cn } from '~/lib/utils';

/** Every list has one: an icon tile over a faded square grid, a short title and one calm sentence. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  variant = 'dashed',
  className,
}: {
  icon?: IconsaxIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dashed' | 'card' | 'plain';
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'relative isolate flex w-full flex-col items-center justify-center overflow-hidden text-center text-balance',
        size === 'sm' && 'gap-3 px-4 py-8',
        size === 'md' && 'gap-4 px-6 py-12',
        size === 'lg' && 'gap-5 px-6 py-20',
        variant === 'dashed' && 'rounded-xl border border-dashed border-border-strong/80',
        variant === 'card' && 'rounded-xl border bg-card shadow-xs',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grid-sm mask-radial opacity-80" />
      {Icon ? (
        <div
          className={cn(
            'flex items-center justify-center rounded-lg border bg-card text-ink-2 shadow-xs',
            size === 'sm' ? 'size-9' : 'size-11',
          )}
        >
          <Icon aria-hidden className={size === 'sm' ? 'size-4' : 'size-5'} />
        </div>
      ) : null}
      <div className="flex max-w-sm flex-col items-center gap-1.5">
        <p className={cn('font-display font-medium tracking-tight text-foreground', size === 'sm' ? 'text-sm' : 'text-base')}>
          {title}
        </p>
        {description ? <div className="text-sm leading-relaxed text-muted-foreground">{description}</div> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{action}</div> : null}
    </div>
  );
}
