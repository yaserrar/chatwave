import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the custom utilities of globals.css, otherwise it reads `text-h1` as a text colour
// and `bg-grid` as a background colour and drops them when merged with a real colour class.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'kpi', 'eyebrow', 'metric'] }],
      'bg-image': [{ bg: ['grid', 'grid-sm', 'dot-grid'] }],
      shadow: [{ shadow: ['float', 'pop', 'lift'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True when an "outside" interaction comes from a toast, so an open sheet or dialog stays open. */
export function isToastEvent(event: Event) {
  return event.target instanceof Element && Boolean(event.target.closest('[data-sonner-toaster]'));
}
