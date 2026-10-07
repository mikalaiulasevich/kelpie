import { useLocalization } from '../localization/use-localization';
import { useEffect, useRef, useState } from 'react';
import { Check, FileJson, LoaderCircle, Upload } from 'lucide-react';
import { ManagementClient, ManagementError } from '../management/management-client';
import type { ConfigurationImportResult } from '../management/management-types';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { Field, FieldGroup, FieldLabel } from '../components/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/dialog';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { ConfigurationContent } from './configuration-content';
import { ConfigurationFileSelection } from './configuration-file-selection';
import { ConfigurationFormat } from './configuration-format';

interface ConfigurationImportDialogProperties {
  onClose: () => void;
  onReturnFocus?: () => void;
  onImported: (funnelIdentifier: string) => void;
  onUnauthorized: () => void;
}

interface SelectedConfiguration {
  readonly document: unknown;
  readonly filename: string;
  readonly bytes: number;
}

export function ConfigurationImportDialog({
  onClose,
  onReturnFocus,
  onImported,
  onUnauthorized,
}: ConfigurationImportDialogProperties): UIElement {
  const { t } = useLocalization();
  const [selected, setSelected] = useState<Optional<SelectedConfiguration>>();
  const [message, setMessage] = useState('');
  const [issues, setIssues] = useState<readonly { path: string; message: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<Optional<ConfigurationImportResult>>();
  const fileInputReference = useRef<HTMLInputElement>(null);
  const [fileSelection] = useState(
    () =>
      new ConfigurationFileSelection({
        reset: () => {
          setSelected(undefined);
          setMessage('');
          setIssues([]);
          setResult(undefined);
        },
        setReading,
        setMessage,
        accept: (document, file) => {
          setSelected({ document, filename: file.name, bytes: file.size });
        },
      }),
  );
  const requestPending = useRef(false);
  const cancellation = useRef(new AbortController());

  useEffect(() => {
    const controller = new AbortController();
    cancellation.current = controller;

    return () => {
      controller.abort();
      fileSelection.cancel();
    };
  }, [fileSelection]);

  const submit = async () => {
    if (!selected || requestPending.current) {
      return;
    }

    requestPending.current = true;
    setPending(true);
    setMessage('');
    setIssues([]);

    try {
      const imported = await ManagementClient.importConfiguration(
        selected.document,
        cancellation.current.signal,
      );

      if (!cancellation.current.signal.aborted) {
        setResult(imported);
        onImported(imported.version.funnelIdentifier);
      }
    } catch (error) {
      if (!cancellation.current.signal.aborted) {
        if (error instanceof ManagementError && error.status === 401) {
          onUnauthorized();

          return;
        }

        setMessage(
          error instanceof ManagementError ? error.message : t(ConfigurationContent.ImportFailure),
        );
        setIssues(error instanceof ManagementError ? error.issues : []);
      }
    } finally {
      requestPending.current = false;

      if (!cancellation.current.signal.aborted) {
        setPending(false);
      }
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto rounded-xl sm:max-w-2xl sm:p-8"
        onCloseAutoFocus={(event) => {
          if (onReturnFocus) {
            event.preventDefault();
            onReturnFocus();
          }
        }}
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (pending) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="gap-3 text-left">
          <DialogTitle className="text-2xl tracking-tight">
            {t(ConfigurationContent.ImportTitle)}
          </DialogTitle>
          <DialogDescription>{t(ConfigurationContent.ImportDescription)}</DialogDescription>
        </DialogHeader>
        <FieldGroup aria-busy={pending || reading}>
          <Field
            data-disabled={pending}
            className="rounded-xl border border-dashed bg-muted/30 p-6 sm:p-8"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-12 items-center justify-center rounded-[10px] border bg-background text-muted-foreground">
                {reading ? (
                  <LoaderCircle className="form-pending-icon size-5" aria-hidden="true" />
                ) : (
                  <Upload className="size-5" strokeWidth={1.5} aria-hidden="true" />
                )}
              </span>
              <div className="flex flex-col items-center gap-2">
                <FieldLabel htmlFor="configuration-file" className="text-base font-medium">
                  {t(ConfigurationContent.File)}
                </FieldLabel>
                <p id="configuration-file-requirements" className="text-sm text-muted-foreground">
                  {t(ConfigurationContent.FileRequirements)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => fileInputReference.current?.click()}
              >
                {selected
                  ? t(ConfigurationContent.ReplaceFile)
                  : t(ConfigurationContent.ChooseFile)}
              </Button>
            </div>
            <Input
              ref={fileInputReference}
              id="configuration-file"
              type="file"
              accept=".json,application/json"
              aria-describedby="configuration-file-requirements"
              tabIndex={-1}
              disabled={pending}
              onChange={(event) => {
                void fileSelection.select(event.target.files?.[0]);
              }}
              className="sr-only"
            />
          </Field>
        </FieldGroup>
        <p className="text-sm text-muted-foreground empty:hidden" role="status" aria-atomic="true">
          {reading && t(ConfigurationContent.ReadingFile)}
          {pending && t(ConfigurationContent.ImportPending)}
        </p>
        {selected && (
          <div className="form-feedback flex items-center gap-4 rounded-xl border bg-card p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
              <FileJson className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="break-all text-sm font-medium">{selected.filename}</p>
              <p className="text-xs text-muted-foreground">
                {Math.ceil(selected.bytes / 1024)} {t('KiB · JSON')}
              </p>
              {!pending && !result && !message && issues.length === 0 && (
                <p className="text-xs text-muted-foreground">{t(ConfigurationContent.FileReady)}</p>
              )}
            </div>
          </div>
        )}
        {message && (
          <Alert variant="destructive" className="form-feedback">
            <AlertTitle>{t(ConfigurationContent.ImportFailure)}</AlertTitle>
            <AlertDescription>
              {t(message)}
              {issues.length > 0 && (
                <ul className="mt-3 flex max-h-48 flex-col gap-2 overflow-auto">
                  {issues.map((issue, index) => (
                    <li key={`${issue.path}-${index}`}>
                      <code className="break-all text-xs">{issue.path}</code>
                      <p>{issue.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert className="form-feedback">
            <Check aria-hidden="true" />
            <AlertTitle>
              {result.outcome === 'created'
                ? t(ConfigurationContent.ImportComplete)
                : t(ConfigurationContent.ImportExisting)}
            </AlertTitle>
            <AlertDescription>
              {result.version.funnelIdentifier} ·{' '}
              {ConfigurationFormat.version(result.version.version)}
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t(ConfigurationContent.Close)}
          </Button>
          {!result && (
            <Button
              onClick={() => {
                void submit();
              }}
              disabled={!selected || pending || reading}
            >
              {pending ? (
                <LoaderCircle className="form-pending-icon" aria-hidden="true" />
              ) : (
                <Upload data-icon="inline-start" strokeWidth={1.5} aria-hidden="true" />
              )}
              {pending
                ? t(ConfigurationContent.ImportPending)
                : t(ConfigurationContent.ImportAction)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
