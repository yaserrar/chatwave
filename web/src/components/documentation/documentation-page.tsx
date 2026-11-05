import { Book1, Brush2, Cpu, Data, DocumentUpload, Lock1, MessageQuestion, TickCircle, Timer1 } from 'iconsax-react';
import { PageHeader } from '~/components/layout/page-header';
import { cn } from '~/lib/utils';
import { ArchitectureDiagram, ErDiagram, LayerFlow, Pipeline, StatusMachine } from './diagrams';
import { C, Callout, CodeBlock, DocSection, DocSubheading, InfoTile, MethodBadge, Prose, TableOfContents, type TocItem } from './doc-ui';
import { BACKEND_FOLDERS, ENDPOINT_GROUPS, ENV_VARS, FRONTEND_FOLDERS, GLOSSARY, MIGRATIONS, ROADMAP, TABLES, type TableDoc } from './docs-data';

const TOC: TocItem[] = [
  { id: 'overview', label: 'What Chatwave is' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'lifecycle', label: 'A request, end to end' },
  { id: 'database', label: 'Database' },
  { id: 'ingestion', label: 'Uploading & processing' },
  { id: 'rag', label: 'How an answer is made' },
  { id: 'api', label: 'API reference' },
  { id: 'frontend', label: 'Frontend' },
  { id: 'backend', label: 'Backend' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'roadmap', label: 'Status & next steps' },
];

/** In-app documentation: how the whole app works, front to back. */
export function DocumentationPage() {
  return (
    <div className="flex w-full gap-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <article className="flex min-w-0 flex-1 flex-col gap-12">
        <PageHeader
          eyebrow="Documentation"
          title="How Chatwave works"
          description="Front to back: the architecture, every table, how documents become searchable and how an answer is made. Each part names the file that does it."
        />
        <Overview />
        <Architecture />
        <Lifecycle />
        <Database />
        <Ingestion />
        <Rag />
        <ApiReference />
        <Frontend />
        <Backend />
        <Configuration />
        <Glossary />
        <Roadmap />
      </article>
      <aside className="hidden w-52 shrink-0 xl:block">
        <div className="sticky top-6">
          <TableOfContents items={TOC} />
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── 01 Overview ───────────────────────── */

function Overview() {
  return (
    <DocSection
      id="overview"
      index={1}
      eyebrow="Overview"
      title="What Chatwave is"
      intro={
        <>
          Chatwave lets you create <strong className="text-foreground">projects</strong>, upload documents into each one, and chat with
          them. Answers come only from that project’s documents and always say which file and page they used. It is
          a <strong className="text-foreground">RAG</strong> app: Retrieval-Augmented Generation.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoTile icon={Lock1} title="Isolated projects" tone="brand">
          Every search is filtered by project. One supplier’s manuals never leak into another’s answers.
        </InfoTile>
        <InfoTile icon={DocumentUpload} title="Background processing">
          Uploads return instantly; reading, chunking and embedding run afterwards with live statuses.
        </InfoTile>
        <InfoTile icon={MessageQuestion} title="Cited answers">
          Claude answers only from the retrieved passages and the app lists the file and page of each source.
        </InfoTile>
        <InfoTile icon={TickCircle} title="Clean deletion">
          Deleting a document or project removes its rows, its chunks and its files, so answers match what you see.
        </InfoTile>
      </div>
      <DocSubheading>The three flows</DocSubheading>
      <div className="grid gap-3 lg:grid-cols-3">
        {[
          { n: '1', title: 'Create a project', text: 'POST /api/projects → one row in projects.' },
          { n: '2', title: 'Upload documents', text: 'POST …/documents → file to S3, row "pending", background task makes chunks + vectors.' },
          { n: '3', title: 'Ask a question', text: 'POST /api/conversations/{id}/ask → search the chunks, Claude answers, both messages saved.' },
        ].map((flow) => (
          <div key={flow.n} className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <span className="font-mono text-2xl font-medium text-brand-ink">{flow.n}</span>
            <div className="flex flex-col gap-1">
              <span className="text-h3 text-foreground">{flow.title}</span>
              <span className="text-[13px] leading-5 text-muted-foreground">{flow.text}</span>
            </div>
          </div>
        ))}
      </div>
    </DocSection>
  );
}

/* ───────────────────────── 02 Architecture ───────────────────────── */

function Architecture() {
  return (
    <DocSection
      id="architecture"
      index={2}
      eyebrow="Big picture"
      title="Architecture"
      intro="Three programs run on your machine: the web app, the API and the database. Files live in a private Amazon S3 bucket, and the API calls two AI services."
    >
      <ArchitectureDiagram />
      <div className="grid gap-3 lg:grid-cols-2">
        <StackTable
          title="Frontend · web/"
          rows={[
            ['UI', 'React 19, TypeScript, Vite'],
            ['Routing', 'TanStack Router (file routes)'],
            ['Server state', 'TanStack Query (cache, polling, optimistic updates)'],
            ['Forms', 'react-hook-form + Zod'],
            ['Design', 'Tailwind v4, shadcn/ui, iconsax (Bulk)'],
            ['Answers', 'react-markdown + remark-gfm'],
          ]}
        />
        <StackTable
          title="Backend · api/"
          rows={[
            ['HTTP', 'FastAPI on uvicorn (async)'],
            ['Validation', 'Pydantic v2 schemas, pydantic-settings'],
            ['Database', 'SQLAlchemy 2 (async) + asyncpg, Alembic'],
            ['Vectors', 'PostgreSQL 16 + pgvector 0.8.1'],
            ['Storage', 'Amazon S3 via boto3, presigned links'],
            ['Text', 'pypdf (PDF), UTF-8 decode for MD/TXT'],
            ['AI', 'OpenAI embeddings, Claude (anthropic SDK)'],
          ]}
        />
      </div>
      <Callout kind="tip" title="Why the Vite proxy">
        The browser only ever calls its own origin (<C>localhost:5173/api/…</C>). Vite forwards those requests to the API
        (<C>vite.config.ts</C>), so there is no CORS to deal with in development and no API URL in the frontend code.
      </Callout>
    </DocSection>
  );
}

function StackTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <p className="border-b bg-subtle px-4 py-2 font-mono text-xs font-medium text-foreground">{title}</p>
      <dl className="divide-y divide-hairline">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2 text-[13px]">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ───────────────────────── 03 Lifecycle ───────────────────────── */

function Lifecycle() {
  return (
    <DocSection
      id="lifecycle"
      index={3}
      eyebrow="Layers"
      title="A request, end to end"
      intro="Every action follows the same path through the layers. Each layer only talks to the one next to it, which keeps every file small and easy to change."
    >
      <DocSubheading>In the browser</DocSubheading>
      <LayerFlow
        steps={[
          { title: 'Component', detail: 'A button calls a hook, e.g. createProject.mutateAsync(body). No fetch in components.' },
          { title: 'Hook', detail: 'hooks/projects.ts: React Query caches the result and refreshes related lists.' },
          { title: 'Service', detail: 'services/api/projects.ts: builds the URL and body for one endpoint.' },
          { title: 'Client', detail: 'services/api/client.ts: fetch, JSON, and FastAPI errors turned into ApiError.' },
        ]}
      />
      <DocSubheading>In the API</DocSubheading>
      <LayerFlow
        steps={[
          { title: 'Router', detail: 'app/routers/*.py matches the path; Pydantic validates the body (422 if wrong).' },
          { title: 'Dependency', detail: 'Depends(get_session) opens one database session for this request.' },
          { title: 'Service / query', detail: 'Simple CRUD stays in the router; real work (RAG, ingestion) lives in services/.' },
          { title: 'Response', detail: 'The ORM object goes through response_model (from_attributes) and becomes JSON.' },
        ]}
      />
      <CodeBlock label="Example: creating a project">{`ProjectFormDialog  →  useCreateProject().mutateAsync({ name, description })
  →  projectsApi.create()  →  POST /api/projects   (Vite proxy → :8001)
  →  routers/projects.py: create_project(payload: ProjectCreate, session)
  →  session.add(Project(...)); await session.commit(); await session.refresh(project)
  ←  201 ProjectRead JSON  ←  React Query updates the list  ←  the sidebar and cards re-render`}</CodeBlock>
    </DocSection>
  );
}

/* ───────────────────────── 04 Database ───────────────────────── */

function Database() {
  return (
    <DocSection
      id="database"
      index={4}
      eyebrow="PostgreSQL + pgvector"
      title="Database"
      intro="Five tables. Everything hangs off projects, and every relation deletes in cascade: delete a project and its documents, chunks, conversations and messages go with it."
    >
      <ErDiagram />
      <div className="grid gap-4 xl:grid-cols-2">
        {TABLES.map((table) => (
          <TableCard key={table.name} table={table} />
        ))}
      </div>
      <DocSubheading>Migrations</DocSubheading>
      <Prose>
        <p>
          Tables are never created by hand. The SQLAlchemy models are the source of truth; Alembic compares them with the
          database and writes a migration (<C>alembic revision --autogenerate</C>), which is read, then applied
          (<C>alembic upgrade head</C>). The database remembers its position in the <C>alembic_version</C> table.
        </p>
      </Prose>
      <ol className="flex max-w-3xl flex-col divide-y divide-hairline overflow-hidden rounded-xl border bg-card shadow-xs">
        {MIGRATIONS.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
            <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
            <span className="font-mono text-xs text-brand-ink">{m.id}</span>
            <span className="text-foreground">{m.title}</span>
            {i === MIGRATIONS.length - 1 ? <span className="ml-auto rounded-full bg-success-subtle px-2 py-0.5 text-[11px] font-medium text-success">head</span> : null}
          </li>
        ))}
      </ol>
      <Callout kind="info" title="Why chunks has its own project_id">
        Search needs “chunks of this project” on every question. Storing <C>project_id</C> on each chunk (indexed) makes that a
        direct filter instead of a join through documents, and it is what guarantees projects stay isolated.
      </Callout>
    </DocSection>
  );
}

function TableCard({ table }: { table: TableDoc }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-col gap-1 border-b bg-subtle px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">{table.name}</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">{table.model}</span>
        </div>
        <p className="text-[13px] leading-5 text-ink-2">{table.purpose}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr className="border-b text-[11px] text-muted-foreground">
              <th className="px-4 py-1.5 font-medium">Column</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-4 py-1.5 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {table.columns.map((col) => (
              <tr key={col.name} className="align-top">
                <td className="px-4 py-2 font-mono whitespace-nowrap text-foreground">
                  {col.key ? (
                    <span className={cn('mr-1.5 text-[10px] font-bold', col.key === 'PK' ? 'text-warning' : 'text-brand-ink')}>{col.key}</span>
                  ) : null}
                  {col.name}
                  {col.nullable ? <span className="text-muted-foreground">?</span> : null}
                </td>
                <td className="px-2 py-2 font-mono whitespace-nowrap text-muted-foreground">{col.type}</td>
                <td className="px-4 py-2 leading-5 text-ink-2">{col.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-auto border-t px-4 py-2 font-mono text-[11px] text-muted-foreground">
        Indexes: {table.indexes.join(' · ')} — <span className="text-foreground">?</span> = can be NULL
      </p>
    </div>
  );
}

/* ───────────────────────── 05 Ingestion ───────────────────────── */

function Ingestion() {
  return (
    <DocSection
      id="ingestion"
      index={5}
      eyebrow="Upload → searchable"
      title="Uploading & processing"
      intro="The upload request only stores the file. Turning it into searchable chunks happens after the response is sent, in a FastAPI background task."
    >
      <Pipeline
        steps={[
          {
            title: 'Check in the browser',
            where: 'web · schemas/document.ts',
            detail: 'Zod rejects anything that is not .pdf / .md / .txt, empty, or over 10 MB, before any request is sent.',
          },
          {
            title: 'Validate and store',
            where: 'routers/documents.py · create_document',
            detail: (
              <>
                The API checks the same rules again (400 if wrong), uploads the bytes to S3 at
                <C>projects/&lt;project_id&gt;/&lt;document_id&gt;.ext</C> (<C>storage.upload_file</C>, in a thread), and only then
                inserts the row with status <C>pending</C> and returns <C>201</C>. If S3 fails, no row is created (502).
              </>
            ),
          },
          {
            title: 'Start the background task',
            where: 'background_tasks.add_task(process_document, id)',
            detail: 'FastAPI runs it after the response. It opens its own session: the request’s one is already closed.',
          },
          {
            title: 'Download and extract the text',
            where: 'storage.download_file · extraction.py · extract_pages',
            detail: (
              <>
                The file’s bytes come back from S3, then: PDF with <C>pypdf</C> (through <C>BytesIO</C>), page by page, empty pages
                skipped; MD/TXT decoded as UTF-8, the whole file as page 1. Both run in <C>asyncio.to_thread</C> so the API keeps
                answering. No text at all (a scanned PDF) raises an error.
              </>
            ),
          },
          {
            title: 'Split into chunks',
            where: 'services/chunking.py · chunk_pages',
            detail: '2000-character windows with a 200-character overlap, cut on spaces so no word is split. A chunk never spans two pages, so its page number stays exact.',
          },
          {
            title: 'Embed',
            where: 'services/embeddings.py · embed_texts',
            detail: 'OpenAI text-embedding-3-small, 100 chunks per request. Each chunk becomes 1536 numbers.',
          },
          {
            title: 'Save and finish',
            where: 'services/ingestion.py · process_document',
            detail: (
              <>
                Old chunks of the document are deleted, the new ones inserted, <C>page_count</C> set, status <C>ready</C>. Any error
                rolls back the half-saved chunks and sets <C>failed</C> with the message in <C>error_message</C>.
              </>
            ),
          },
        ]}
      />
      <DocSubheading>Document statuses</DocSubheading>
      <StatusMachine />
      <DocSubheading>Preview and download</DocSubheading>
      <Pipeline
        steps={[
          {
            title: 'Ask the API for a link',
            where: 'GET …/documents/{id}/url?download=false|true',
            detail: 'The API finds the document (both ids must match, so a project never gets another project’s file) and signs a link.',
          },
          {
            title: 'A presigned S3 link',
            where: 'services/storage.py · presigned_url',
            detail: (
              <>
                Valid 5 minutes (<C>PRESIGNED_URL_EXPIRES</C>). S3 applies two overrides when it is opened: <C>inline</C> or
                <C>attachment; filename*=UTF-8''…</C> (the original name, accents kept), and the content type (<C>.md</C> and
                <C>.txt</C> as <C>text/plain; charset=utf-8</C>). Signing is local: no call to AWS.
              </>
            ),
          },
          {
            title: 'The browser reads S3 directly',
            where: 'web · document-preview.tsx',
            detail:
              'PDF in an iframe (the browser’s own viewer), Markdown fetched as text and rendered, text shown as is. The file never goes through the API. A link is refreshed before it expires.',
          },
        ]}
      />
      <Callout kind="tip" title="Why the bucket is private, with a CORS rule">
        Public access stays blocked: the only way to read a file is a link the API signed for that one file, a few minutes long.
        The bucket’s CORS rule allows <C>GET</C> from <C>http://localhost:5173</C>, because the Markdown and text previews fetch the
        file from the browser. The API’s AWS user can only put, get, delete and list in this one bucket.
      </Callout>
    </DocSection>
  );
}

/* ───────────────────────── 06 RAG ───────────────────────── */

function Rag() {
  return (
    <DocSection
      id="rag"
      index={6}
      eyebrow="Retrieval-Augmented Generation"
      title="How an answer is made"
      intro={
        <>
          All in <C>app/services/rag.py → answer_question</C>, called by <C>POST /api/conversations/&#123;id&#125;/ask</C>. One
          question takes about 5–15 seconds, mostly Claude writing.
        </>
      }
    >
      <Pipeline
        steps={[
          { title: 'Load the recent history', where: 'load_history', detail: 'The last 6 messages (3 questions + 3 answers), oldest first, starting with a user message as Claude requires.' },
          { title: 'Save the question', where: 'messages · role "user"', detail: 'Committed first, so the question is kept even if the AI step fails.' },
          { title: 'Embed the question', where: 'embed_query', detail: 'The same OpenAI model as the chunks, so both live in the same vector space.' },
          {
            title: 'Search this project’s chunks',
            where: 'search_chunks',
            detail: 'pgvector orders chunks by cosine distance to the question and keeps the 5 closest, only from this project and only from ready documents.',
          },
          { title: 'Build the prompt', where: 'build_context · SYSTEM_PROMPT', detail: 'Fixed rules in the system prompt; numbered passages + the question in the last user message.' },
          { title: 'Ask Claude', where: 'services/llm.py · generate_answer', detail: 'claude-opus-5-5, effort “medium”, with the server-side fallback turned on in case a request is declined.' },
          {
            title: 'Keep the cited sources and save',
            where: 'cited_sources',
            detail: 'Reads the [1], [2] markers in the answer and keeps those passages’ file and page, without duplicates. No citation means no sources. The answer is saved; the first question becomes the title.',
          },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <CodeBlock label="The vector search (SQL generated by search_chunks)">{`SELECT chunks.content, chunks.page_number,
       chunks.document_id, documents.filename
FROM chunks
JOIN documents ON documents.id = chunks.document_id
WHERE chunks.project_id = :project_id      -- isolation
  AND documents.status = 'ready'
ORDER BY chunks.embedding <=> :question_vector  -- cosine distance
LIMIT 5;`}</CodeBlock>
        <CodeBlock label="What Claude receives (last user message)">{`<context>
[1] (manual.md, page 1)
The main pump needs maintenance every 2000 hours…

[2] (contract.pdf, page 4)
The warranty covers parts for 24 months…
</context>

Question: How often must the pump be serviced?`}</CodeBlock>
      </div>
      <CodeBlock label="SYSTEM_PROMPT (rag.py)">{`You answer questions about the documents of one project.

Rules:
- Use only the numbered passages inside <context>. Do not use outside knowledge.
- If the passages do not contain the answer, say that you could not find it in this project's documents.
- After each fact, cite the passage it comes from, like [1] or [2][3].
- Answer in the same language as the question. Be clear and concise.`}</CodeBlock>
      <Callout kind="tip" title="Why the passages go in the user message, not the system prompt">
        The system prompt never changes, so it stays a clean set of rules (and could be cached). The passages change with every
        question, so they travel with that question. The history keeps only the plain questions and answers, not old passages.
      </Callout>
      <Callout kind="info" title="Two AI providers, two jobs">
        Claude has no embedding model, so vectors come from OpenAI and answers from Claude. They never need to match: only the
        question and the chunks must use the same embedding model.
      </Callout>
    </DocSection>
  );
}

/* ───────────────────────── 07 API ───────────────────────── */

function ApiReference() {
  return (
    <DocSection
      id="api"
      index={7}
      eyebrow="FastAPI · /api"
      title="API reference"
      intro={
        <>
          15 endpoints, all under <C>/api</C>. The interactive version is FastAPI’s own <C>/docs</C> page on the API server. Errors
          always come back as <C>{'{"detail": …}'}</C>; the web app shows that text in its messages.
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {ENDPOINT_GROUPS.map((group) => (
          <div key={group.title} className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b bg-subtle px-4 py-2.5">
              <span className="text-h3 text-foreground">{group.title}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{group.file}</span>
            </div>
            <ul className="divide-y divide-hairline">
              {group.endpoints.map((e) => (
                <li key={e.method + e.path} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <MethodBadge method={e.method} />
                    <span className="truncate font-mono text-[12.5px] text-foreground" title={e.path}>
                      {e.path}
                    </span>
                  </div>
                  <p className="text-[13px] text-ink-2">{e.summary}</p>
                  <dl className="grid gap-x-4 gap-y-1 font-mono text-[11.5px] sm:grid-cols-[5rem_minmax(0,1fr)]">
                    {e.request ? (
                      <>
                        <dt className="text-muted-foreground">request</dt>
                        <dd className="text-foreground">{e.request}</dd>
                      </>
                    ) : null}
                    <dt className="text-muted-foreground">response</dt>
                    <dd className="text-foreground">{e.response}</dd>
                    {e.errors ? (
                      <>
                        <dt className="text-muted-foreground">errors</dt>
                        <dd className="text-danger">{e.errors}</dd>
                      </>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DocSection>
  );
}

/* ───────────────────────── 08 Frontend ───────────────────────── */

function Frontend() {
  return (
    <DocSection
      id="frontend"
      index={8}
      eyebrow="web/"
      title="Frontend"
      intro="A single-page app. Routes are files, server data lives in React Query’s cache, and components never call fetch themselves."
    >
      <FolderTable rows={FRONTEND_FOLDERS} />
      <DocSubheading>Pages</DocSubheading>
      <div className="grid gap-3 md:grid-cols-3">
        <InfoTile icon={Book1} title="/">Projects overview: cards with document counts, create, edit, delete.</InfoTile>
        <InfoTile icon={Data} title="/projects/$projectId">Documents panel (upload, statuses, details, preview, download) and the chat panel.</InfoTile>
        <InfoTile icon={Cpu} title="/documentation">This page.</InfoTile>
      </div>
      <DocSubheading>How data stays fresh</DocSubheading>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoTile icon={Timer1} title="Polling while processing">
          useDocuments refetches every 4 s while any document is pending or processing, then stops by itself.
        </InfoTile>
        <InfoTile icon={MessageQuestion} title="Optimistic questions">
          useAsk adds your question to the cache at once, then streams the answer into a draft message that grows word by word; on error it rolls back and puts your text back.
        </InfoTile>
        <InfoTile icon={Data} title="Query keys">
          lib/query-keys.ts: ['projects', …], ['documents', projectId, …], ['conversations', projectId, …], ['messages', id].
        </InfoTile>
        <InfoTile icon={Brush2} title="Theme">
          Light / dark / system, saved in localStorage and applied before the first paint by a script in index.html.
        </InfoTile>
      </div>
    </DocSection>
  );
}

function FolderTable({ rows }: { rows: { path: string; role: string }[] }) {
  return (
    <div className="max-w-4xl overflow-hidden rounded-xl border bg-card shadow-xs">
      <dl className="divide-y divide-hairline">
        {rows.map((r) => (
          <div key={r.path} className="grid gap-1 px-4 py-2.5 text-[13px] sm:grid-cols-[15rem_minmax(0,1fr)] sm:gap-4">
            <dt className="font-mono text-[12px] text-brand-ink">{r.path}</dt>
            <dd className="text-ink-2">{r.role}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ───────────────────────── 09 Backend ───────────────────────── */

function Backend() {
  return (
    <DocSection
      id="backend"
      index={9}
      eyebrow="api/"
      title="Backend"
      intro="Routers handle HTTP, services do the work, models describe tables, schemas describe what goes in and out."
    >
      <FolderTable rows={BACKEND_FOLDERS} />
      <div className="grid gap-4 xl:grid-cols-2">
        <CodeBlock label="One session per request (core/db.py)">{`async def get_session():
    async with SessionLocal() as session:
        yield session          # closed after the response

# expire_on_commit=False: objects stay readable after commit,
# so an endpoint can return them directly.`}</CodeBlock>
        <CodeBlock label="Model vs schema">{`# models/document.py → the table (has storage_path)
class Document(Base): ...

# schemas/document.py → the response (no storage_path)
class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)`}</CodeBlock>
      </div>
      <Callout kind="warning" title="Order of deletes">
        Deleting a document or a project first commits the database change, then removes the files from S3 (a project’s whole
        projects/&lt;id&gt;/ folder at once). If the commit failed, the files are still there and nothing is broken; the other order
        could leave rows pointing to missing files. If S3 fails after the commit, the error is logged and the client still gets 204.
      </Callout>
    </DocSection>
  );
}

/* ───────────────────────── 10 Configuration ───────────────────────── */

function Configuration() {
  return (
    <DocSection
      id="configuration"
      index={10}
      eyebrow="Settings & running"
      title="Configuration"
      intro={
        <>
          The API reads everything from <C>api/.env</C> through <C>app/core/config.py</C>. A missing or invalid required value stops
          the API at startup with a clear message. Keys are never committed (<C>.env</C> is git-ignored).
        </>
      }
    >
      <div className="max-w-4xl overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b bg-subtle text-[11px] text-muted-foreground">
              <th className="px-4 py-2 font-medium">Variable</th>
              <th className="px-2 py-2 font-medium">File</th>
              <th className="px-4 py-2 font-medium">What it does</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {ENV_VARS.map((v) => (
              <tr key={v.name} className="align-top">
                <td className="px-4 py-2 font-mono text-[12px] whitespace-nowrap text-foreground">
                  {v.name}
                  {v.required ? <span className="ml-1.5 text-[10px] font-bold text-danger">required</span> : null}
                </td>
                <td className="px-2 py-2 font-mono text-[12px] whitespace-nowrap text-muted-foreground">{v.where}</td>
                <td className="px-4 py-2 leading-5 text-ink-2">{v.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CodeBlock label="Run everything (three terminals)">{`# 1. Database: Homebrew PostgreSQL 16 on port 5433 (must be running)
#    Files: the S3 bucket and its key in api/.env (AWS_*, S3_BUCKET)

# 2. API, from api/
source env/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --port 8001     # http://localhost:8001/docs

# 3. Web app, from web/   (web/.env: API_URL=http://localhost:8001)
npm run dev                                    # http://localhost:5173`}</CodeBlock>
    </DocSection>
  );
}

/* ───────────────────────── 11 Glossary ───────────────────────── */

function Glossary() {
  return (
    <DocSection id="glossary" index={11} eyebrow="Words" title="Glossary">
      <dl className="grid max-w-4xl gap-x-8 gap-y-4 sm:grid-cols-2">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="flex flex-col gap-1">
            <dt className="text-h3 text-foreground">{g.term}</dt>
            <dd className="text-[13px] leading-5 text-muted-foreground">{g.definition}</dd>
          </div>
        ))}
      </dl>
    </DocSection>
  );
}

/* ───────────────────────── 12 Roadmap ───────────────────────── */

function Roadmap() {
  return (
    <DocSection id="roadmap" index={12} eyebrow="Milestones" title="Status & next steps">
      <ol className="flex max-w-3xl flex-col divide-y divide-hairline overflow-hidden rounded-xl border bg-card shadow-xs">
        {ROADMAP.map((item, i) => (
          <li key={item.title} className="flex items-center gap-3 px-4 py-3 text-[13px]">
            <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
            <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.title}</span>
            <span
              className={cn(
                'ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                item.done ? 'bg-success-subtle text-success' : 'bg-muted text-muted-foreground',
              )}
            >
              {item.done ? 'Done' : i === ROADMAP.findIndex((r) => !r.done) ? 'Next' : 'Later'}
            </span>
          </li>
        ))}
      </ol>
    </DocSection>
  );
}
