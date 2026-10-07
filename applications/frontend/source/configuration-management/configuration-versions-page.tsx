import { ManagementPolicy } from '../management/management-policy';
import { isNull } from 'es-toolkit/predicate';
import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Columns3,
  Layers3,
  History as HistoryIcon,
  CircleCheck,
  FileJson,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { ManagementClient } from '../management/management-client';
import type { ConfigurationVersionMetadata } from '../management/management-types';
import { useManagementRead } from '../management/use-management-read';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
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
import { Skeleton } from '../components/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
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
        ManagementClient.history({ funnelIdentifier, limit: 1 }, signal),
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
        <div className="flex flex-col gap-2">
          <h1 className="page-title">{ConfigurationContent.Heading}</h1>
          <p className="page-description">{ConfigurationContent.Description}</p>
        </div>
        <Button onClick={onImport}>
          <Upload data-icon="inline-start" />
          {ConfigurationContent.Import}
        </Button>
      </div>
      {resource.status === 'loading' && (
        <div role="status" aria-label="Loading configurations" className="flex flex-col gap-4">
          <Skeleton className="h-12 w-full max-w-lg rounded-lg" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      )}
      {resource.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>{ConfigurationContent.LoadFailure}</AlertTitle>
          <AlertDescription>
            {resource.message}
            <Button variant="outline" className="mt-3 w-fit" onClick={reload}>
              {ConfigurationContent.Retry}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {resource.status === 'ready' &&
        (() => {
          const { configurations, history } = resource.data;
          const lastActivation = history.items[0];
          const canRollback =
            !!lastActivation?.previousVersionIdentifier &&
            history.funnel.revision === configurations.funnel.revision;

          return (
            <>
              <div className="grid gap-4 xl:grid-cols-3">
                <Card className="gap-5">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {ConfigurationContent.CurrentVersion}
                    </CardTitle>
                    <CircleCheck className="size-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tracking-tight">
                      {ConfigurationFormat.activeVersion(configurations)}
                    </p>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    {ConfigurationContent.ActiveVersionDescription}
                  </CardFooter>
                </Card>
                <Card className="gap-5">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {ConfigurationContent.CurrentRevision}
                    </CardTitle>
                    <HistoryIcon className="size-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight">
                      {configurations.funnel.revision}
                    </p>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    {ConfigurationContent.CurrentRevisionDescription}
                  </CardFooter>
                </Card>
                <Card className="gap-5">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {ConfigurationContent.ListedVersions}
                    </CardTitle>
                    <Layers3 className="size-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tabular-nums tracking-tight">
                      {configurations.items.length}
                    </p>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    {ConfigurationContent.ListedVersionsDescription}
                  </CardFooter>
                </Card>
              </div>
              <Card className="gap-0 overflow-hidden">
                <CardHeader className="flex flex-wrap items-center justify-between gap-4 pb-6">
                  <div className="flex flex-col gap-1.5">
                    <CardTitle>Versions</CardTitle>
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
                    <Button variant="outline" onClick={reload}>
                      <RefreshCw data-icon="inline-start" />
                      {ConfigurationContent.Refresh}
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
                <Separator />
                <CardContent className="px-0">
                  {configurations.items.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FileJson />
                        </EmptyMedia>
                        <EmptyTitle>{ConfigurationContent.EmptyTitle}</EmptyTitle>
                        <EmptyDescription>{ConfigurationContent.EmptyDescription}</EmptyDescription>
                      </EmptyHeader>
                      <Button onClick={onImport}>{ConfigurationContent.Import}</Button>
                    </Empty>
                  ) : (
                    <Table className="[&_td]:py-4 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
                      <TableHeader>
                        <TableRow>
                          <TableHead>{ConfigurationContent.Version}</TableHead>
                          <TableHead>{ConfigurationContent.Status}</TableHead>
                          {showSchema && <TableHead>{ConfigurationContent.Schema}</TableHead>}
                          {showChecksum && <TableHead>{ConfigurationContent.Checksum}</TableHead>}
                          <TableHead className="text-right">
                            {ConfigurationContent.Actions}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {configurations.items.map((version) => {
                          const live =
                            version.identifier === configurations.funnel.activeVersionIdentifier;

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
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                      <FileJson className="size-5" />
                                    </span>
                                    {ConfigurationFormat.version(version.version)}
                                  </a>
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Badge variant={live ? 'default' : 'outline'}>
                                  {live ? ConfigurationContent.Live : ConfigurationContent.Draft}
                                </Badge>
                              </TableCell>
                              {showSchema && <TableCell>{version.schemaVersion}</TableCell>}
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
                  <p className="text-xs text-muted-foreground">
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

                        if (!isNull(nextOffset) && nextOffset <= ManagementPolicy.MaximumOffset) {
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
            </>
          );
        })()}
    </div>
  );
}
