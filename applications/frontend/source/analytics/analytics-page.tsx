import { useActionShortcuts } from '../workspace/use-action-shortcuts';
import { ActionShortcutCatalog } from '../workspace/action-shortcuts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../components/button';
import { LoadErrorState } from '../components/load-error-state';
import { SkeletonSummary, SkeletonChart } from '../components/skeleton';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsVersionPicker } from './analytics-version-picker';
import { useAnalytics } from './use-analytics';
import { AnalyticsReportState, type ReportSelection } from './analytics-report-state';
import { AnalyticsReportOperations as Report } from './analytics-report-operations';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportDraft } from './analytics-report-draft';
import { AnalyticsReportControls } from './analytics-report-controls';
import { AnalyticsReportOverview } from './analytics-report-overview';
import { AnalyticsReportTrend } from './analytics-report-trend';
import { AnalyticsReportSegments } from './analytics-report-segments';
import { AnalyticsReportSteps } from './analytics-report-steps';
import { AnalyticsExperimentPanel } from './analytics-experiment-panel';
import { AnalyticsBusinessPanel } from './analytics-business-panel';

interface AnalyticsPageProperties {
  readonly funnelIdentifier: string;
  readonly onUnauthorized: () => void;
}

export function AnalyticsPage({ funnelIdentifier, onUnauthorized }: AnalyticsPageProperties) {
  const { t } = useLocalization();
  const periodControls = useRef<HTMLDivElement>(null);
  const businessPanel = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState(() => AnalyticsReportState.fromHash(location.hash));
  const [restorationSequence, setRestorationSequence] = useState(0);
  const [sequence, setSequence] = useState(0);
  const [sessionIdentifier, setSessionIdentifier] = useState('');
  useEffect(() => {
    const restore = () => {
      setSelection(AnalyticsReportState.fromHash(location.hash));
      setRestorationSequence((value) => value + 1);
      setSessionIdentifier('');
    };

    window.addEventListener('hashchange', restore);
    window.addEventListener('popstate', restore);

    return () => {
      window.removeEventListener('hashchange', restore);
      window.removeEventListener('popstate', restore);
    };
  }, []);
  const query = useMemo(
    () => Report.query(funnelIdentifier, selection),
    [funnelIdentifier, selection],
  );
  const analytics = useAnalytics(query, sequence, onUnauthorized);
  const version = analytics.status === 'ready' ? analytics.response.versions[0] : undefined;
  const apply = (next: ReportSelection) => {
    setSelection(next);
    setSessionIdentifier('');
    history.replaceState(null, '', AnalyticsReportState.hash(funnelIdentifier, next));
  };

  const refresh = () => setSequence((value) => value + 1);
  useActionShortcuts([
    {
      shortcut: ActionShortcutCatalog.Refresh,
      enabled: analytics.status !== 'loading',
      activate: refresh,
    },
    {
      shortcut: ActionShortcutCatalog.Filters,
      enabled: true,
      activate: () =>
        periodControls.current?.querySelector<HTMLInputElement>('input[type="date"]')?.focus(),
    },
  ]);

  return (
    <div className="workspace-page flex min-w-0 flex-col gap-4">
      <div ref={periodControls}>
        <AnalyticsReportControls
          key={`${funnelIdentifier}:${restorationSequence}:${AnalyticsReportDraft.periodKey(selection)}`}
          selection={selection}
          funnelIdentifier={funnelIdentifier}
          onApply={apply}
          onExport={
            analytics.status === 'ready' ? () => Report.download(analytics.response) : undefined
          }
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AnalyticsVersionPicker
          funnelIdentifier={funnelIdentifier}
          refreshSequence={sequence}
          selectedIdentifier={version?.versionIdentifier ?? selection.versionIdentifier}
          selectedLabel={
            version
              ? `v${version.funnelVersion}`
              : t(selection.versionIdentifier ? Content.SelectedVersion : Content.ActiveVersion)
          }
          onUnauthorized={onUnauthorized}
          onRefresh={refresh}
          onSelect={(versionIdentifier) => apply({ ...selection, versionIdentifier })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            {t(Content.Traffic)}
            <select
              className="report-select"
              value={selection.trafficOrigin}
              onChange={(event) => {
                const value = event.target.value;

                if (value === 'production' || value === 'synthetic' || value === 'all') {
                  apply({ ...selection, trafficOrigin: value });
                }
              }}
            >
              <option value="production">{t(Content.Production)}</option>
              <option value="synthetic">{t(Content.Synthetic)}</option>
              <option value="all">{t(Content.AllTraffic)}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selection.includeForced}
              onChange={(event) => apply({ ...selection, includeForced: event.target.checked })}
            />
            {t(Content.Forced)}
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={analytics.status === 'loading'}
            onClick={refresh}
          >
            <RefreshCw className="size-4" />
            {t('Refresh')}
          </Button>
        </div>
      </div>
      {analytics.status === 'loading' && (
        <div aria-busy="true" aria-label={t(Content.Loading)}>
          <SkeletonSummary />
          <SkeletonChart />
        </div>
      )}
      {analytics.status === 'failed' && (
        <LoadErrorState
          title={t(Content.Unavailable)}
          message={analytics.message}
          onRetry={refresh}
          retryLabel={Content.Retry}
        />
      )}
      {analytics.status === 'ready' && (
        <>
          <AnalyticsReportOverview response={analytics.response} />
          <AnalyticsReportTrend response={analytics.response} />
          <AnalyticsReportSegments
            response={analytics.response}
            selection={selection}
            onApply={apply}
          />
          {version && (
            <AnalyticsReportSteps
              key={`steps:${version.versionIdentifier}`}
              response={analytics.response}
              version={version}
              query={query}
              onUnauthorized={onUnauthorized}
              onSession={(identifier) => {
                setSessionIdentifier(identifier);
                businessPanel.current?.scrollIntoView({ block: 'start' });
              }}
            />
          )}
          {version && (
            <AnalyticsExperimentPanel
              key={`experiment:${version.versionIdentifier}`}
              versionIdentifier={version.versionIdentifier}
              evidence={analytics.response.insights?.experiments.find(
                (item) => item.versionIdentifier === version.versionIdentifier,
              )}
              onUnauthorized={onUnauthorized}
              onChanged={refresh}
            />
          )}
          <div ref={businessPanel}>
            <AnalyticsBusinessPanel
              funnelIdentifier={funnelIdentifier}
              outcomes={analytics.response.insights?.businessOutcomes}
              sessionIdentifier={sessionIdentifier}
              onUnauthorized={onUnauthorized}
              onChanged={refresh}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t(Content.ExportDescription)} ·{' '}
            {Report.timestamp(analytics.response.generatedAt, selection.timezone)}
          </p>
        </>
      )}
    </div>
  );
}
