import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, DocumentUpload, SearchNormal1 } from 'iconsax-react';
import { ChatPanel } from '~/components/chat/chat-panel';
import { DocumentsPanel } from '~/components/documents/documents-panel';
import type { UploadDropzoneHandle } from '~/components/documents/upload-dropzone';
import { PageHeader } from '~/components/layout/page-header';
import { ProjectActions } from '~/components/projects/project-actions';
import { EmptyState } from '~/components/shared/empty-state';
import { ErrorState } from '~/components/shared/error-state';
import { ProjectTile } from '~/components/shared/project-tile';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { useDocuments } from '~/hooks/documents';
import { useProject } from '~/hooks/projects';
import { MAX_DOCUMENTS_PER_PROJECT } from '~/constants/uploads';
import { formatDate } from '~/lib/format';
import { cn } from '~/lib/utils';
import { isNotFound } from '~/services/api/client';

// Remembered per browser: a reader who widens the chat keeps it wide on every project.
const EXPANDED_KEY = 'chatwave-chat-expanded';

function readExpanded() {
  try {
    return localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * One project: header, documents on the left, chat on the right (stacked on small screens).
 * On large screens the page is exactly one screen tall: the documents column scrolls on its own and the chat
 * fills the rest, so its composer never needs scrolling to. The chat can be widened (documents hidden).
 */
export function ProjectScreen({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const documents = useDocuments(projectId);
  const dropzone = React.useRef<UploadDropzoneHandle>(null);
  const [chatExpanded, setChatExpanded] = React.useState(readExpanded);

  function toggleChatExpanded() {
    setChatExpanded((value) => {
      try {
        localStorage.setItem(EXPANDED_KEY, value ? '0' : '1');
      } catch {
        // private mode: the choice lasts for this page only
      }
      return !value;
    });
  }

  if (project.isError) {
    return isNotFound(project.error) ? (
      <ProjectNotFound />
    ) : (
      <div className="p-6 sm:p-10">
        <ErrorState title="This project could not be loaded" error={project.error} onRetry={() => project.refetch()} retrying={project.isFetching} />
      </div>
    );
  }

  return (
    // 3.5rem = the top bar (h-14)
    <div className="flex min-h-full flex-col lg:h-[calc(100svh-3.5rem)] lg:min-h-0">
      <div className="shrink-0 border-b px-4 py-6 sm:px-6 lg:px-10 lg:py-5">
        {project.data ? (
          <PageHeader
            leading={<ProjectTile id={project.data.id} name={project.data.name} size="lg" />}
            title={project.data.name}
            description={
              <span className="flex flex-col gap-1">
                {project.data.description ? <span className="max-w-2xl text-pretty">{project.data.description}</span> : null}
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  Created {formatDate(project.data.created_at)}
                </span>
              </span>
            }
            actions={
              <>
                <Button
                  variant="outline"
                  onClick={() => dropzone.current?.browse()}
                  disabled={(documents.data?.length ?? 0) >= MAX_DOCUMENTS_PER_PROJECT}
                >
                  <DocumentUpload aria-hidden />
                  Add documents
                </Button>
                <ProjectActions project={project.data} documentCount={documents.data?.length} />
              </>
            }
          />
        ) : (
          <HeaderSkeleton />
        )}
      </div>

      <div
        className={cn(
          'grid flex-1 gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:gap-8 lg:px-10 lg:py-6',
          chatExpanded ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]',
        )}
      >
        {/* Kept mounted when hidden, so uploads in progress and the open sheet survive a toggle */}
        <div className={cn('lg:-mr-3 lg:min-h-0 lg:overflow-y-auto lg:pr-3', chatExpanded && 'lg:hidden')}>
          <DocumentsPanel projectId={projectId} dropzoneRef={dropzone} />
        </div>
        <div className="lg:min-h-0">
          <ChatPanel projectId={projectId} expanded={chatExpanded} onToggleExpanded={toggleChatExpanded} />
        </div>
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-start gap-3.5" aria-busy="true" aria-label="Loading project">
      <Skeleton className="size-11 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2.5 pt-1">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
    </div>
  );
}

function ProjectNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
      <EmptyState
        icon={SearchNormal1}
        size="lg"
        variant="plain"
        title="This project does not exist"
        description="It may have been deleted, or the link is wrong."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft aria-hidden />
              All projects
            </Link>
          </Button>
        }
      />
    </div>
  );
}
