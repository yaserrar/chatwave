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
import { formatDate } from '~/lib/format';
import { isNotFound } from '~/services/api/client';

/** One project: header, documents on the left, chat on the right (stacked on small screens). */
export function ProjectScreen({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const documents = useDocuments(projectId);
  const dropzone = React.useRef<UploadDropzoneHandle>(null);

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
    <div className="flex min-h-full flex-col">
      <div className="border-b px-4 py-6 sm:px-6 lg:px-10">
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
                <Button variant="outline" onClick={() => dropzone.current?.browse()}>
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

      <div className="grid flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-8 lg:px-10 lg:py-8">
        <DocumentsPanel projectId={projectId} dropzoneRef={dropzone} />
        <ChatPanel projectId={projectId} />
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
