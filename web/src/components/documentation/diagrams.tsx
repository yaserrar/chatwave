import * as React from 'react';
import { ArrowDown, ArrowRight, Cloud, Cpu, Data, Folder2, Global, MagicStar, type Icon } from 'iconsax-react';
import { cn } from '~/lib/utils';

/* ───────────────────────── Architecture ───────────────────────── */

function Node({
  icon: IconComponent,
  title,
  subtitle,
  items,
  tone = 'neutral',
  className,
}: {
  icon: Icon;
  title: string;
  subtitle: string;
  items?: string[];
  tone?: 'neutral' | 'brand' | 'external';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs',
        tone === 'brand' && 'border-brand/40 ring-1 ring-brand/15',
        tone === 'external' && 'border-dashed bg-surface',
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            tone === 'brand' ? 'bg-brand-subtle text-brand-ink' : 'border bg-surface text-ink-2',
          )}
        >
          <IconComponent aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-h3 text-foreground">{title}</span>
          <span className="font-mono text-[11px] leading-4 text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      {items ? (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item} className="rounded-md border bg-surface px-2 py-1 font-mono text-[11px] text-ink-2">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** An arrow with a label between two nodes: horizontal on large screens, vertical when stacked. */
function Connector({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-1 py-1 text-center lg:w-28">
      <span className="font-mono text-[11px] font-medium text-brand-ink">{label}</span>
      <ArrowDown aria-hidden className="size-4 text-muted-foreground lg:hidden" />
      <ArrowRight aria-hidden className="hidden size-4 text-muted-foreground lg:block" />
      {detail ? <span className="text-[11px] leading-4 text-muted-foreground">{detail}</span> : null}
    </div>
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="flex flex-col gap-4 rounded-2xl border bg-subtle/60 p-4 sm:p-5">
      <div className="flex flex-col items-stretch lg:flex-row">
        <Node
          icon={Global}
          title="Web app"
          subtitle="React 19 · Vite · :5173"
          items={['components', 'hooks (React Query)', 'services/api → fetch']}
        />
        <Connector label="/api/*" detail="Vite proxy, same origin" />
        <Node
          icon={Cpu}
          title="API"
          subtitle="FastAPI · uvicorn · :8001"
          tone="brand"
          items={['routers (HTTP)', 'services (the work)', 'models (SQLAlchemy)']}
        />
        <Connector label="SQL" detail="async SQLAlchemy + asyncpg" />
        <Node
          icon={Data}
          title="Database"
          subtitle="PostgreSQL 16 · :5433"
          items={['5 tables', 'pgvector 0.8.1', 'Alembic migrations']}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Node icon={Folder2} title="File storage" subtitle="api/uploads/<project_id>/" tone="external" />
        <Node icon={Cloud} title="OpenAI" subtitle="text-embedding-3-small" tone="external" />
        <Node icon={MagicStar} title="Claude" subtitle="claude-opus-5-5 · answers" tone="external" />
      </div>
      <figcaption className="text-xs text-muted-foreground">
        Solid boxes are your code and database; dashed boxes are the disk and the two AI providers the API calls.
      </figcaption>
    </figure>
  );
}

/* ───────────────────────── Request flow (layers) ───────────────────────── */

export function LayerFlow({ steps }: { steps: { title: string; detail: string }[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex flex-col gap-1 rounded-xl border bg-card p-3.5 shadow-xs">
          <span className="font-mono text-[11px] text-brand-ink">{String(i + 1).padStart(2, '0')}</span>
          <span className="text-h3 text-foreground">{step.title}</span>
          <span className="text-[13px] leading-5 text-muted-foreground">{step.detail}</span>
        </li>
      ))}
    </ol>
  );
}

/* ───────────────────────── Entity relationship (SVG) ───────────────────────── */

type ErBox = { name: string; x: number; y: number; rows: { label: string; type: string; key?: 'PK' | 'FK' }[] };

const W = 200;
const ROW = 22;
const HEAD = 30;

const ER_BOXES: ErBox[] = [
  {
    name: 'projects',
    x: 20,
    y: 150,
    rows: [
      { label: 'id', type: 'uuid', key: 'PK' },
      { label: 'name', type: 'varchar' },
      { label: 'description', type: 'text' },
    ],
  },
  {
    name: 'documents',
    x: 310,
    y: 40,
    rows: [
      { label: 'id', type: 'uuid', key: 'PK' },
      { label: 'project_id', type: 'uuid', key: 'FK' },
      { label: 'filename', type: 'varchar' },
      { label: 'status', type: 'varchar' },
    ],
  },
  {
    name: 'chunks',
    x: 600,
    y: 40,
    rows: [
      { label: 'id', type: 'int', key: 'PK' },
      { label: 'document_id', type: 'uuid', key: 'FK' },
      { label: 'project_id', type: 'uuid', key: 'FK' },
      { label: 'embedding', type: 'vector(1536)' },
    ],
  },
  {
    name: 'conversations',
    x: 310,
    y: 268,
    rows: [
      { label: 'id', type: 'uuid', key: 'PK' },
      { label: 'project_id', type: 'uuid', key: 'FK' },
      { label: 'title', type: 'varchar' },
    ],
  },
  {
    name: 'messages',
    x: 600,
    y: 268,
    rows: [
      { label: 'id', type: 'uuid', key: 'PK' },
      { label: 'conversation_id', type: 'uuid', key: 'FK' },
      { label: 'role', type: 'varchar' },
      { label: 'sources', type: 'jsonb' },
    ],
  },
];

const boxHeight = (b: ErBox) => HEAD + b.rows.length * ROW + 8;
const box = (name: string) => ER_BOXES.find((b) => b.name === name)!;

function Relation({ d, one, many, dashed = false }: { d: string; one: [number, number]; many: [number, number]; dashed?: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray={dashed ? '5 4' : undefined} />
      <text x={one[0]} y={one[1]} fontSize={11} fontFamily="var(--font-mono)" fill="var(--brand-ink)">
        1
      </text>
      <text x={many[0]} y={many[1]} fontSize={11} fontFamily="var(--font-mono)" fill="var(--brand-ink)">
        N
      </text>
    </g>
  );
}

export function ErDiagram() {
  const p = box('projects');
  const d = box('documents');
  const c = box('chunks');
  const cv = box('conversations');
  const m = box('messages');
  const pMid = p.y + boxHeight(p) / 2;

  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl border bg-subtle/60 p-3">
        <svg viewBox="0 0 820 404" role="img" aria-labelledby="er-title er-desc" className="min-w-[640px]">
          <title id="er-title">Database tables and relations</title>
          <desc id="er-desc">
            A project has many documents and many conversations. A document has many chunks. A conversation has many
            messages. Chunks also point directly to their project. Every relation deletes in cascade.
          </desc>

          {/* projects → documents */}
          <Relation d={`M ${p.x + W} ${pMid - 20} C 260 ${pMid - 20}, 260 ${d.y + 60}, ${d.x} ${d.y + 60}`} one={[p.x + W + 6, pMid - 26]} many={[d.x - 14, d.y + 54]} />
          {/* projects → conversations */}
          <Relation d={`M ${p.x + W} ${pMid + 20} C 260 ${pMid + 20}, 260 ${cv.y + 60}, ${cv.x} ${cv.y + 60}`} one={[p.x + W + 6, pMid + 34]} many={[cv.x - 14, cv.y + 54]} />
          {/* documents → chunks */}
          <Relation d={`M ${d.x + W} ${d.y + 60} L ${c.x} ${c.y + 60}`} one={[d.x + W + 6, d.y + 54]} many={[c.x - 14, c.y + 54]} />
          {/* conversations → messages */}
          <Relation d={`M ${cv.x + W} ${cv.y + 60} L ${m.x} ${m.y + 60}`} one={[cv.x + W + 6, cv.y + 54]} many={[m.x - 14, m.y + 54]} />
          {/* projects → chunks (shortcut for filtering) */}
          <Relation d={`M ${p.x + W / 2} ${p.y} L ${p.x + W / 2} 16 L ${c.x + W / 2} 16 L ${c.x + W / 2} ${c.y}`} one={[p.x + W / 2 + 6, p.y - 8]} many={[c.x + W / 2 + 6, c.y - 8]} dashed />
          <text x={410} y={11} textAnchor="middle" fontSize={10.5} fill="var(--muted-foreground)">
            chunks.project_id — lets the search filter by project without a join
          </text>

          {ER_BOXES.map((b) => (
            <g key={b.name}>
              <rect x={b.x} y={b.y} width={W} height={boxHeight(b)} rx={10} fill="var(--card)" stroke="var(--border)" />
              <rect x={b.x} y={b.y} width={W} height={HEAD} rx={10} fill="var(--subtle)" />
              <rect x={b.x} y={b.y + HEAD - 10} width={W} height={10} fill="var(--subtle)" />
              <line x1={b.x} x2={b.x + W} y1={b.y + HEAD} y2={b.y + HEAD} stroke="var(--border)" />
              <text x={b.x + 12} y={b.y + 20} fontSize={13} fontWeight={600} fontFamily="var(--font-mono)" fill="var(--foreground)">
                {b.name}
              </text>
              {b.rows.map((r, i) => {
                const y = b.y + HEAD + 18 + i * ROW;
                return (
                  <g key={r.label}>
                    {r.key ? (
                      <text x={b.x + 12} y={y} fontSize={9.5} fontWeight={700} fontFamily="var(--font-mono)" fill={r.key === 'PK' ? 'var(--warning)' : 'var(--brand-ink)'}>
                        {r.key}
                      </text>
                    ) : null}
                    <text x={b.x + 36} y={y} fontSize={11.5} fontFamily="var(--font-mono)" fill="var(--foreground)">
                      {r.label}
                    </text>
                    <text x={b.x + W - 12} y={y} textAnchor="end" fontSize={10.5} fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
                      {r.type}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        1 → N: one row on the left owns many on the right. Every arrow is a foreign key with <span className="font-mono">ON DELETE CASCADE</span>.
        Key columns only; the full columns are in the cards below.
      </figcaption>
    </figure>
  );
}

/* ───────────────────────── Pipelines ───────────────────────── */

export type PipelineStep = { title: string; where: string; detail: React.ReactNode };

/** Numbered vertical timeline: one step per line, with the file that does it. */
export function Pipeline({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="flex max-w-3xl flex-col">
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 ? <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-border" /> : null}
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card font-mono text-[11px] font-semibold text-brand-ink shadow-xs">
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-h3 text-foreground">{step.title}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{step.where}</span>
            </div>
            <div className="text-[13px] leading-relaxed text-ink-2">{step.detail}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Document status machine: pending → processing → ready | failed. */
export function StatusMachine() {
  const chip = (label: string, className: string, detail: string) => (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className={cn('inline-flex h-7 items-center rounded-full px-3 font-mono text-xs font-semibold', className)}>{label}</span>
      <span className="max-w-36 text-[11px] leading-4 text-muted-foreground">{detail}</span>
    </div>
  );
  return (
    <figure className="flex max-w-3xl flex-col gap-3 rounded-2xl border bg-subtle/60 p-4">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-center sm:gap-3">
        {chip('pending', 'bg-doc-pending-subtle text-doc-pending-ink', 'Row created by the upload, file on disk')}
        <ArrowRight aria-hidden className="size-4 rotate-90 text-muted-foreground sm:mt-1.5 sm:rotate-0" />
        {chip('processing', 'bg-doc-processing-subtle text-doc-processing-ink', 'Background task started')}
        <ArrowRight aria-hidden className="size-4 rotate-90 text-muted-foreground sm:mt-1.5 sm:rotate-0" />
        <div className="flex flex-col gap-3">
          {chip('ready', 'bg-doc-ready-subtle text-doc-ready-ink', 'Chunks saved: searchable')}
          {chip('failed', 'bg-doc-failed-subtle text-doc-failed-ink', 'error_message says why')}
        </div>
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">
        The web app refreshes the list every 4 s while any document is pending or processing, then stops.
      </figcaption>
    </figure>
  );
}
