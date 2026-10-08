import { ManagementPolicy } from '../management/management-policy';
import { useEffect, useRef, useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { Type, type Static } from 'typebox';
import { Ajv } from 'ajv';
import { ManagementTransport } from '../management/management-transport';
import { Button } from '../components/button';
import { useLocalization } from '../localization/use-localization';

const previewResponse = Type.Object({ sessionIdentifier: Type.String() });
const validatePreview = new Ajv().compile<Static<typeof previewResponse>>(previewResponse);

export function ConfigurationPreview({
  versionIdentifier,
  variant,
}: {
  readonly versionIdentifier: string;
  readonly variant: string;
}): UIElement {
  const { t: translate } = useLocalization();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const quizOrigin =
    import.meta.env.VITE_QUIZ_ORIGIN ?? (import.meta.env.DEV ? 'http://127.0.0.1:3001' : undefined);

  const start = async () => {
    if (controller.current) {
      return;
    }

    const activeController = new AbortController();
    controller.current = activeController;
    setBusy(true);
    setFailed(false);
    setReady(false);
    try {
      await ManagementTransport.request({
        path: `/api/administration/configurations/${encodeURIComponent(versionIdentifier)}/preview`,
        method: 'POST',
        signal: AbortSignal.any([
          activeController.signal,
          AbortSignal.timeout(ManagementPolicy.RequestTimeoutMilliseconds),
        ]),
        validate: validatePreview,
        document: {
          operationIdentifier: crypto.randomUUID(),
          clientTimestamp: new Date().toISOString(),
          variant,
        },
      });
      if (!activeController.signal.aborted) {
        setReady(true);
      }
    } catch {
      if (!activeController.signal.aborted) {
        setFailed(true);
      }
    } finally {
      controller.current = null;
      if (!activeController.signal.aborted) {
        setBusy(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" disabled={busy || !quizOrigin} onClick={() => void start()}>
        <Play />
        {translate(busy ? 'Preparing preview…' : 'Test this version')}
      </Button>
      <p className="max-w-sm text-xs text-muted-foreground">
        {translate('Synthetic session. Your normal quiz session is kept separately.')}
      </p>
      {ready && quizOrigin && (
        <Button asChild>
          <a href={`${quizOrigin}/?preview=1`} target="_blank" rel="noreferrer">
            <ExternalLink />
            {translate('Open test quiz')}
          </a>
        </Button>
      )}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {translate('Preview could not be started. Please try again.')}
        </p>
      )}
      {!quizOrigin && (
        <p className="text-xs text-muted-foreground">
          {translate('Quiz address is not configured.')}
        </p>
      )}
    </div>
  );
}
