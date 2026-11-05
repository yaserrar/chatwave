/**
 * Facts shown on the documentation page. Taken from the real code and database (Postgres
 * information_schema, FastAPI's /openapi.json, api/app/*). Update them when the code changes.
 */

export type ColumnDoc = { name: string; type: string; key?: 'PK' | 'FK'; nullable?: boolean; note: string };
export type TableDoc = { name: string; model: string; purpose: string; columns: ColumnDoc[]; indexes: string[] };

export const TABLES: TableDoc[] = [
  {
    name: 'projects',
    model: 'app/models/project.py → Project',
    purpose: 'A private knowledge base: it owns documents and conversations. Nothing is ever shared between projects.',
    columns: [
      { name: 'id', type: 'uuid', key: 'PK', note: 'Generated in Python (uuid.uuid4) when the row is created.' },
      { name: 'name', type: 'varchar', note: 'Required. 1–255 characters (checked by Pydantic).' },
      { name: 'description', type: 'text', nullable: true, note: 'Optional free text.' },
      { name: 'created_at', type: 'timestamptz', note: 'Filled by Postgres: DEFAULT now().' },
      { name: 'updated_at', type: 'timestamptz', note: 'DEFAULT now(), refreshed by SQLAlchemy on every update (onupdate).' },
    ],
    indexes: ['projects_pkey (id)'],
  },
  {
    name: 'documents',
    model: 'app/models/document.py → Document',
    purpose: 'One uploaded file. The file itself lives on disk; this row holds its metadata and processing status.',
    columns: [
      { name: 'id', type: 'uuid', key: 'PK', note: 'Also the file name on disk: uploads/<project_id>/<id>.<ext>.' },
      { name: 'project_id', type: 'uuid', key: 'FK', note: '→ projects.id, ON DELETE CASCADE. Indexed.' },
      { name: 'filename', type: 'varchar', note: 'Original name, for display only (never used as a path).' },
      { name: 'mime_type', type: 'varchar', note: 'As sent by the browser, e.g. application/pdf.' },
      { name: 'size', type: 'integer', note: 'In bytes. Max 10 MB (MAX_FILE_SIZE).' },
      { name: 'storage_path', type: 'varchar', note: 'Where the file is on disk. Not exposed by the API.' },
      { name: 'status', type: 'varchar', note: 'pending → processing → ready | failed. Default "pending".' },
      { name: 'error_message', type: 'text', nullable: true, note: 'Why processing failed (shown in the web app).' },
      { name: 'page_count', type: 'integer', nullable: true, note: 'Set when processing succeeds.' },
      { name: 'created_at', type: 'timestamptz', note: 'DEFAULT now().' },
      { name: 'updated_at', type: 'timestamptz', note: 'DEFAULT now(), refreshed on update.' },
    ],
    indexes: ['documents_pkey (id)', 'ix_documents_project_id (project_id)'],
  },
  {
    name: 'chunks',
    model: 'app/models/chunk.py → Chunk',
    purpose: 'A ~2000-character piece of a document with its embedding: the unit the vector search works on.',
    columns: [
      { name: 'id', type: 'integer', key: 'PK', note: 'Auto-increment (SERIAL), unlike the other tables.' },
      { name: 'document_id', type: 'uuid', key: 'FK', note: '→ documents.id, ON DELETE CASCADE. Indexed.' },
      { name: 'project_id', type: 'uuid', key: 'FK', note: '→ projects.id, ON DELETE CASCADE. Indexed. Copied here so search can filter without a join.' },
      { name: 'content', type: 'text', note: 'The chunk’s text, sent to Claude as context.' },
      { name: 'page_number', type: 'integer', nullable: true, note: 'PDF page it came from; 1 for Markdown and text files.' },
      { name: 'chunk_index', type: 'integer', note: 'Position in the document: 0, 1, 2…' },
      { name: 'embedding', type: 'vector(1536)', note: 'pgvector column: the 1536 numbers from text-embedding-3-small.' },
      { name: 'created_at', type: 'timestamptz', note: 'DEFAULT now().' },
      { name: 'updated_at', type: 'timestamptz', note: 'DEFAULT now().' },
    ],
    indexes: ['chunks_pkey (id)', 'ix_chunks_id (id) — duplicates the primary key', 'ix_chunks_document_id', 'ix_chunks_project_id'],
  },
  {
    name: 'conversations',
    model: 'app/models/conversation.py → Conversation',
    purpose: 'A chat thread inside a project. Created on the first question of a new chat.',
    columns: [
      { name: 'id', type: 'uuid', key: 'PK', note: 'uuid.uuid4.' },
      { name: 'project_id', type: 'uuid', key: 'FK', note: '→ projects.id, ON DELETE CASCADE. Indexed.' },
      { name: 'title', type: 'varchar(255)', nullable: true, note: 'Set to the first question (80 characters max).' },
      { name: 'created_at', type: 'timestamptz', note: 'DEFAULT now().' },
      { name: 'updated_at', type: 'timestamptz', note: 'Bumped on every question, so the list is sorted by activity.' },
    ],
    indexes: ['conversations_pkey (id)', 'ix_conversations_project_id (project_id)'],
  },
  {
    name: 'messages',
    model: 'app/models/message.py → Message',
    purpose: 'One question or one answer. Answers carry the sources they cited.',
    columns: [
      { name: 'id', type: 'uuid', key: 'PK', note: 'uuid.uuid4.' },
      { name: 'conversation_id', type: 'uuid', key: 'FK', note: '→ conversations.id, ON DELETE CASCADE. Indexed.' },
      { name: 'role', type: 'varchar(20)', note: '"user" (question) or "assistant" (answer).' },
      { name: 'content', type: 'text', note: 'The text. Answers are Markdown with [1]-style citations.' },
      { name: 'sources', type: 'jsonb', nullable: true, note: 'Answers only: [{document_id, filename, page_number}].' },
      { name: 'created_at', type: 'timestamptz', note: 'DEFAULT now(). Messages are read in this order.' },
    ],
    indexes: ['messages_pkey (id)', 'ix_messages_conversation_id (conversation_id)'],
  },
];

export const MIGRATIONS = [
  { id: '5d09cf59bff3', title: 'create projects table' },
  { id: '49ca0aee660a', title: 'create documents table' },
  { id: 'ed142191aa4c', title: 'enable pgvector (CREATE EXTENSION vector)' },
  { id: '6f38360ca351', title: 'create chunks table' },
  { id: '94e0164a7f3f', title: 'make chunks.page_number nullable' },
  { id: 'f46c00b657e5', title: 'create conversations and messages' },
];

export type EndpointDoc = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  request?: string;
  response: string;
  errors?: string;
};

export const ENDPOINT_GROUPS: { title: string; file: string; endpoints: EndpointDoc[] }[] = [
  {
    title: 'Health',
    file: 'app/routers/health.py',
    endpoints: [{ method: 'GET', path: '/api/health', summary: 'Runs SELECT 1 to check the database.', response: '{"status": "ok", "database": "reachable"}' }],
  },
  {
    title: 'Projects',
    file: 'app/routers/projects.py',
    endpoints: [
      { method: 'GET', path: '/api/projects', summary: 'All projects, newest first.', response: 'ProjectRead[]' },
      { method: 'POST', path: '/api/projects', summary: 'Create a project.', request: '{ name, description? }', response: '201 · ProjectRead', errors: '422 empty or too-long name' },
      { method: 'GET', path: '/api/projects/{project_id}', summary: 'One project.', response: 'ProjectRead', errors: '404' },
      { method: 'PUT', path: '/api/projects/{project_id}', summary: 'Update only the fields sent (UPDATE … RETURNING).', request: '{ name?, description? }', response: 'ProjectRead', errors: '404 · 422' },
      { method: 'DELETE', path: '/api/projects/{project_id}', summary: 'Delete the row (cascades to everything inside), then its files.', response: '204', errors: '404' },
    ],
  },
  {
    title: 'Documents',
    file: 'app/routers/documents.py',
    endpoints: [
      { method: 'GET', path: '/api/projects/{project_id}/documents', summary: 'A project’s documents, oldest first.', response: 'DocumentRead[]', errors: '404 project' },
      {
        method: 'POST',
        path: '/api/projects/{project_id}/documents',
        summary: 'Upload one file (multipart field "file"). Returns at once; processing runs in the background.',
        request: 'multipart/form-data: file',
        response: '201 · DocumentRead (status "pending")',
        errors: '404 · 400 wrong type / empty / too large',
      },
      { method: 'GET', path: '/api/projects/{project_id}/documents/{document_id}', summary: 'One document. Both ids must match.', response: 'DocumentRead', errors: '404' },
      { method: 'DELETE', path: '/api/projects/{project_id}/documents/{document_id}', summary: 'Delete the row (chunks cascade), then the file on disk.', response: '204', errors: '404' },
    ],
  },
  {
    title: 'Conversations',
    file: 'app/routers/conversations.py',
    endpoints: [
      { method: 'POST', path: '/api/projects/{project_id}/conversations', summary: 'Start a conversation.', request: '{ title? }', response: '201 · ConversationRead', errors: '404 · 422' },
      { method: 'GET', path: '/api/projects/{project_id}/conversations', summary: 'A project’s conversations, most recently active first.', response: 'ConversationRead[]', errors: '404' },
      { method: 'GET', path: '/api/conversations/{conversation_id}/messages', summary: 'Messages, oldest first.', response: 'MessageRead[]', errors: '404' },
      {
        method: 'POST',
        path: '/api/conversations/{conversation_id}/ask',
        summary: 'Answer a question from the project’s ready documents (RAG). Not streamed yet.',
        request: '{ question } (1–4000 characters)',
        response: 'MessageRead (role "assistant", with sources)',
        errors: '404 · 422 · 500 missing key · 502 AI provider failed',
      },
    ],
  },
];

export const ENV_VARS = [
  { name: 'DATABASE_URL', where: 'api/.env', required: true, note: 'postgresql+asyncpg://… (the asyncpg driver is required for async SQLAlchemy).' },
  { name: 'CORS_ALLOW_ORIGINS', where: 'api/.env', required: true, note: 'JSON list, e.g. ["http://localhost:5173"]. Only needed without the Vite proxy.' },
  { name: 'UPLOAD_DIR', where: 'api/.env', required: false, note: 'Folder for uploaded files. Default "uploads" (git-ignored).' },
  { name: 'MAX_FILE_SIZE', where: 'api/.env', required: false, note: 'In bytes. Default 10 485 760 (10 MB).' },
  { name: 'ALLOWED_EXTENSIONS', where: 'api/.env', required: false, note: 'JSON list. Default [".pdf", ".md", ".txt"].' },
  { name: 'OPENAI_API_KEY', where: 'api/.env', required: false, note: 'For embeddings. Without it, documents end up "failed" with a clear message.' },
  { name: 'EMBEDDING_MODEL', where: 'api/.env', required: false, note: 'Default text-embedding-3-small (1536 numbers, must match vector(1536)).' },
  { name: 'CLAUDE_API_KEY', where: 'api/.env', required: false, note: 'For answers. Without it, /ask returns 500 with a clear message.' },
  { name: 'LLM_MODEL', where: 'api/.env', required: false, note: 'Default claude-opus-5-5.' },
  { name: 'API_URL', where: 'web/.env', required: false, note: 'Where Vite proxies /api. Default http://localhost:8000.' },
];

export const BACKEND_FOLDERS = [
  { path: 'app/main.py', role: 'Creates the FastAPI app, adds CORS, includes the /api router.' },
  { path: 'app/core/config.py', role: 'Settings (pydantic-settings): every value from api/.env, typed and validated at startup.' },
  { path: 'app/core/db.py', role: 'Async engine, SessionLocal, Base, and get_session (one session per request).' },
  { path: 'app/routers/', role: 'HTTP endpoints only: validate input, call the database or a service, return a schema.' },
  { path: 'app/schemas/', role: 'Pydantic models: the exact shape of request bodies and responses (what /docs shows).' },
  { path: 'app/models/', role: 'SQLAlchemy models: one class per table. The source of truth for migrations.' },
  { path: 'app/services/', role: 'The real work, no HTTP: extraction, chunking, embeddings, ingestion, llm, rag.' },
  { path: 'alembic/versions/', role: 'Migrations: every change to the database schema, in order, reversible.' },
  { path: 'uploads/<project_id>/', role: 'Uploaded files, named by document id. Not in git.' },
];

export const FRONTEND_FOLDERS = [
  { path: 'src/routes/', role: 'TanStack Router file routes: __root (shell), index (projects), projects.$projectId, documentation.' },
  { path: 'src/components/ui/', role: 'shadcn primitives (button, dialog, sheet, dropdown…). Styled only through tokens.' },
  { path: 'src/components/layout/', role: 'App shell: sidebar, top bar, theme provider and toggle, page header.' },
  { path: 'src/components/<feature>/', role: 'Feature UI: projects, documents, chat, project-page, documentation.' },
  { path: 'src/hooks/', role: 'React Query hooks: useProjects, useDocuments, useAsk… Components only talk to these.' },
  { path: 'src/services/api/', role: 'Raw HTTP calls per resource, through one fetch wrapper (client.ts).' },
  { path: 'src/schemas/', role: 'Zod schemas: form validation and file checks before anything is sent.' },
  { path: 'src/types/', role: 'TypeScript shapes of what the API returns (mirrors the Pydantic schemas).' },
  { path: 'src/lib/', role: 'Helpers: query client and keys, formatting, colours, cn().' },
  { path: 'src/constants/', role: 'Upload rules, polling interval, site name.' },
  { path: 'src/styles/globals.css', role: 'All design tokens (light and dark), type scale and utilities.' },
];

export const GLOSSARY = [
  { term: 'RAG', definition: 'Retrieval-Augmented Generation: find the relevant passages first, then let the model answer from them only.' },
  { term: 'Chunk', definition: 'A piece of a document small enough to send as context (~2000 characters ≈ 500 tokens here).' },
  { term: 'Embedding', definition: 'A list of numbers (1536 here) representing the meaning of a text. Similar meanings give close vectors.' },
  { term: 'Vector search', definition: 'Finding the stored vectors closest to the question’s vector. pgvector does it in SQL.' },
  { term: 'Cosine distance', definition: 'How different two vectors’ directions are: 0 = same meaning, 2 = opposite. Smaller is closer.' },
  { term: 'Overlap', definition: 'Characters repeated between consecutive chunks (200 here), so a sentence on a boundary is not lost.' },
  { term: 'Token', definition: 'The unit models read and bill: roughly 4 characters of English text.' },
  { term: 'Background task', definition: 'Work FastAPI starts after sending the response, so uploads return instantly.' },
  { term: 'Migration', definition: 'A versioned, reversible script that changes the database schema (Alembic).' },
  { term: 'CASCADE', definition: 'A foreign-key rule: deleting the parent row deletes its children automatically.' },
  { term: 'Session', definition: 'SQLAlchemy’s unit of work with the database: tracks objects and sends SQL on commit.' },
  { term: 'Optimistic update', definition: 'Showing the result in the UI before the server confirms it (your question appears instantly).' },
  { term: 'SSE', definition: 'Server-Sent Events: the server pushes text over one open HTTP response. Planned for streaming answers.' },
];

export const ROADMAP = [
  { title: 'Skeleton, settings, Postgres', done: true },
  { title: 'Projects CRUD', done: true },
  { title: 'Document upload, storage, listing, deletion', done: true },
  { title: 'Background ingestion: extract, chunk, embed, statuses', done: true },
  { title: 'Conversations and the ask endpoint (RAG)', done: true },
  { title: 'Streaming answers with SSE', done: false },
  { title: 'Tests (pytest), authentication, S3 storage, a job queue, hybrid search', done: false },
];
