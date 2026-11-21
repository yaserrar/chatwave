import * as React from 'react';

/** Whether a CSS media query matches right now, updated when it changes (e.g. rotating a phone). */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
