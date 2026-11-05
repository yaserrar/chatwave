import { cn } from '~/lib/utils';

/** Chatwave mark: two waves on a dark tile, the front one in brand indigo. */
export function Logomark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-6 shrink-0', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M7 13.5c2.25 0 2.25-3 4.5-3s2.25 3 4.5 3 2.25-3 4.5-3 2.25 3 4.5 3"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="stroke-primary-foreground"
        opacity=".55"
      />
      <path
        d="M7 20c2.25 0 2.25-3 4.5-3s2.25 3 4.5 3 2.25-3 4.5-3 2.25 3 4.5 3"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="stroke-brand"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logomark />
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-foreground">chatwave</span>
    </span>
  );
}
