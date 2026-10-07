import { useSyncExternalStore } from 'react';
import { Localization } from './localization';

export function useLocalization() {
  const locale = useSyncExternalStore(Localization.subscribe, Localization.snapshot, Localization.snapshot);

  return { locale, t: Localization.translate, setLocale: Localization.setLocale };
}
