import { useSyncExternalStore } from 'react';
import { Localization } from './localization';

export function useLocalization() {
  const snapshot = useSyncExternalStore(
    Localization.subscribe,
    Localization.snapshot,
    Localization.snapshot,
  );

  return { ...snapshot, t: Localization.translate, setLocale: Localization.setLocale };
}
