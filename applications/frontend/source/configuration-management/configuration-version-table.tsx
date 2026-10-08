import { useLocalization } from '../localization/use-localization';
import { FileJson, ArrowDownUp } from 'lucide-react';
import type {
  ConfigurationVersionMetadata,
  ConfigurationList,
} from '../management/management-types';
import { Button } from '../components/button';
import { ConfigurationStatus } from './configuration-library-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/table';
import { WorkspaceNavigation, WorkspacePage } from '../workspace/workspace-navigation';
import { ConfigurationVersionActions } from './configuration-version-actions';
import { ConfigurationContent } from './configuration-content';
import { ConfigurationFormat } from './configuration-format';
interface ConfigurationVersionTableProperties {
  readonly versions: ConfigurationList['items'];
  readonly funnelIdentifier: string;
  readonly activeVersionIdentifier: string | null;
  readonly revision: number;
  readonly descending: boolean;
  readonly showSchema: boolean;
  readonly showChecksum: boolean;
  readonly onSort: () => void;
  readonly onPublish: (
    version: ConfigurationVersionMetadata,
    revision: number,
    returnFocusTarget?: HTMLElement,
  ) => void;
}

export function ConfigurationVersionTable({
  versions,
  funnelIdentifier,
  activeVersionIdentifier,
  revision,
  descending,
  showSchema,
  showChecksum,
  onSort,
  onPublish,
}: ConfigurationVersionTableProperties): UIElement {
  const { t: translate } = useLocalization();

  return (
    <Table className="[&_td]:py-4 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
      <TableHeader>
        <TableRow>
          <TableHead aria-sort={descending ? 'descending' : 'ascending'}>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3"
              aria-label={translate(ConfigurationContent.SortVersions)}
              onClick={() => onSort()}
            >
              {translate(ConfigurationContent.Version)}
              <ArrowDownUp data-icon="inline-end" />
            </Button>
          </TableHead>
          <TableHead>{translate(ConfigurationContent.Status)}</TableHead>
          {showSchema && <TableHead>{translate(ConfigurationContent.Schema)}</TableHead>}
          {showChecksum && <TableHead>{translate(ConfigurationContent.Checksum)}</TableHead>}
          <TableHead className="text-right">{translate(ConfigurationContent.Actions)}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((version) => {
          const live = version.identifier === activeVersionIdentifier;

          return (
            <TableRow key={version.identifier}>
              <TableCell>
                <Button
                  variant="link"
                  className="h-auto justify-start p-0 font-medium text-foreground"
                  asChild
                >
                  <a
                    href={WorkspaceNavigation.href(
                      WorkspacePage.Version,
                      funnelIdentifier,
                      version.identifier,
                    )}
                    aria-label={translate(ConfigurationContent.VersionDetailsLabel, {
                      version: version.version,
                    })}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                      <FileJson className="size-5" />
                    </span>
                    <span className="flex flex-col gap-1 text-left">
                      <span>{ConfigurationFormat.version(version.version)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {version.description ?? version.funnelIdentifier}
                      </span>
                    </span>
                  </a>
                </Button>
              </TableCell>
              <TableCell>
                <ConfigurationStatus live={live} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {translate('Imported')}:{' '}
                  {version.importedAt
                    ? ConfigurationFormat.date(version.importedAt)
                    : translate('Not recorded')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {version.importedBy ?? translate('Importer not recorded')}
                </p>
              </TableCell>
              {showSchema && (
                <TableCell>
                  <span className="text-sm text-muted-foreground">{version.schemaVersion}</span>
                </TableCell>
              )}
              {showChecksum && (
                <TableCell>
                  <code title={version.checksum} className="text-xs text-muted-foreground">
                    {ConfigurationFormat.identifier(version.checksum)}
                  </code>
                </TableCell>
              )}
              <TableCell>
                <div className="flex justify-end">
                  <ConfigurationVersionActions
                    version={version}
                    live={live}
                    onPublish={(returnFocusTarget) =>
                      onPublish(version, revision, returnFocusTarget ?? undefined)
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
