import { ConfigurationInspectionContent } from './configuration-inspection-content';
import { useLocalization } from '../localization/use-localization';
import { type FunnelConfiguration } from '@kelpie/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import {
  Activity,
  Braces,
  ShieldCheck,
  Fingerprint,
  Check,
  Minus,
  ChevronDown,
} from 'lucide-react';
import { ConfigurationJson } from './configuration-json';

interface ConfigurationEventsPanelProperties {
  readonly configuration: FunnelConfiguration;
}
export function ConfigurationEventsPanel({ configuration }: ConfigurationEventsPanelProperties) {
  const { t: translate } = useLocalization();

  return (
    <div className="inspection-events grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <Card className="compact-card min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            {translate(ConfigurationInspectionContent.AnalyticsPrivacy)}
          </CardTitle>
          <CardDescription>
            {translate(ConfigurationInspectionContent.AnalyticsPrivacyDescription)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="event-privacy-list">
            <div>
              <dt>{translate(ConfigurationInspectionContent.RawAnswers)}</dt>
              <dd>
                {configuration.events.privacy.storeRawAnswers ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Minus aria-hidden="true" />
                )}
                {configuration.events.privacy.storeRawAnswers
                  ? translate(ConfigurationInspectionContent.Stored)
                  : translate(ConfigurationInspectionContent.NotStored)}
              </dd>
            </div>
            <div>
              <dt>{translate(ConfigurationInspectionContent.AnswerTypes)}</dt>
              <dd>
                {configuration.events.privacy.allowAnswerKinds ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Minus aria-hidden="true" />
                )}
                {configuration.events.privacy.allowAnswerKinds
                  ? translate(ConfigurationInspectionContent.Allowed)
                  : translate(ConfigurationInspectionContent.Excluded)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {translate(ConfigurationInspectionContent.SessionStorageDescription)}
          </p>
          <details className="event-privacy-json analytics-disclosure">
            <summary>
              <span>{translate(ConfigurationInspectionContent.ViewDeclaration)}</span>
              <ChevronDown className="analytics-disclosure-chevron" aria-hidden="true" />
            </summary>
            <ConfigurationJson value={configuration.events.privacy} />
          </details>
        </CardContent>
      </Card>
      <Card className="compact-card min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Braces className="size-4 text-primary" />
            {translate(ConfigurationInspectionContent.SharedProperties)}{' '}
            <span className="event-count">{configuration.events.baseProperties.length}</span>
          </CardTitle>
          <CardDescription>
            {translate(ConfigurationInspectionContent.SharedPropertiesDescription)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="event-property-grid">
            {configuration.events.baseProperties.map((property) => (
              <li key={property}>
                <Fingerprint aria-hidden="true" />
                <code>{property}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="compact-card min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            {translate(ConfigurationInspectionContent.EventCatalog)}
            <span className="event-count">{configuration.events.allowed.length}</span>
          </CardTitle>
          <CardDescription>
            {translate(ConfigurationInspectionContent.EventCatalogDescription)}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <ul className="event-catalog">
            {configuration.events.allowed.map((event) => (
              <li key={event.name}>
                <span className="event-catalog-icon">
                  <Activity aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3>
                    <code>{event.name}</code>
                  </h3>
                  <p>{event.trigger}</p>
                </div>
                <div className="event-catalog-properties">
                  <span className="event-property-caption">
                    {translate(ConfigurationInspectionContent.AdditionalProperties)}
                  </span>
                  {event.properties.length > 0 ? (
                    <ul>
                      {event.properties.map((property) => (
                        <li key={property}>
                          <code>{property}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {translate(ConfigurationInspectionContent.SharedPropertiesOnly)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
