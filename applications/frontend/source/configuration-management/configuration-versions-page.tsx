import { ConfigurationVersionTable } from './configuration-version-table';
import { useLocalization } from '../localization/use-localization';
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
} from './configuration-library-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/card';

import { Separator } from '../components/separator';
import { SkeletonRows, SkeletonSummary } from '../components/skeleton';
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

import { ConfigurationContent } from './configuration-content';
import { ConfigurationManagementPolicy } from './configuration-policy';

import { PublicationIntents, type PublicationIntent } from './publication-intents';

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
  const { t: translate } = useLocalization();
  const [offsets, setOffsets] = useState<readonly number[]>([0]);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [descending, setDescending] = useState(true);
  const [showSchema, setShowSchema] = useState(true);
  const [showChecksum, setShowChecksum] = useState(false);
  const offset = offsets.at(-1) ?? 0;
  const request = useCallback(
    async (signal: AbortSignal) => {
      const [configurations, history] = await Promise.all([
        ManagementClient.configurations(
          {
            funnelIdentifier,
            offset,
            limit: ConfigurationManagementPolicy.PageSize,
            search,
            status: statusFilter,
            sort: descending ? 'version-desc' : 'version-asc',
          },
          signal,
        ),
        ManagementClient.history(
          { funnelIdentifier, limit: ConfigurationManagementPolicy.RecentPublicationCount },
          signal,
        ),
      ]);

      return { configurations, history };
    },
    [funnelIdentifier, offset, search, statusFilter, descending],
  );
  const resource = useManagementRead(
    `${funnelIdentifier}:${offset}:${revision}:${refresh}:${search}:${statusFilter}:${descending}`,
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
      PublicationIntents.publish(funnelIdentifier, version, expectedRevision),
      returnFocusTarget,
    );

  const configurations = resource.status === 'ready' ? resource.data.configurations : undefined;
  const history = resource.status === 'ready' ? resource.data.history : undefined;
  const query = search.trim().toLowerCase();
  const visibleVersions = configurations?.items ?? [];
  const canRollback =
    !!history?.items[0]?.previousVersionIdentifier &&
    history.funnel.revision === configurations?.funnel.revision;

  return (
    <div className="workspace-page flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="screen-heading flex flex-col gap-3">
          <h1 className="page-title">{translate(ConfigurationContent.Heading)}</h1>
          <p className="page-description">{translate(ConfigurationContent.Description)}</p>
        </div>
        <Button
          onClick={onImport}
          className="primary-cta"
          aria-keyshortcuts={ActionShortcutCatalog.Import.aria}
        >
          {translate(ConfigurationContent.Import)}
          <KbdGroup aria-hidden="true" className="ml-1 hidden sm:inline-flex">
            <Kbd>Alt</Kbd>
            <Kbd>{ActionShortcutCatalog.Import.key}</Kbd>
          </KbdGroup>
          <Upload className="size-4 shrink-0" aria-hidden="true" />
        </Button>
      </div>
      {resource.status === 'loading' && <SkeletonSummary />}
      {configurations && configurations.items.length > 0 && (
        <ConfigurationHighlights configurations={configurations} />
      )}
      <div className="grid min-w-0 items-start gap-5 min-[1280px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="gap-0 overflow-hidden">
            <CardHeader className="flex flex-wrap items-center justify-between gap-4 pb-6">
              <div className="flex flex-col gap-1.5">
                <CardTitle>
                  {translate(ConfigurationContent.Library)}{' '}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {configurations ? (configurations.total ?? configurations.items.length) : '—'}
                  </span>
                </CardTitle>
                <CardDescription>{funnelIdentifier}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Columns3 data-icon="inline-start" />
                      {translate(ConfigurationContent.Columns)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>
                        {translate(ConfigurationContent.VisibleColumns)}
                      </DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        className="min-h-11 sm:min-h-8"
                        checked={showSchema}
                        onCheckedChange={setShowSchema}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {translate(ConfigurationContent.Schema)}
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        className="min-h-11 sm:min-h-8"
                        checked={showChecksum}
                        onCheckedChange={setShowChecksum}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {translate(ConfigurationContent.Checksum)}
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
                  {translate(ConfigurationContent.Refresh)}
                  <KbdGroup aria-hidden="true" className="ml-1 hidden sm:inline-flex">
                    <Kbd>Alt</Kbd>
                    <Kbd>R</Kbd>
                  </KbdGroup>
                </Button>
                <Button
                  variant="outline"
                  disabled={!canRollback}
                  onClick={() => {
                    if (configurations && canRollback) {
                      onIntent(
                        PublicationIntents.rollback(
                          funnelIdentifier,
                          configurations.funnel.revision,
                        ),
                      );
                    }
                  }}
                >
                  <RotateCcw data-icon="inline-start" />
                  {translate(ConfigurationContent.Rollback)}
                </Button>
              </div>
            </CardHeader>
            <div className="flex flex-wrap items-center gap-3 border-t px-6 py-4">
              <InputGroup className="min-w-48 flex-1">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setSearch(draftSearch);
                      setOffsets([0]);
                    }
                  }}
                  aria-label={translate(ConfigurationContent.Search)}
                  placeholder={translate(ConfigurationContent.SearchPlaceholder)}
                  value={draftSearch}
                  onChange={(event) => {
                    setDraftSearch(event.target.value);
                  }}
                />
              </InputGroup>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch(draftSearch);
                  setOffsets([0]);
                }}
              >
                {translate(ConfigurationContent.Search)}
              </Button>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setOffsets([0]);
                }}
              >
                <SelectTrigger
                  aria-label={translate(ConfigurationContent.FilterStatus)}
                  className="w-36"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">
                      {translate(ConfigurationContent.AllStatuses)}
                    </SelectItem>
                    <SelectItem value="live">{translate(ConfigurationContent.Live)}</SelectItem>
                    <SelectItem value="inactive">
                      {translate(ConfigurationContent.Inactive)}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {(query || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setDraftSearch('');
                    setStatusFilter('all');
                    setOffsets([0]);
                  }}
                >
                  {translate(ConfigurationContent.ClearFilters)}
                </Button>
              )}
              <p className="basis-full text-xs text-muted-foreground">
                {translate(ConfigurationContent.PageFilterScope)}
              </p>
            </div>
            <Separator />
            <CardContent className="px-0" aria-busy={resource.status === 'loading'}>
              {configurations &&
                configurations.items.length === 0 &&
                !query &&
                statusFilter === 'all' && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FileJson />
                      </EmptyMedia>
                      <EmptyTitle>{translate(ConfigurationContent.EmptyTitle)}</EmptyTitle>
                      <EmptyDescription>
                        {translate(ConfigurationContent.EmptyDescription)}
                      </EmptyDescription>
                    </EmptyHeader>
                    <Button onClick={onImport}>{translate(ConfigurationContent.Import)}</Button>
                  </Empty>
                )}
              {configurations &&
                visibleVersions.length === 0 &&
                (query || statusFilter !== 'all') && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search />
                      </EmptyMedia>
                      <EmptyTitle>{translate(ConfigurationContent.NoMatches)}</EmptyTitle>
                      <EmptyDescription>
                        {translate(ConfigurationContent.NoMatchesDescription)}
                      </EmptyDescription>
                    </EmptyHeader>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch('');
                        setDraftSearch('');
                        setStatusFilter('all');
                        setOffsets([0]);
                      }}
                    >
                      {translate(ConfigurationContent.ClearFilters)}
                    </Button>
                  </Empty>
                )}
              <ConfigurationVersionTable
                versions={visibleVersions}
                funnelIdentifier={funnelIdentifier}
                activeVersionIdentifier={configurations?.funnel.activeVersionIdentifier ?? null}
                revision={configurations?.funnel.revision ?? revision}
                descending={descending}
                showSchema={showSchema}
                showChecksum={showChecksum}
                onSort={() => {
                  setDescending((value) => !value);
                  setOffsets([0]);
                }}
                onPublish={publish}
              />
              {resource.status === 'loading' && (
                <div
                  role="status"
                  aria-label={translate(ConfigurationContent.LoadingConfigurations)}
                  className="p-6"
                >
                  <SkeletonRows />
                </div>
              )}
              {resource.status === 'error' && (
                <LoadErrorState
                  title={translate(ConfigurationContent.ConfigurationsCouldNotBeLoaded)}
                  message={translate(resource.message)}
                  onRetry={reload}
                  retryLabel={translate(ConfigurationContent.Retry)}
                />
              )}
            </CardContent>
            <Separator />
            {configurations && (
              <CardFooter className="flex flex-wrap items-center justify-between gap-4 pt-5">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {visibleVersions.length} {translate(ConfigurationContent.Of)}{' '}
                  {configurations.total ?? configurations.items.length}{' '}
                  {translate(ConfigurationContent.OnThisPageShowing)}{' '}
                  {offset + (configurations.items.length > 0 ? 1 : 0)}–
                  {offset + configurations.items.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={offsets.length <= 1}
                    onClick={() => setOffsets((previous) => previous.slice(0, -1))}
                  >
                    <ArrowLeft data-icon="inline-start" />
                    {translate(ConfigurationContent.Previous)}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      isNull(configurations.nextOffset) ||
                      configurations.nextOffset > ManagementPolicy.MaximumOffset
                    }
                    onClick={() => {
                      const nextOffset = configurations.nextOffset;

                      if (!isNull(nextOffset) && nextOffset <= ManagementPolicy.MaximumOffset) {
                        setOffsets((previous) => [...previous, nextOffset]);
                      }
                    }}
                  >
                    <ArrowRight data-icon="inline-end" />
                    {translate(ConfigurationContent.Next)}
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
        {configurations && history && (
          <ConfigurationLibraryContext configurations={configurations} history={history} />
        )}
      </div>
    </div>
  );
}
