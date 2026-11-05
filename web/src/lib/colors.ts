import type { DocumentStatus } from '~/types/document';

/**
 * Static class maps (Tailwind only generates classes it can see written out in full).
 * Projects have no colour column in the API, so the tile colour is derived from the id: stable, and
 * different projects look different.
 */
export const TILE_COLORS = ['blue', 'purple', 'teal', 'orange', 'pink', 'green', 'amber', 'slate'] as const;
export type TileColor = (typeof TILE_COLORS)[number];

export const TILE_CLASSES: Record<TileColor, { solid: string; subtle: string; ink: string }> = {
  orange: { solid: 'bg-tile-orange', subtle: 'bg-tile-orange-subtle', ink: 'text-tile-orange-ink' },
  green: { solid: 'bg-tile-green', subtle: 'bg-tile-green-subtle', ink: 'text-tile-green-ink' },
  purple: { solid: 'bg-tile-purple', subtle: 'bg-tile-purple-subtle', ink: 'text-tile-purple-ink' },
  blue: { solid: 'bg-tile-blue', subtle: 'bg-tile-blue-subtle', ink: 'text-tile-blue-ink' },
  pink: { solid: 'bg-tile-pink', subtle: 'bg-tile-pink-subtle', ink: 'text-tile-pink-ink' },
  teal: { solid: 'bg-tile-teal', subtle: 'bg-tile-teal-subtle', ink: 'text-tile-teal-ink' },
  amber: { solid: 'bg-tile-amber', subtle: 'bg-tile-amber-subtle', ink: 'text-tile-amber-ink' },
  slate: { solid: 'bg-tile-slate', subtle: 'bg-tile-slate-subtle', ink: 'text-tile-slate-ink' },
};

export function tileColorFor(id: string): TileColor {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length]!;
}

export const DOC_STATUS_CLASSES: Record<DocumentStatus, { dot: string; subtle: string; ink: string }> = {
  pending: { dot: 'bg-doc-pending', subtle: 'bg-doc-pending-subtle', ink: 'text-doc-pending-ink' },
  processing: { dot: 'bg-doc-processing', subtle: 'bg-doc-processing-subtle', ink: 'text-doc-processing-ink' },
  ready: { dot: 'bg-doc-ready', subtle: 'bg-doc-ready-subtle', ink: 'text-doc-ready-ink' },
  failed: { dot: 'bg-doc-failed', subtle: 'bg-doc-failed-subtle', ink: 'text-doc-failed-ink' },
};
