import { createFileRoute } from '@tanstack/react-router';
import { DocumentationPage } from '~/components/documentation/documentation-page';
import { useDocumentTitle } from '~/hooks/use-document-title';

export const Route = createFileRoute('/_app/documentation')({
  component: DocumentationRoute,
});

function DocumentationRoute() {
  useDocumentTitle('Documentation');
  return <DocumentationPage />;
}
