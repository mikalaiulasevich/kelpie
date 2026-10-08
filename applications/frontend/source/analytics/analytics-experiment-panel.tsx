import { isNull } from 'es-toolkit/predicate';
import { useCallback, useId, useState } from 'react';
import { FlaskConical, LockKeyhole } from 'lucide-react';
import { Button } from '../components/button';
import { Input } from '../components/input';
import { useLocalization } from '../localization/use-localization';
import { useManagementRead } from '../management/use-management-read';
import { AnalyticsGoalClient } from './analytics-goal-client';
import { useAnalyticsGoalCommand } from './use-analytics-goal-command';
import type {
  AnalyticsExperimentPlanRequest,
  AnalyticsExperimentEvidence,
} from './analytics-goal-schemas';

interface AnalyticsExperimentPanelProperties {
  versionIdentifier: string;
  evidence?: AnalyticsExperimentEvidence;
  onUnauthorized: () => void;
  onChanged?: () => void;
}

export function AnalyticsExperimentPanel(
  properties: AnalyticsExperimentPanelProperties,
): UIElement {
  return <ExperimentPlanForm key={properties.versionIdentifier} {...properties} />;
}

function ExperimentPlanForm({
  versionIdentifier,
  evidence,
  onUnauthorized,
  onChanged,
}: AnalyticsExperimentPanelProperties): UIElement {
  const { t, locale } = useLocalization();
  const identifier = useId();
  const command = useAnalyticsGoalCommand(onUnauthorized, onChanged);
  const request = useCallback(
    (signal: AbortSignal) => AnalyticsGoalClient.plan(versionIdentifier, signal),
    [versionIdentifier],
  );
  const read = useManagementRead(String(command.sequence), request, onUnauthorized);
  const [hypothesis, setHypothesis] = useState('');
  const [primaryMetric, setPrimaryMetric] =
    useState<AnalyticsExperimentPlanRequest['primaryMetric']>('recommendation_open');
  const [target, setTarget] = useState('');
  const [endDate, setEndDate] = useState('');
  const plan = read.status === 'ready' ? read.data.plan : null;
  const percentage = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });

  return (
    <section
      className="rounded-xl border bg-card p-5 space-y-4"
      aria-labelledby={`${identifier}-title`}
    >
      <header className="flex items-start gap-3">
        <FlaskConical className="size-5 text-primary mt-1" />
        <div>
          <h3 id={`${identifier}-title`} className="font-semibold">
            {t('Experiment decision plan')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('Register the hypothesis and stopping rule before interpreting a winner.')}
          </p>
        </div>
      </header>
      {read.status === 'loading' && <p role="status">{t('Loading…')}</p>}
      {read.status === 'error' && (
        <p role="alert" className="text-destructive">
          {t(read.message)}
        </p>
      )}
      {read.status === 'ready' && (
        <p className="text-sm">
          {t('Configured allocation')}: A {percentage.format(read.data.expectedAllocationA)} · B{' '}
          {percentage.format(1 - read.data.expectedAllocationA)}
        </p>
      )}
      {plan && (
        <div className="space-y-3">
          <div className="flex gap-2 text-sm text-muted-foreground">
            <LockKeyhole className="size-4" />
            {t('Recorded plan · immutable')}
          </div>
          <p>{plan.hypothesis}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t('Primary outcome')}</dt>
              <dd>{t(plan.primaryMetric)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('Target per variant')}</dt>
              <dd>{new Intl.NumberFormat(locale).format(plan.targetSamplePerVariant)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('Planned end')}</dt>
              <dd>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(plan.plannedEndAt))}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            {t(
              'Reaching the target is not proof of a treatment effect. Check uncertainty and allocation before deciding.',
            )}
          </p>
        </div>
      )}
      {read.status === 'ready' && !plan && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void command.execute((signal) =>
              AnalyticsGoalClient.savePlan(
                versionIdentifier,
                {
                  hypothesis,
                  primaryMetric,
                  targetSamplePerVariant: Number(target),
                  plannedEndAt: new Date(endDate).toISOString(),
                },
                signal,
              ),
            );
          }}
        >
          <label className="grid gap-1 text-sm" htmlFor={`${identifier}-hypothesis`}>
            {t('Hypothesis')}
            <textarea
              id={`${identifier}-hypothesis`}
              className="min-h-20 rounded-md border bg-background p-2"
              required
              minLength={10}
              maxLength={2000}
              value={hypothesis}
              disabled={command.pending}
              onChange={(event) => setHypothesis(event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">
              {t('Primary outcome')}
              <select
                className="h-9 rounded-md border bg-background px-2"
                value={primaryMetric}
                disabled={command.pending}
                onChange={(event) => {
                  const metric = event.target.value;

                  if (
                    metric === 'lead' ||
                    metric === 'qualified' ||
                    metric === 'purchase' ||
                    metric === 'recommendation_open'
                  ) {
                    setPrimaryMetric(metric);
                  }
                }}
              >
                <option value="recommendation_open">{t('Recommendation opened')}</option>
                <option value="lead">{t('Lead')}</option>
                <option value="qualified">{t('Qualified lead')}</option>
                <option value="purchase">{t('Purchase')}</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              {t('Target per variant')}
              <Input
                required
                type="number"
                min={1}
                max={10000000}
                step={1}
                value={target}
                disabled={command.pending}
                onChange={(event) => setTarget(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              {t('Planned end · local time')}
              <Input
                required
                type="datetime-local"
                value={endDate}
                disabled={command.pending}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              'The saved plan cannot be edited. Existing traffic predates this registration; it is not a prospective experiment.',
            )}
          </p>
          <Button type="submit" disabled={command.pending}>
            {t(command.pending ? 'Saving…' : 'Register plan')}
          </Button>
        </form>
      )}
      {evidence && <ExperimentEvidence evidence={evidence} />}
      {command.message && (
        <p role="status" className="text-sm">
          {t(command.message)}
        </p>
      )}
    </section>
  );
}

function ExperimentEvidence({ evidence }: { evidence: AnalyticsExperimentEvidence }): UIElement {
  const { t, locale } = useLocalization();
  const number = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  });
  const interval =
    !isNull(evidence.lower) && !isNull(evidence.upper)
      ? `${number.format(evidence.lower * 100)} … ${number.format(evidence.upper * 100)} PP`
      : t('Not available');
  const ready =
    evidence.sampleTargetReached &&
    evidence.plannedEndReached &&
    evidence.sampleRatioMismatch === false;

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="font-medium">{t('Decision evidence')}</h4>
      <p className="text-sm font-medium text-primary">
        {t(
          ready
            ? 'Review the evidence · no automatic winner'
            : 'Insufficient evidence for a decision',
        )}
      </p>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">{t('Eligible random sessions')}</p>
          <p>
            A {evidence.startedA} · B {evidence.startedB}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('Confirmed outcomes')}</p>
          <p>
            A {evidence.convertedA} · B {evidence.convertedB}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('Effect interval · B − A')}</p>
          <p>{interval}</p>
        </div>
      </div>
      <ul className="space-y-1 text-sm">
        <li>
          {t('Target per variant')}: {evidence.targetSamplePerVariant} ·{' '}
          {t(evidence.sampleTargetReached ? 'Reached' : 'Not reached')}
        </li>
        <li>
          {t('Planned end')}:{' '}
          {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(evidence.plannedEndAt),
          )}{' '}
          · {t(evidence.plannedEndReached ? 'Reached' : 'Not reached')}
        </li>
        <li>
          {t('Allocation check')}:{' '}
          {t(ExperimentEvidencePresentation.allocation(evidence.sampleRatioMismatch))}
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        {t(
          'Experiment evidence includes random assignments after plan registration and before its end. Date and acquisition filters do not apply; traffic origin and conversion window still apply.',
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        {t(
          'Conservative 95% joint Wilson interval. Allocation check uses χ² at 0.001. These checks do not guarantee causality or statistical power.',
        )}
      </p>
    </div>
  );
}

const ExperimentEvidencePresentation = {
  allocation(mismatch: boolean | null): string {
    if (isNull(mismatch)) {
      return 'Too few sessions to check';
    }

    return mismatch
      ? 'Unexpected allocation · investigate before deciding'
      : 'No allocation mismatch detected';
  },
} as const;
