import { Settings2 } from 'lucide-react';
import { Button } from '../components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/dialog';
import { Localization } from './localization';
import { useLocalization } from './use-localization';

export function LanguageSettings() {
  const { locale, t, setLocale } = useLocalization();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start">
          <Settings2 aria-hidden="true" />
          {t('Settings')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('Settings')}</DialogTitle>
          <DialogDescription>
            {t('Applies to this administration app in this browser.')}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-2 text-sm">
          {t('Interface language')}
          <select
            className="h-11 rounded-md border border-border bg-background px-3"
            value={locale}
            onChange={(event) => setLocale(event.target.value === 'ru' ? 'ru' : 'en')}
          >
            <option value="en" lang="en">
              English
            </option>
            <option value="ru" lang="ru">
              Русский
            </option>
          </select>
        </label>
        {Localization.storageFailed && (
          <p role="status" className="text-sm text-destructive">
            {t('Language preference could not be saved.')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
