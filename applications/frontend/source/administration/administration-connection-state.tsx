import { ChevronDown, CircleHelp, Monitor, RefreshCw, Server, Unplug } from 'lucide-react';
import { Button } from '../components/button';
import { useLocalization } from '../localization/use-localization';
import { AdministrationConnectionContent } from './administration-content';

interface AdministrationConnectionStateProperties {
  readonly message: string;
  readonly onRetry: () => void;
}

export function AdministrationConnectionState({
  message,
  onRetry,
}: AdministrationConnectionStateProperties): UIElement {
  const { t } = useLocalization();
  const content = AdministrationConnectionContent;

  return (
    <div className="connection-state">
      <div className="connection-route" aria-hidden="true">
        <span className="connection-node">
          <Monitor />
        </span>
        <span className="connection-line" />
        <span className="connection-break">
          <Unplug />
        </span>
        <span className="connection-line" />
        <span className="connection-node connection-node-unavailable">
          <Server />
        </span>
      </div>
      <div role="alert" className="connection-heading">
        <span className="connection-status">
          <span />
          {t(content.Status)}
        </span>
        <h1 className="auth-title">{t(content.Title)}</h1>
        <p className="auth-description">{t(content.Description)}</p>
      </div>
      <div className="connection-next">
        <CircleHelp aria-hidden="true" />
        <div>
          <h2>{t(content.NextTitle)}</h2>
          <p>{t(content.NextDescription)}</p>
        </div>
      </div>
      <Button className="connection-retry" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        {t(content.Retry)}
      </Button>
      <p className="connection-help">{t(content.Help)}</p>
      <details className="connection-details">
        <summary>
          {t(content.Details)}
          <ChevronDown aria-hidden="true" />
        </summary>
        <p>{t(message)}</p>
      </details>
    </div>
  );
}
