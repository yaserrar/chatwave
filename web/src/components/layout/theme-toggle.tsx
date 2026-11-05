import { Monitor, Moon, Sun1 } from 'iconsax-react';
import { useTheme, type Theme } from '~/hooks/use-theme';
import { cn } from '~/lib/utils';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun1 }[] = [
  { value: 'light', label: 'Light theme', icon: Sun1 },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'System theme', icon: Monitor },
];

/** Segmented light / dark / system control. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className={cn('inline-flex rounded-md border bg-surface p-0.5 shadow-xs', className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              active && 'bg-subtle text-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
