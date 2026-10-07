import { Kbd, KbdGroup } from '../components/kbd';
import { ActionShortcutCatalog } from '../workspace/action-shortcuts';
import { useActionShortcuts } from '../workspace/use-action-shortcuts';
import { ManagementPolicy } from '../management/management-policy';
import { isNull } from 'es-toolkit/predicate';
import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Columns3,
  FileJson,
  RefreshCw,
  RotateCcw,
  Upload,
  Search,
  ArrowDownUp,
} from 'lucide-react';
import { ManagementClient } from '../management/management-client';
import type { ConfigurationVersionMetadata } from '../management/management-types';
import { useManagementRead } from '../management/use-management-read';
import { Button } from '../components/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../components/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/select';
import {
  ConfigurationHighlights,
  ConfigurationLibraryContext,
  ConfigurationStatus,
} from './configuration-library-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/table';
import { Separator } from '../components/separator';
import { SkeletonSummary, SkeletonRows } from '../components/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { LoadErrorState } from '../components/load-error-state';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../components/dropdown-menu';
import { WorkspaceNavigation, WorkspacePage } from '../workspace/workspace-navigation';
import { ConfigurationVersionActions } from './configuration-version-actions';

import { ConfigurationContent } from './configuration-content';
import { ConfigurationLibrary } from './configuration-library';
import { ConfigurationManagementPolicy } from './configuration-policy';
import { ConfigurationFormat } from './configuration-format';
import type { PublicationIntent } from './publication-intents';

export interface ConfigurationVersionsPageProperties {
  funnelIdentifier: string;
  revision: number;
  onUnauthorized: () => void;
  onImport: () => void;
  onIntent: (intent: PublicationIntent, returnFocusTarget?: HTMLElement) => void;
}

export function ConfigurationVersionsPage({
  funnelIdentifier,
  revision,
  onUnauthorized,
  onImport,
  onIntent,
}: ConfigurationVersionsPageProperties): UIElement {
  const [offsets, setOffsets] = useState<readonly number[]>([0]);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [descending, setDescending] = useState(true);
  const [showSchema, setShowSchema] = useState(true);
  const [showChecksum, setShowChecksum] = useState(false);
  const offset = offsets.at(-1) ?? 0;
  const request = useCallback(
    async (signal: AbortSignal) => {
      const [configurations, history] = await Promise.all([
        ManagementClient.configurations(
          { funnelIdentifier, offset, limit: ConfigurationManagementPolicy.PageSize },
          signal,
        ),
        ManagementClient.history({ funnelIdentifier, limit: 3 }, signal),
      ]);

      return { configurations, history };
    },
    [funnelIdentifier, offset],
  );
  const resource = useManagementRead(
    `${funnelIdentifier}:${offset}:${revision}:${refresh}`,
    request,
    onUnauthorized,
  );
  const reload = () => setRefresh((value) => value + 1);
  useActionShortcuts([
    { shortcut: ActionShortcutCatalog.Import, enabled: true, activate: onImport },
    {
      shortcut: ActionShortcutCatalog.Refresh,
      enabled: resource.status !== 'loading',
      activate: reload,
    },
  ]);
  const publish = (
    version: ConfigurationVersionMetadata,
    expectedRevision: number,
    returnFocusTarget?: HTMLElement,
  ) =>
    onIntent(
      {
        kind: 'publish',
        label: ConfigurationFormat.version(version.version),
        command: {
          operationIdentifier: globalThis.crypto.randomUUID(),
          funnelIdentifier,
          targetVersionIdentifier: version.identifier,
          expectedRevision,
        },
      },
      returnFocusTarget,
    );

  return (
    <div className="workspace-page flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="screen-heading flex flex-col gap-3">
          <h1 className="page-title">{ConfigurationContent.Heading}</h1>
          <p className="page-description">{ConfigurationContent.Description}</p>
        </div>
        <Button
          onClick={onImport}
          className="primary-cta"
          aria-keyshortcuts={ActionShortcutCatalog.Import.aria}
        >
          {ConfigurationContent.Import}
          <KbdGroup aria-hidden="true" className="ml-1 hidden sm:inline-flex">
            <Kbd>Alt</Kbd>
            <Kbd>{ActionShortcutCatalog.Import.key}</Kbd>
          </KbdGroup>
          <span className="cta-icon" aria-hidden="true">
            <Upload />
          </span>
        </Button>
      </div>
      {resource.status === 'loading' && (
        <div role="status" aria-label="Loading configurations" className="flex flex-col gap-4">
          <SkeletonSummary />
          <SkeletonRows />
        </div>
      )}
      {resource.status === 'error' && (
        <LoadErrorState
          title="Configurations could not be loaded"
          message={resource.message}
          onRetry={reload}
          retryLabel="Try again"
        />
      )}
      {resource.status === 'ready' &&
        (() => {
          const { configurations, history } = resource.data;
          const lastActivation = history.items[0];
          const query = search.trim().toLowerCase();
          const visibleVersions = ConfigurationLibrary.select(configurations, {
            search,
            status: statusFilter,
            descending,
          });
          const canRollback =
            !!lastActivation?.previousVersionIdentifier &&
            history.funnel.revision === configurations.funnel.revision;

          return (
            <>
              <div className="grid min-w-0 items-start gap-6 min-[1280px]:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-w-0 flex-col gap-7">
                  {configurations.items.length > 0 && (
                    <ConfigurationHighlights configurations={configurations} />
                  )}
                  <Card className="gap-0 overflow-hidden">
                    <CardHeader className="flex flex-wrap items-center justify-between gap-4 pb-6">
                      <div className="flex flex-col gap-1.5">
                        <CardTitle>
                          {ConfigurationContent.Library}{' '}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {configurations.items.length}
                          </span>
                        </CardTitle>
                        <CardDescription>{funnelIdentifier}</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                              <Columns3 data-icon="inline-start" />
                              {ConfigurationContent.Columns}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>
                                {ConfigurationContent.VisibleColumns}
                              </DropdownMenuLabel>
                              <DropdownMenuCheckboxItem
                                className="min-h-11 sm:min-h-8"
                                checked={showSchema}
                                onCheckedChange={setShowSchema}
                                onSelect={(event) => event.preventDefault()}
                              >
                                {ConfigurationContent.Schema}
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                className="min-h-11 sm:min-h-8"
                                checked={showChecksum}
                                onCheckedChange={setShowChecksum}
                                onSelect={(event) => event.preventDefault()}
                              >
                                {ConfigurationContent.Checksum}
                              </DropdownMenuCheckboxItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          variant="outline"
                          onClick={reload}
                          aria-keyshortcuts={ActionShortcutCatalog.Refresh.aria}
                        >
                          <RefreshCw data-icon="inline-start" />
                          {ConfigurationContent.Refresh}
                          <KbdGroup aria-hidden="true" className="ml-1 hidden sm:inline-flex">
                            <Kbd>Alt</Kbd>
                            <Kbd>R</Kbd>
                          </KbdGroup>
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!canRollback}
                          onClick={() =>
                            onIntent({
                              kind: 'rollback',
                              label: 'Previous activated version',
                              command: {
                                operationIdentifier: globalThis.crypto.randomUUID(),
                                funnelIdentifier,
                                expectedRevision: configurations.funnel.revision,
                              },
                            })
                          }
                        >
                          <RotateCcw data-icon="inline-start" />
                          {ConfigurationContent.Rollback}
                        </Button>
                      </div>
                    </CardHeader>
                    <div className="flex flex-wrap items-center gap-3 border-t px-6 py-4">
                      <InputGroup className="min-w-48 flex-1">
                        <InputGroupAddon>
                          <Search />
                        </InputGroupAddon>
                        <InputGroupInput
                          aria-label={ConfigurationContent.Search}
                          placeholder={ConfigurationContent.SearchPlaceholder}
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                      </InputGroup>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger
                          aria-label={ConfigurationContent.FilterStatus}
                          className="w-36"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="all">{ConfigurationContent.AllStatuses}</SelectItem>
                            <SelectItem value="live">{ConfigurationContent.Live}</SelectItem>
                            <SelectItem value="draft">{ConfigurationContent.Draft}</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {(query || statusFilter !== 'all') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearch('');
                            setStatusFilter('all');
                          }}
                        >
                          {ConfigurationContent.ClearFilters}
                        </Button>
                      )}
                      <p className="basis-full text-xs text-muted-foreground">
                        {ConfigurationContent.PageFilterScope}
                      </p>
                    </div>
                    <Separator />
                    <CardContent className="px-0">
                      {configurations.items.length === 0 && (
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <FileJson />
                            </EmptyMedia>
                            <EmptyTitle>{ConfigurationContent.EmptyTitle}</EmptyTitle>
                            <EmptyDescription>
                              {ConfigurationContent.EmptyDescription}
                            </EmptyDescription>
                          </EmptyHeader>
                          <Button onClick={onImport}>{ConfigurationContent.Import}</Button>
                        </Empty>
                      )}
                      {configurations.items.length > 0 && visibleVersions.length === 0 && (
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <Search />
                            </EmptyMedia>
                            <EmptyTitle>{ConfigurationContent.NoMatches}</EmptyTitle>
                            <EmptyDescription>
                              {ConfigurationContent.NoMatchesDescription}
                            </EmptyDescription>
                          </EmptyHeader>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearch('');
                              setStatusFilter('all');
                            }}
                          >
                            {ConfigurationContent.ClearFilters}
                          </Button>
                        </Empty>
                      )}
                      {visibleVersions.length > 0 && (
                        <Table className="[&_td]:py-4 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
                          <TableHeader>
                            <TableRow>
                              <TableHead aria-sort={descending ? 'descending' : 'ascending'}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="-ml-3"
                                  aria-label={ConfigurationContent.SortVersions}
                                  onClick={() => setDescending((value) => !value)}
                                >
                                  {ConfigurationContent.Version}
                                  <ArrowDownUp data-icon="inline-end" />
                                </Button>
                              </TableHead>
                              <TableHead>{ConfigurationContent.Status}</TableHead>
                              {showSchema && <TableHead>{ConfigurationContent.Schema}</TableHead>}
                              {showChecksum && (
                                <TableHead>{ConfigurationContent.Checksum}</TableHead>
                              )}
                              <TableHead className="text-right">
                                {ConfigurationContent.Actions}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visibleVersions.map((version) => {
                              const live =
                                version.identifier ===
                                configurations.funnel.activeVersionIdentifier;

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
                                        aria-label={`Details for version ${version.version}`}
                                      >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                          <FileJson className="size-5" />
                                        </span>
                                        <span className="flex flex-col gap-1 text-left">
                                          <span>
                                            {ConfigurationFormat.version(version.version)}
                                          </span>
                                          <span className="text-xs font-normal text-muted-foreground">
                                            {version.funnelIdentifier}
                                          </span>
                                        </span>
                                      </a>
                                    </Button>
                                  </TableCell>
                                  <TableCell>
                                    <ConfigurationStatus live={live} />
                                  </TableCell>
                                  {showSchema && (
                                    <TableCell>
                                      <span className="text-sm text-muted-foreground">
                                        {version.schemaVersion}
                                      </span>
                                    </TableCell>
                                  )}
                                  {showChecksum && (
                                    <TableCell>
                                      <code
                                        title={version.checksum}
                                        className="text-xs text-muted-foreground"
                                      >
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
                                          publish(
                                            version,
                                            configurations.funnel.revision,
                                            returnFocusTarget ?? undefined,
                                          )
                                        }
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                    <Separator />
                    <CardFooter className="flex flex-wrap items-center justify-between gap-4 pt-5">
                      <p className="text-xs text-muted-foreground" aria-live="polite">
                        {visibleVersions.length} of {configurations.items.length} on this page ·
                        Showing {offset + (configurations.items.length > 0 ? 1 : 0)}–
                        {offset + configurations.items.length}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={offsets.length <= 1}
                          onClick={() => setOffsets((previous) => previous.slice(0, -1))}
                        >
                          <ArrowLeft data-icon="inline-start" />
                          {ConfigurationContent.Previous}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={
                            isNull(configurations.nextOffset) ||
                            configurations.nextOffset > ManagementPolicy.MaximumOffset
                          }
                          onClick={() => {
                            const nextOffset = configurations.nextOffset;

                            if (
                              !isNull(nextOffset) &&
                              nextOffset <= ManagementPolicy.MaximumOffset
                            ) {
                              setOffsets((previous) => [...previous, nextOffset]);
                            }
                          }}
                        >
                          <ArrowRight data-icon="inline-end" />
                          {ConfigurationContent.Next}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </div>
                <ConfigurationLibraryContext configurations={configurations} history={history} />
              </div>
            </>
          );
        })()}
    </div>
  );
}
