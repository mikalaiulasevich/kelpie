import { useEffect, useRef, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import { AlertCircle, ArrowUpRight, RotateCcw } from 'lucide-react';
import { ManagementClient, ManagementError } from '../management/management-client';
import { Button } from '../components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/dialog';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { ConfigurationContent } from './configuration-content';
import { PublicationIntents, type PublicationIntent } from './publication-intents';

interface PublicationDialogProperties {
  ownerIdentifier: string;
  intent: PublicationIntent;
  onClose: () => void;
  onChanged: (funnelIdentifier: string) => void;
  onUnauthorized: () => void;
}

export function PublicationDialog({ ownerIdentifier, intent, onClose, onChanged, onUnauthorized }: PublicationDialogProperties): UIElement {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Optional<ManagementError | Error>>();
  const [uncertain, setUncertain] = useState(!!PublicationIntents.read(ownerIdentifier));
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
    if (requestPending.current) {
      return;
    }

    requestPending.current = true;
    setPending(true);
    setError(undefined);

    try {
      PublicationIntents.save(ownerIdentifier, intent);
      const signal = cancellation.current.signal;

      if (intent.kind === 'publish') {
        await ManagementClient.publish(intent.command, signal);
      } else {
        await ManagementClient.rollback(intent.command, signal);
      }

      if (!signal.aborted) {
        PublicationIntents.clear(ownerIdentifier);
        onChanged(intent.command.funnelIdentifier);
        onClose();
      }
    } catch (failure) {
      if (!cancellation.current.signal.aborted) {
        if (failure instanceof ManagementError && failure.status === 401) {
          onUnauthorized();

          return;
        }

        const ambiguous = failure instanceof ManagementError && failure.uncertain;
        setUncertain(ambiguous);

        if (!ambiguous) {
          PublicationIntents.clear(ownerIdentifier);
        }

        setError(isError(failure) ? failure : new Error(ConfigurationContent.CommandFailure));
      }
    } finally {
      requestPending.current = false;

      if (!cancellation.current.signal.aborted) {
        setPending(false);
      }
    }
  };
  const conflict = error instanceof ManagementError && error.status === 409;

  return <Dialog open onOpenChange={open => { if (!open) { close(); } }}><DialogContent onEscapeKeyDown={event => { if (pending || uncertain) { event.preventDefault(); } }} onInteractOutside={event => { if (pending || uncertain) { event.preventDefault(); } }}>
    <DialogHeader><DialogTitle>{intent.kind === 'publish' ? ConfigurationContent.PublishTitle : ConfigurationContent.RollbackTitle}</DialogTitle><DialogDescription>{intent.kind === 'publish' ? ConfigurationContent.PublishDescription : ConfigurationContent.RollbackDescription}</DialogDescription></DialogHeader>
    <dl className="grid gap-4 rounded-xl border bg-muted/30 p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{ConfigurationContent.Funnel}</dt><dd className="font-medium">{intent.command.funnelIdentifier}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">{ConfigurationContent.Version}</dt><dd className="font-medium">{intent.label}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">{ConfigurationContent.CurrentRevision}</dt><dd>{intent.command.expectedRevision}</dd></div></dl>
    {error && <Alert variant="destructive"><AlertCircle /><AlertTitle>{ConfigurationContent.CommandFailure}</AlertTitle><AlertDescription>{conflict ? ConfigurationContent.Conflict : error.message}</AlertDescription></Alert>}
    {uncertain && <Alert><AlertCircle /><AlertDescription>{ConfigurationContent.UnknownOutcome}</AlertDescription></Alert>}
    <DialogFooter>
      <Button variant="outline" onClick={close} disabled={pending || uncertain}>{ConfigurationContent.Cancel}</Button>
      {conflict ? <Button onClick={() => { onChanged(intent.command.funnelIdentifier); close(); }}>{ConfigurationContent.RefreshReview}</Button> : <Button onClick={() => { void submit(); }} disabled={pending}>{intent.kind === 'publish' ? <ArrowUpRight data-icon="inline-start" /> : <RotateCcw data-icon="inline-start" />}{pending ? ConfigurationContent.CommandPending : uncertain ? ConfigurationContent.RetryCommand : intent.kind === 'publish' ? ConfigurationContent.ConfirmPublish : ConfigurationContent.ConfirmRollback}</Button>}
    </DialogFooter>
  </DialogContent></Dialog>;
}
