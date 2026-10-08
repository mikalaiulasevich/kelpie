import { useCallback, useId, useState } from 'react';
import { BadgeCheck, Unplug } from 'lucide-react';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { useLocalization } from '../localization/use-localization';
import { useManagementRead } from '../management/use-management-read';
import { AnalyticsGoalClient } from './analytics-goal-client';
import { useAnalyticsGoalCommand } from './use-analytics-goal-command';
import type {
  AnalyticsOutcomeRequest,
  AnalyticsBusinessOutcomeCount,
} from './analytics-goal-schemas';

interface AnalyticsBusinessPanelProperties {
  funnelIdentifier: string;
  outcomes?: Optional<readonly AnalyticsBusinessOutcomeCount[]>;
  sessionIdentifier?: string;
  onUnauthorized: () => void;
  onChanged?: () => void;
}

export function AnalyticsBusinessPanel(properties: AnalyticsBusinessPanelProperties): UIElement {
  return (
    <BusinessOutcomeForm
      key={`${properties.funnelIdentifier}:${properties.sessionIdentifier ?? ''}`}
      {...properties}
    />
  );
}

function BusinessOutcomeForm({
  funnelIdentifier,
  outcomes,
  sessionIdentifier = '',
  onUnauthorized,
  onChanged,
}: AnalyticsBusinessPanelProperties): UIElement {
  const { t, locale } = useLocalization();
  const identifier = useId();
  const command = useAnalyticsGoalCommand(onUnauthorized, onChanged);
  const request = useCallback(
    (signal: AbortSignal) => AnalyticsGoalClient.overview(funnelIdentifier, signal),
    [funnelIdentifier],
  );
  const read = useManagementRead(String(command.sequence), request, onUnauthorized);
  const [session, setSession] = useState(sessionIdentifier);
  const [externalIdentifier, setExternalIdentifier] = useState('');
  const [source, setSource] = useState('manual');
  const [occurredAt, setOccurredAt] = useState('');
  const [kind, setKind] = useState<AnalyticsOutcomeRequest['kind']>('lead');

  return (
    <section
      className="rounded-xl border bg-card p-5 space-y-4"
      aria-labelledby={`${identifier}-title`}
    >
      <header className="flex gap-3">
        <BadgeCheck className="size-5 text-primary mt-1" />
        <div>
          <h3 id={`${identifier}-title`} className="font-semibold">
            {t('Business outcomes')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t(
              'Recommendation opens measure engagement. Leads and purchases require separate confirmation.',
            )}
          </p>
        </div>
      </header>
      <div className="flex gap-2 rounded-lg bg-muted/40 p-3 text-sm">
        <Unplug className="size-4 shrink-0 mt-0.5" />
        <p>
          {t(
            'No automated connector is configured. Records below are administrator-reported, not verified sales.',
          )}
        </p>
      </div>
      {outcomes && (
        <div className="border-t pt-3 space-y-2">
          <h4 className="font-medium">{t('Selected report cohort')}</h4>
          <p className="text-xs text-muted-foreground">
            {t(
              'Unique sessions with a confirmed outcome within the selected conversion window. Manual and integration counts may overlap.',
            )}
          </p>
          <dl className="grid grid-cols-3 gap-3">
            {outcomes.map((outcome) => (
              <div key={outcome.kind}>
                <dt className="text-sm text-muted-foreground">{t(outcome.kind)}</dt>
                <dd className="text-xl tabular-nums">
                  {new Intl.NumberFormat(locale).format(outcome.sessions)}
                </dd>
                <p className="text-xs text-muted-foreground">
                  {t('Manual')}: {outcome.manualSessions} · {t('Integration')}:{' '}
                  {outcome.integrationSessions}
                </p>
              </div>
            ))}
          </dl>
        </div>
      )}
      <details className="space-y-3 border-t pt-3">
        <summary className="cursor-pointer text-sm font-medium">
          {t('All-time outcome records')}
        </summary>
        <p className="text-xs text-muted-foreground">
          {t(
            'All-time records for this funnel, including synthetic traffic. These are event counts, not unique customers or conversion rates.',
          )}
        </p>
        {read.status === 'loading' && <p role="status">{t('Loading…')}</p>}
        {read.status === 'error' && (
          <p role="alert" className="text-destructive">
            {t(read.message)}
          </p>
        )}
        {read.status === 'ready' && (
          <dl className="grid grid-cols-3 gap-3">
            {(['lead', 'qualified', 'purchase'] as const).map((outcome) => (
              <div key={outcome} className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">{t(outcome)}</dt>
                <dd className="text-2xl tabular-nums font-medium">
                  {new Intl.NumberFormat(locale).format(
                    read.data.counts
                      .filter((row) => row.kind === outcome)
                      .reduce((total, row) => total + row.count, 0),
                  )}
                </dd>
                <p className="text-xs text-muted-foreground">
                  {t('Manual')}:{' '}
                  {read.data.counts
                    .filter((row) => row.kind === outcome && row.provenance === 'manual')
                    .reduce((total, row) => total + row.count, 0)}{' '}
                  · {t('Integration')}:{' '}
                  {read.data.counts
                    .filter((row) => row.kind === outcome && row.provenance === 'integration')
                    .reduce((total, row) => total + row.count, 0)}
                </p>
              </div>
            ))}
          </dl>
        )}
      </details>
      <details className="border-t pt-3" open={!!sessionIdentifier}>
        <summary className="cursor-pointer font-medium">{t('Record a confirmed outcome')}</summary>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void command.execute((signal) =>
              AnalyticsGoalClient.recordOutcome(
                {
                  sessionIdentifier: session,
                  externalIdentifier,
                  source,
                  kind,
                  provenance: 'manual',
                  occurredAt: new Date(occurredAt).toISOString(),
                },
                signal,
              ),
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              {t('Public analytics session identifier')}
              <Input
                required
                value={session}
                disabled={command.pending}
                onChange={(event) => setSession(event.target.value)}
                pattern="[0-9a-fA-F-]{36}"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t('Outcome')}
              <select
                className="h-9 rounded-md border bg-background px-2"
                value={kind}
                disabled={command.pending}
                onChange={(event) => {
                  const value = event.target.value;

                  if (value === 'lead' || value === 'qualified' || value === 'purchase') {
                    setKind(value);
                  }
                }}
              >
                <option value="lead">{t('Lead')}</option>
                <option value="qualified">{t('Qualified lead')}</option>
                <option value="purchase">{t('Purchase')}</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              {t('Source')}
              <Input
                required
                value={source}
                maxLength={80}
                pattern="[a-zA-Z0-9][a-zA-Z0-9._-]*"
                disabled={command.pending}
                onChange={(event) => setSource(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t('External record identifier')}
              <Input
                required
                value={externalIdentifier}
                maxLength={200}
                disabled={command.pending}
                onChange={(event) => setExternalIdentifier(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t('Occurred at · local time')}
              <Input
                type="datetime-local"
                required
                value={occurredAt}
                disabled={command.pending}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              'Use the same source and external identifier when retrying. Do not enter names, email addresses or other personal data.',
            )}
          </p>
          <Button type="submit" disabled={command.pending}>
            {t(command.pending ? 'Saving…' : 'Record outcome')}
          </Button>
        </form>
      </details>
      {command.message && (
        <p role="status" className="text-sm">
          {t(command.message)}
        </p>
      )}
    </section>
  );
}
