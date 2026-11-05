import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '~/components/landing/landing-page';
import { sessionQuery } from '~/hooks/auth';
import { useDocumentTitle } from '~/hooks/use-document-title';

export const Route = createFileRoute('/')({
  // Public. Warm the session (not awaited) so the button already says "Open dashboard" for a returning guest.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(sessionQuery());
  },
  component: Landing,
});

function Landing() {
  useDocumentTitle();
  return <LandingPage />;
}
