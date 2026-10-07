import { WorkspaceNavigation, WorkspacePage } from '../workspace/workspace-navigation';
import { ManagementPolicy } from '../management/management-policy';
import { isNull } from 'es-toolkit/predicate';
import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
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
import { Skeleton } from '../components/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';

import { ConfigurationContent } from './configuration-content';
import { ConfigurationManagementPolicy } from './configuration-policy';
import { ConfigurationFormat } from './configuration-format';
import type { PublicationIntent } from './publication-intents';

export interface ConfigurationVersionsPageProperties {
  funnelIdentifier: string;
  revision: number;
  onUnauthorized: () => void;
  onImport: () => void;
  onIntent: (intent: PublicationIntent) => void;
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
  const publish = (version: ConfigurationVersionMetadata, expectedRevision: number) =>
    onIntent({
      kind: 'publish',
      label: ConfigurationFormat.version(version.version),
      command: {
        operationIdentifier: globalThis.crypto.randomUUID(),
        funnelIdentifier,
        targetVersionIdentifier: version.identifier,
        expectedRevision,
      },
    });

  return (
    <div className="workspace-page flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-3">
          <p className="page-eyebrow">{ConfigurationContent.Eyebrow}</p>
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
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
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
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardDescription>{ConfigurationContent.CurrentVersion}</CardDescription>
                    <CardTitle>{ConfigurationFormat.activeVersion(configurations)}</CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">New sessions use this version</p>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>{ConfigurationContent.CurrentRevision}</CardDescription>
                    <CardTitle>{configurations.funnel.revision}</CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">
                      Changes are checked against this revision
                    </p>
                  </CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>{ConfigurationContent.ListedVersions}</CardDescription>
                    <CardTitle>{configurations.items.length}</CardTitle>
                  </CardHeader>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">Immutable configuration records</p>
                  </CardFooter>
                </Card>
              </div>
              <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <CardTitle>Configuration versions</CardTitle>
                    <CardDescription>{funnelIdentifier}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
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
                <CardContent>
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{ConfigurationContent.Version}</TableHead>
                          <TableHead>{ConfigurationContent.Status}</TableHead>
                          <TableHead>{ConfigurationContent.Schema}</TableHead>
                          <TableHead>{ConfigurationContent.Checksum}</TableHead>
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
                                <div className="flex items-center gap-3">
                                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-primary">
                                    <FileJson className="size-4" />
                                  </span>
                                  <span className="font-medium">
                                    {ConfigurationFormat.version(version.version)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={live ? 'default' : 'secondary'}>
                                  {live ? ConfigurationContent.Live : ConfigurationContent.Draft}
                                </Badge>
                              </TableCell>
                              <TableCell>{version.schemaVersion}</TableCell>
                              <TableCell>
                                <code
                                  title={version.checksum}
                                  className="text-xs text-muted-foreground"
                                >
                                  {ConfigurationFormat.identifier(version.checksum)}
                                </code>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    asChild
                                    aria-label={`Details for version ${version.version}`}
                                  >
                                    <a
                                      href={WorkspaceNavigation.href(
                                        WorkspacePage.Version,
                                        funnelIdentifier,
                                        version.identifier,
                                      )}
                                      aria-label={`Details for version ${version.version}`}
                                    >
                                      {ConfigurationContent.Inspect}
                                    </a>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    disabled={live}
                                    onClick={() => publish(version, configurations.funnel.revision)}
                                    aria-label={`Publish version ${version.version}`}
                                  >
                                    <ArrowUpRight data-icon="inline-end" />
                                    {ConfigurationContent.Publish}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-between gap-3">
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
