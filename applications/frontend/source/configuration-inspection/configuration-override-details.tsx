import { ConfigurationInspectionContent } from './configuration-inspection-content';
import { useLocalization } from '../localization/use-localization';
import { ChevronDown, FilePenLine, Flag } from 'lucide-react';
import { ConfigurationJson } from './configuration-json';

interface ConfigurationOverrideDetailsProperties {
  readonly kind: 'steps' | 'results';
  readonly changes: Optional<Readonly<Record<string, unknown>>>;
}

export function ConfigurationOverrideDetails({
  kind,
  changes,
}: ConfigurationOverrideDetailsProperties): UIElement {
  const { t: translate } = useLocalization();
  const identifiers = Object.keys(changes ?? {});
  const isSteps = kind === 'steps';
  const Icon = isSteps ? FilePenLine : Flag;
  const itemLabel = identifiers.length === 1 ? kind.slice(0, -1) : kind;
  const description =
    identifiers.length > 0
      ? translate(ConfigurationInspectionContent.OverrideCountDescription, {
          count: identifiers.length,
          kind: translate(itemLabel),
        })
      : translate(ConfigurationInspectionContent.NoOverridesDescription, { kind: translate(kind) });

  return (
    <details className="override-disclosure">
      <summary>
        <span className="override-disclosure-icon">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="override-disclosure-label">
          <span className="override-disclosure-title">
            {isSteps
              ? translate(ConfigurationInspectionContent.StepContentChanges)
              : translate(ConfigurationInspectionContent.ResultChanges)}
            <span className="override-disclosure-count">{identifiers.length}</span>
          </span>
          <span className="override-disclosure-description">{description}</span>
        </span>
        <ChevronDown className="override-disclosure-chevron size-4" aria-hidden="true" />
      </summary>
      <div className="override-disclosure-content">
        {identifiers.length > 0 ? (
          <>
            <div className="override-disclosure-targets">
              <span className="text-xs text-muted-foreground">
                {translate(ConfigurationInspectionContent.Affected)} {translate(kind)}
              </span>
              <ul>
                {identifiers.map((identifier) => (
                  <li key={identifier}>{identifier}</li>
                ))}
              </ul>
            </div>
            <ConfigurationJson value={changes} />
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {translate(ConfigurationInspectionContent.ThisVariantInheritsAll)}{' '}
            {isSteps
              ? translate(ConfigurationInspectionContent.StepContent)
              : translate(ConfigurationInspectionContent.InheritedResultContent)}{' '}
            {translate(ConfigurationInspectionContent.FromTheOriginalConfiguration)}
          </p>
        )}
      </div>
    </details>
  );
}
