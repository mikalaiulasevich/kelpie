import { useEffect, useRef, useState } from 'react';
import { Check, FileJson, Upload } from 'lucide-react';
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
import { ConfigurationManagementPolicy } from './configuration-policy';
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
  const [selected, setSelected] = useState<Optional<SelectedConfiguration>>();
  const [message, setMessage] = useState('');
  const [issues, setIssues] = useState<readonly { path: string; message: string }[]>([]);
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<Optional<ConfigurationImportResult>>();
  const selectionSequence = useRef(0);
  const requestPending = useRef(false);
  const cancellation = useRef(new AbortController());

  useEffect(() => {
    const controller = new AbortController();
    cancellation.current = controller;

    return () => {
      controller.abort();
      selectionSequence.current += 1;
    };
  }, []);

  const select = async (file: Optional<File>) => {
    const sequence = ++selectionSequence.current;
    setSelected(undefined);
    setMessage('');
    setIssues([]);
    setResult(undefined);

    if (!file) {
      return;
    }

    if (file.size > ConfigurationManagementPolicy.MaximumJsonBytes) {
      setMessage(ConfigurationContent.FileTooLarge);

      return;
    }

    setReading(true);

    try {
      const document: unknown = JSON.parse(await file.text());

      if (sequence === selectionSequence.current) {
        setSelected({ document, filename: file.name, bytes: file.size });
      }
    } catch {
      if (sequence === selectionSequence.current) {
        setMessage(ConfigurationContent.InvalidJson);
      }
    } finally {
      if (sequence === selectionSequence.current) {
        setReading(false);
      }
    }
  };

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
          error instanceof ManagementError ? error.message : ConfigurationContent.ImportFailure,
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
        <DialogHeader>
          <DialogTitle>{ConfigurationContent.ImportTitle}</DialogTitle>
          <DialogDescription>{ConfigurationContent.ImportDescription}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="configuration-file">{ConfigurationContent.File}</FieldLabel>
            <Input
              id="configuration-file"
              type="file"
              accept=".json,application/json"
              disabled={pending}
              onChange={(event) => {
                void select(event.target.files?.[0]);
              }}
              className="h-12"
            />
          </Field>
        </FieldGroup>
        {selected && (
          <div className="flex items-center gap-3 rounded-xl border p-4">
            <FileJson className="size-8 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{selected.filename}</p>
              <p className="text-xs text-muted-foreground">
                {Math.ceil(selected.bytes / 1024)} KiB · JSON
              </p>
            </div>
          </div>
        )}
        {message && (
          <Alert variant="destructive">
            <AlertTitle>{ConfigurationContent.ImportFailure}</AlertTitle>
            <AlertDescription>
              {message}
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
          <Alert>
            <Check />
            <AlertTitle>
              {result.outcome === 'created'
                ? ConfigurationContent.ImportComplete
                : ConfigurationContent.ImportExisting}
            </AlertTitle>
            <AlertDescription>
              {result.version.funnelIdentifier} ·{' '}
              {ConfigurationFormat.version(result.version.version)}
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {ConfigurationContent.Close}
          </Button>
          {!result && (
            <Button
              onClick={() => {
                void submit();
              }}
              disabled={!selected || pending || reading}
            >
              <Upload data-icon="inline-start" />
              {pending ? ConfigurationContent.ImportPending : ConfigurationContent.ImportAction}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
