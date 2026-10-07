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
  const identifiers = Object.keys(changes ?? {});
  const isSteps = kind === 'steps';
  const Icon = isSteps ? FilePenLine : Flag;
  const itemLabel = identifiers.length === 1 ? kind.slice(0, -1) : kind;
  const description =
    identifiers.length > 0
      ? `Variant-specific overrides for ${identifiers.length} ${itemLabel}.`
      : `No overrides. Uses the original ${kind}.`;

  return (
    <details className="override-disclosure">
      <summary>
        <span className="override-disclosure-icon">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="override-disclosure-label">
          <span className="override-disclosure-title">
            {isSteps ? 'Step content changes' : 'Result changes'}
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
              <span className="text-xs text-muted-foreground">Affected {kind}</span>
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
            This variant inherits all {isSteps ? 'step content' : 'result content'} from the
            original configuration.
          </p>
        )}
      </div>
    </details>
  );
}
