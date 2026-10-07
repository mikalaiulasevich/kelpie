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
import { LocalizationContent } from './localization-content';
import { InterfaceLocale } from './localization-types';
import { useLocalization } from './use-localization';

export function LanguageSettings() {
  const { locale, t: translate, setLocale, storageFailed } = useLocalization();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start">
          <Settings2 aria-hidden="true" />
          {translate(LocalizationContent.Settings)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{translate(LocalizationContent.Settings)}</DialogTitle>
          <DialogDescription>{translate(LocalizationContent.Description)}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-2 text-sm">
          {translate(LocalizationContent.Language)}
          <select
            className="h-11 rounded-md border border-border bg-background px-3"
            value={locale}
            onChange={(event) =>
              setLocale(
                event.target.value === InterfaceLocale.Russian
                  ? InterfaceLocale.Russian
                  : InterfaceLocale.English,
              )
            }
          >
            <option value={InterfaceLocale.English} lang={InterfaceLocale.English}>
              {LocalizationContent.English}
            </option>
            <option value={InterfaceLocale.Russian} lang={InterfaceLocale.Russian}>
              {LocalizationContent.Russian}
            </option>
          </select>
        </label>
        {storageFailed && (
          <p role="status" className="text-sm text-destructive">
            {translate(LocalizationContent.PersistenceFailed)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
