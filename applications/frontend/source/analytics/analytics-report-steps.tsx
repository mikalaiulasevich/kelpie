import { Fragment, useCallback, useState } from 'react';
import { GitBranch } from 'lucide-react';
import type { AnalyticsQuery, AnalyticsResponse, AnalyticsVersion } from '../management/management-types';
import { ManagementClient } from '../management/management-client';
import { useManagementRead } from '../management/use-management-read';
import { ConfigurationInspectionProjection } from '../configuration-inspection/configuration-inspection-projection';
import { Button } from '../components/button';
import { useLocalization } from '../localization/use-localization';
import { AnalyticsReportContent as Content } from './analytics-report-content';
import { AnalyticsReportOperations as Report } from './analytics-report-operations';
import { AnalyticsStepDiagnostics } from './analytics-step-diagnostics';

interface ReportStepsProperties {
  readonly response: AnalyticsResponse;
  readonly version: AnalyticsVersion;
  readonly query: AnalyticsQuery;
  readonly onUnauthorized: () => void;
  readonly onSession: (identifier: string) => void;
}

export function AnalyticsReportSteps({ response, version, query, onUnauthorized, onSession }: ReportStepsProperties) {
  const { t } = useLocalization();
  const [selectedVariant, setSelectedVariant] = useState(version.variants[0]?.variant ?? 'A');
  const [stepIdentifier, setStepIdentifier] = useState('');
  const request = useCallback((signal: AbortSignal) => ManagementClient.configurationDocument(version.versionIdentifier, signal), [version.versionIdentifier]);
  const configuration = useManagementRead(version.versionIdentifier, request, onUnauthorized);
  const variant = version.variants.find((item) => item.variant === selectedVariant);
  if (!variant) { return null; }

  return <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
    <header className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-semibold">{t(Content.Steps)}</h3><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t(Content.StepsDescription)}</p></div><div className="flex gap-2">{version.variants.map((item) => <Button key={item.variant} size="sm" variant={item.variant === selectedVariant ? 'secondary' : 'ghost'} onClick={() => { setSelectedVariant(item.variant); setStepIdentifier(''); }}>{t(Content.Variant)} {item.variant} · {item.started}</Button>)}</div></header>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/40"><tr>{[Content.Step, Content.Views, Content.Completed, Content.Open, Content.Expired, Content.Missing, Content.Inspect].map((label) => <th key={label} className="px-4 py-4 text-xs font-medium text-muted-foreground">{t(label)}</th>)}</tr></thead><tbody>{variant.steps.map((step, index) => {
      const definition = configuration.status === 'ready' ? configuration.data.document.steps.find((item) => item.id === step.stepIdentifier) : undefined;
      const content = definition && configuration.status === 'ready' ? ConfigurationInspectionProjection.stepContent(configuration.data.document, variant.variant, definition) : undefined;
      const title = content?.title ?? content?.loadingTitle ?? step.stepIdentifier;

      return <Fragment key={step.stepIdentifier}><tr className="border-t"><td className="max-w-96 px-4 py-3"><div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span><div><span className="font-medium">{title}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{step.conditional && <GitBranch className="size-3" />}{step.stepIdentifier}</span></div></div></td><td className="px-4 py-3 tabular-nums">{step.reached}<span className="block text-xs text-muted-foreground">{Report.percentage(step.reached, variant.started)}</span></td><td className="px-4 tabular-nums">{step.type === 'result' ? '—' : step.completed}</td><td className="px-4 tabular-nums">{step.type === 'result' ? '—' : step.noncompletion.open}</td><td className="px-4 tabular-nums">{step.type === 'result' ? '—' : step.noncompletion.expired}</td><td className="px-4 tabular-nums">{step.type === 'result' ? '—' : step.completed - step.completion.numerator}</td><td className="px-4"><Button size="sm" variant="ghost" aria-expanded={stepIdentifier === step.stepIdentifier} onClick={() => setStepIdentifier(stepIdentifier === step.stepIdentifier ? '' : step.stepIdentifier)}>{t(Content.Diagnose)}</Button></td></tr>{stepIdentifier === step.stepIdentifier && <tr><td colSpan={7}><AnalyticsStepDiagnostics key={`${variant.variant}:${stepIdentifier}`} query={{ ...query, versionIdentifier: version.versionIdentifier }} response={response} variant={variant} stepIdentifier={stepIdentifier} onUnauthorized={onUnauthorized} onSession={onSession} /></td></tr>}</Fragment>;
    })}</tbody></table></div>
  </section>;
}
