import { useLocalization } from '../localization/use-localization';
import { Ellipsis, FileSearch, Rocket } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';
import type { ConfigurationVersionMetadata } from '../management/management-types';
import { WorkspaceNavigation, WorkspacePage } from '../workspace/workspace-navigation';
import { ConfigurationContent } from './configuration-content';
import { ConfigurationFormat } from './configuration-format';

interface ConfigurationVersionActionsProperties {
  version: ConfigurationVersionMetadata;
  live: boolean;
  onPublish: (returnFocusTarget: HTMLButtonElement | null) => void;
}

export function ConfigurationVersionActions({
  version,
  live,
  onPublish,
}: ConfigurationVersionActionsProperties): UIElement {
  const { t } = useLocalization();
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          variant="ghost"
          size="icon"
          aria-label={`${t(ConfigurationContent.Actions)} for version ${version.version}`}
        >
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{ConfigurationFormat.version(version.version)}</DropdownMenuLabel>
          <DropdownMenuItem asChild className="min-h-11 sm:min-h-8">
            <a
              href={WorkspaceNavigation.href(
                WorkspacePage.Version,
                version.funnelIdentifier,
                version.identifier,
              )}
            >
              <FileSearch />
              {t(ConfigurationContent.Inspect)}
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="min-h-11 sm:min-h-8"
            disabled={live}
            onSelect={() => {
              onPublish(trigger.current);
            }}
          >
            <Rocket />
            {t(ConfigurationContent.Publish)}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
