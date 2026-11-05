/**
 * Display formatting. Sizes, counts and dates render in Geist Mono (`font-mono` / `text-metric`) at the
 * call site; these helpers only produce the strings.
 */

const numberFormat = new Intl.NumberFormat('en-GB');
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const shortDateYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatCount = (n: number) => numberFormat.format(n);

/** "1 document", "3 documents". */
export const plural = (n: number, word: string, many = `${word}s`) => `${formatCount(n)} ${n === 1 ? word : many}`;

/** 18810 → "18.4 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** "4 Nov", or "4 Nov 2025" when it is not this year. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.getFullYear() === new Date().getFullYear() ? shortDate.format(date) : shortDateYear.format(date);
}

/** "4 Nov 2026, 14:30". */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** "just now", "5 min ago", "3 h ago", "yesterday", then the date. */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

/** "report.final.PDF" → ".pdf" ("" when there is no extension). */
export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot).toLowerCase() : '';
}

/** Two letters for a project tile: "Supplier Alpha" → "SA", "manuals" → "MA". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '·';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
