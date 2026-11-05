import { createFileRoute } from '@tanstack/react-router';
import { ProjectScreen } from '~/components/project-page/project-screen';
import { documentsQuery } from '~/hooks/documents';
import { projectQuery, useProject } from '~/hooks/projects';
import { useDocumentTitle } from '~/hooks/use-document-title';

export const Route = createFileRoute('/_app/projects/$projectId')({
  // Runs on hover too (defaultPreload: 'intent'), so the project usually opens with its data ready.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(projectQuery(params.projectId));
    void context.queryClient.prefetchQuery(documentsQuery(params.projectId));
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const project = useProject(projectId);
  useDocumentTitle(project.data?.name);
  // key: switching projects resets local state (open sheet, upload queue).
  return <ProjectScreen key={projectId} projectId={projectId} />;
}
