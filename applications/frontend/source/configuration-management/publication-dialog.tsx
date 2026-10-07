import { useLocalization } from '../localization/use-localization';
import { useEffect, useRef, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import { AlertCircle, ArrowUpRight, RotateCcw } from 'lucide-react';
import { ManagementError } from '../management/management-client';
import { Button } from '../components/button';
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
import { PublicationIntents, type PublicationIntent } from './publication-intents';
import { PublicationExecution } from './publication-execution';

interface PublicationDialogProperties {
  ownerIdentifier: string;
  intent: PublicationIntent;
  onClose: () => void;
  onReturnFocus?: () => void;
  onChanged: (funnelIdentifier: string) => void;
  onUnauthorized: () => void;
}

const PublicationPresentation = {
  submitLabel(intent: PublicationIntent, pending: boolean, uncertain: boolean): string {
    if (pending) {
      return ConfigurationContent.CommandPending;
    }

    if (uncertain) {
      return ConfigurationContent.RetryCommand;
    }

    return intent.kind === 'publish'
      ? ConfigurationContent.ConfirmPublish
      : ConfigurationContent.ConfirmRollback;
  },
} as const;

export function PublicationDialog({
  ownerIdentifier,
  intent,
  onClose,
  onReturnFocus,
  onChanged,
  onUnauthorized,
}: PublicationDialogProperties): UIElement {
  const { t } = useLocalization();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Optional<ManagementError | Error>>();
  const [uncertain, setUncertain] = useState(() => !!PublicationIntents.read(ownerIdentifier));
  const [confirmed, setConfirmed] = useState(false);
  const [recoveryRetained, setRecoveryRetained] = useState(false);
  const cancellation = useRef(new AbortController());
  const requestPending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    cancellation.current = controller;

    return () => controller.abort();
  }, []);

  const close = () => {
    if (!pending && !uncertain) {
      PublicationIntents.clear(ownerIdentifier);
      onClose();
    }
  };

  const submit = async () => {
    if (requestPending.current || confirmed) {
      return;
    }

    requestPending.current = true;
    setPending(true);
    setError(undefined);

    try {
      const signal = cancellation.current.signal;
      const cleared = await PublicationExecution.apply(ownerIdentifier, intent, signal);

      if (!signal.aborted) {
        setConfirmed(true);
        setUncertain(false);
        setRecoveryRetained(!cleared);
        onChanged(intent.command.funnelIdentifier);

        if (cleared) {
          onClose();
        }
      }
    } catch (failure) {
      if (!cancellation.current.signal.aborted) {
        if (failure instanceof ManagementError && failure.status === 401) {
          onUnauthorized();

          return;
        }

        // A storage failure on retry cannot settle the preceding unknown server outcome.
        const ambiguous = failure instanceof ManagementError ? failure.uncertain : uncertain;
        setUncertain(ambiguous);

        if (!ambiguous) {
          setRecoveryRetained(!PublicationIntents.clear(ownerIdentifier));
        }

        setError(isError(failure) ? failure : new Error(t(ConfigurationContent.CommandFailure)));
      }
    } finally {
      requestPending.current = false;

      if (!cancellation.current.signal.aborted) {
        setPending(false);
      }
    }
  };

  const conflict = error instanceof ManagementError && error.status === 409;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          close();
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
        showCloseButton={!pending && !uncertain}
        onEscapeKeyDown={(event) => {
          if (pending || uncertain) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (pending || uncertain) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {intent.kind === 'publish'
              ? t(ConfigurationContent.PublishTitle)
              : t(ConfigurationContent.RollbackTitle)}
          </DialogTitle>
          <DialogDescription>
            {intent.kind === 'publish'
              ? t(ConfigurationContent.PublishDescription)
              : t(ConfigurationContent.RollbackDescription)}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-4 rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">{t(ConfigurationContent.Funnel)}</dt>
            <dd className="font-medium">{intent.command.funnelIdentifier}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t(ConfigurationContent.Version)}</dt>
            <dd className="font-medium">{intent.label}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t(ConfigurationContent.CurrentRevision)}</dt>
            <dd>{intent.command.expectedRevision}</dd>
          </div>
        </dl>
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{t(ConfigurationContent.CommandFailure)}</AlertTitle>
            <AlertDescription>
              {conflict ? t(ConfigurationContent.Conflict) : error.message}
            </AlertDescription>
          </Alert>
        )}
        {uncertain && (
          <Alert>
            <AlertCircle />
            <AlertDescription>{t(ConfigurationContent.UnknownOutcome)}</AlertDescription>
          </Alert>
        )}
        {recoveryRetained && (
          <Alert>
            <AlertCircle />
            {confirmed && <AlertTitle>{t(ConfigurationContent.CommandConfirmed)}</AlertTitle>}
            <AlertDescription>{t(ConfigurationContent.RecoveryRetained)}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending || uncertain}>
            {confirmed ? t(ConfigurationContent.Close) : t(ConfigurationContent.Cancel)}
          </Button>
          {!confirmed &&
            (conflict ? (
              <Button
                onClick={() => {
                  onChanged(intent.command.funnelIdentifier);
                  close();
                }}
              >
                {t(ConfigurationContent.RefreshReview)}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  void submit();
                }}
                disabled={pending}
              >
                {intent.kind === 'publish' ? (
                  <ArrowUpRight data-icon="inline-start" />
                ) : (
                  <RotateCcw data-icon="inline-start" />
                )}
                {t(PublicationPresentation.submitLabel(intent, pending, uncertain))}
              </Button>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
