import { useLocalization } from '../localization/use-localization';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Layers3 } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../components/input-group';
import { Field, FieldError, FieldGroup, FieldLabel } from '../components/field';
import { WorkspaceNavigation, type WorkspacePage } from './workspace-navigation';
import { WorkspaceContent } from './workspace-content';

export function FunnelSelector({
  funnelIdentifier,
  page,
}: {
  funnelIdentifier: string;
  page: WorkspacePage;
}): UIElement {
  const { t } = useLocalization();

  const [draft, setDraft] = useState(funnelIdentifier);
  const [invalid, setInvalid] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const identifier = draft.trim();

    if (!WorkspaceNavigation.validIdentifier(identifier)) {
      setInvalid(true);

      return;
    }

    setInvalid(false);
    WorkspaceNavigation.navigate(page, identifier);
  };

  return (
    <form onSubmit={submit} className="w-full sm:max-w-xs">
      <FieldGroup>
        <Field data-invalid={invalid}>
          <FieldLabel htmlFor="workspace-funnel" className="sr-only">
            {t(WorkspaceContent.Funnel)}
          </FieldLabel>
          <InputGroup className="h-10">
            <InputGroupAddon>
              <Layers3 aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="workspace-funnel"
              value={draft}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setDraft(event.target.value);
                setInvalid(false);
              }}
              aria-invalid={invalid}
              aria-describedby={invalid ? 'workspace-funnel-error' : undefined}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                aria-label={t(WorkspaceContent.OpenFunnel)}
                type="submit"
              >
                <ArrowRight />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {invalid && (
            <FieldError id="workspace-funnel-error">{t(WorkspaceContent.InvalidFunnel)}</FieldError>
          )}
        </Field>
      </FieldGroup>
    </form>
  );
}
