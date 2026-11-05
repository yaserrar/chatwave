import * as React from 'react';
import { SITE } from '~/constants/site';

/** Sets the tab title: "Supplier A · Chatwave", or just "Chatwave". */
export function useDocumentTitle(title?: string | null) {
  React.useEffect(() => {
    document.title = title ? `${title} · ${SITE.name}` : SITE.name;
  }, [title]);
}
