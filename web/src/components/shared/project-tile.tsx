import { TILE_CLASSES, tileColorFor } from '~/lib/colors';
import { initials } from '~/lib/format';
import { cn } from '~/lib/utils';

const SIZES = {
  sm: 'size-5 rounded-[5px] text-[9px]',
  md: 'size-9 rounded-lg text-[13px]',
  lg: 'size-11 rounded-xl text-[15px]',
} as const;

/** A project's square: two initials on its colour (derived from the id, so it never changes). */
export function ProjectTile({
  id,
  name,
  size = 'md',
  className,
}: {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const color = TILE_CLASSES[tileColorFor(id)];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display font-semibold tracking-tight ring-1 ring-black/5 ring-inset dark:ring-white/10',
        color.subtle,
        color.ink,
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
