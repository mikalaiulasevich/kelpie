import { ConfigurationInspectionProjection } from './configuration-inspection-projection';
import { ConfigurationInspectionContent } from './configuration-inspection-content';
import { useLocalization } from '../localization/use-localization';
import { type FunnelConfiguration, type ExperimentVariant as Variant } from '@kelpie/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { Target, MousePointer2, ListChecks } from 'lucide-react';
import { ConfigurationJson } from './configuration-json';

interface ConfigurationResultsPanelProperties {
  readonly configuration: FunnelConfiguration;
  readonly variant: Variant;
}
export function ConfigurationResultsPanel({
  configuration,
  variant,
}: ConfigurationResultsPanelProperties) {
  const { t: translate } = useLocalization();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>{translate(ConfigurationInspectionContent.ResultSelection)}</CardTitle>
          <CardDescription>
            {translate(ConfigurationInspectionContent.ResultSelectionDescription)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4">
          {configuration.resultRules.map((rule, index) => (
            <div key={index} className="min-w-0">
              <div className="result-rule-heading">
                <span className="result-rule-order">
                  <span className="sr-only">{translate(ConfigurationInspectionContent.Rule)}</span>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="result-rule-label">
                  {translate(ConfigurationInspectionContent.ShowResult)}
                </span>
                <code className="result-rule-target">{rule.resultId}</code>
              </div>
              <ConfigurationJson value={rule.when} />
            </div>
          ))}
          <div className="result-rule-heading result-rule-fallback">
            <span className="result-rule-label">
              {translate(ConfigurationInspectionContent.OtherwiseShow)}
            </span>
            <code className="result-rule-target">{configuration.defaultResultId}</code>
          </div>
        </CardContent>
      </Card>
      <section
        className="result-catalog"
        aria-label={translate(ConfigurationInspectionContent.ConfiguredResults)}
      >
        <div className="result-catalog-heading">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Target className="size-4 text-primary" aria-hidden="true" />
            {translate(ConfigurationInspectionContent.ResultContent)}{' '}
            <span className="text-muted-foreground">
              {Object.keys(configuration.results).length}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {translate(ConfigurationInspectionContent.PreviewForVariant)} {variant}{' '}
            {translate(ConfigurationInspectionContent.IncludesContentOverrides)}
          </p>
        </div>
        <div className="result-catalog-grid">
          {Object.values(configuration.results).map((originalResult) => {
            const result = ConfigurationInspectionProjection.result(
              configuration,
              variant,
              originalResult,
            );

            return (
              <Card key={result.id} className="result-content-card compact-card min-w-0">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span className="result-content-icon">
                      <Target className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="result-content-title break-words">
                        {result.title}
                      </CardTitle>
                      <p className="mt-1 break-all text-xs text-muted-foreground">{result.id}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.id === configuration.defaultResultId && (
                      <span className="result-content-tag">
                        {translate(ConfigurationInspectionContent.DefaultResult)}
                      </span>
                    )}
                    {Object.hasOwn(
                      configuration.experiment.variants[variant].resultOverrides,
                      result.id,
                    ) && (
                      <span className="result-content-tag">
                        {translate(ConfigurationInspectionContent.Variant)} {variant}{' '}
                        {translate(ConfigurationInspectionContent.Override)}
                      </span>
                    )}
                  </div>
                  <CardDescription className="result-content-summary break-words">
                    {result.summary}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-1 flex-col gap-3">
                  <h4 className="flex items-center gap-2 text-xs font-medium">
                    <ListChecks className="size-4 text-primary" aria-hidden="true" />
                    {translate(ConfigurationInspectionContent.Recommendations)}{' '}
                    <span className="text-muted-foreground">{result.recommendations.length}</span>
                  </h4>
                  <ol className="result-recommendations">
                    {result.recommendations.map((recommendation, index) => (
                      <li key={index}>
                        <span className="result-recommendation-number" aria-hidden="true">
                          {index + 1}
                        </span>
                        <span className="break-words">{recommendation}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="result-primary-action">
                    <MousePointer2
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {translate(ConfigurationInspectionContent.PrimaryActionPreview)}
                      </p>
                      <p className="mt-1 break-words text-sm font-medium">{result.cta.label}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {translate(ConfigurationInspectionContent.Action)} {result.cta.action}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
