import { createFileRoute } from '@tanstack/react-router';
import { ProjectsOverview } from '~/components/projects/projects-overview';
import { projectsQuery } from '~/hooks/projects';
import { useDocumentTitle } from '~/hooks/use-document-title';

export const Route = createFileRoute('/')({
  // Warm the cache (not awaited): the page renders its own skeletons.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(projectsQuery());
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  useDocumentTitle('Projects');
  return <ProjectsOverview />;
}
