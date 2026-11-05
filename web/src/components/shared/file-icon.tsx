import { DocumentCode, DocumentText, DocumentText1 } from 'iconsax-react';
import { extensionOf } from '~/lib/format';
import { cn } from '~/lib/utils';

const KINDS = {
  '.pdf': { icon: DocumentText1, label: 'PDF', className: 'bg-danger-subtle text-danger' },
  '.md': { icon: DocumentCode, label: 'MD', className: 'bg-info-subtle text-info' },
  '.txt': { icon: DocumentText, label: 'TXT', className: 'bg-muted text-ink-2' },
} as const;

const FALLBACK = { icon: DocumentText, label: 'FILE', className: 'bg-muted text-ink-2' };

export function fileKind(filename: string) {
  return KINDS[extensionOf(filename) as keyof typeof KINDS] ?? FALLBACK;
}

/** A document's type at a glance: tinted square with the icon (PDF red, Markdown blue, text grey). */
export function FileIcon({ filename, size = 'md', className }: { filename: string; size?: 'sm' | 'md'; className?: string }) {
  const kind = fileKind(filename);
  const Icon = kind.icon;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg',
        size === 'sm' ? 'size-7' : 'size-9',
        kind.className,
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} />
    </span>
  );
}
