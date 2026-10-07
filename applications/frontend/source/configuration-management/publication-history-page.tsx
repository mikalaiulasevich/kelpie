import { ManagementPolicy } from '../management/management-policy';
import { isNull } from 'es-toolkit/predicate';
import { useCallback, useState } from 'react';
import { ArrowLeft, ArrowRight, History, RefreshCw, RotateCcw } from 'lucide-react';
import { ManagementClient } from '../management/management-client';
import { useManagementRead } from '../management/use-management-read';
import { Button } from '../components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/card';
import { Separator } from '../components/separator';
import { Skeleton } from '../components/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { ConfigurationContent } from './configuration-content';
import { ConfigurationManagementPolicy } from './configuration-policy';
import { PublicationHistoryFeed } from './publication-history-feed';
import type { PublicationIntent } from './publication-intents';

interface PublicationHistoryPageProperties {
  funnelIdentifier: string;
  revision: number;
  onUnauthorized: () => void;
  onIntent: (intent: PublicationIntent) => void;
}

export function PublicationHistoryPage({
  funnelIdentifier,
  revision,
  onUnauthorized,
  onIntent,
}: PublicationHistoryPageProperties): UIElement {
  const [offsets, setOffsets] = useState<readonly number[]>([0]);
  const [refresh, setRefresh] = useState(0);
  const offset = offsets.at(-1) ?? 0;
  const request = useCallback(
    (signal: AbortSignal) =>
      ManagementClient.history(
        { funnelIdentifier, offset, limit: ConfigurationManagementPolicy.PageSize },
        signal,
      ),
    [funnelIdentifier, offset],
  );
  const resource = useManagementRead(
    `${funnelIdentifier}:${offset}:${revision}:${refresh}`,
    request,
    onUnauthorized,
  );
  const reload = () => setRefresh((value) => value + 1);

  return (
    <div className="workspace-page flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="page-title">{ConfigurationContent.HistoryHeading}</h1>
          <p className="page-description">{ConfigurationContent.HistoryDescription}</p>
        </div>
        <Button variant="outline" onClick={reload}>
          <RefreshCw data-icon="inline-start" />
          {ConfigurationContent.Refresh}
        </Button>
      </div>
      {resource.status === 'loading' && (
        <Skeleton className="h-96 rounded-xl" aria-label="Loading activation history" />
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
      {resource.status === 'ready' && (
        <Card className="w-full max-w-5xl gap-0 border-0 bg-transparent py-0 shadow-none">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4 px-0 pb-5">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Activity</CardTitle>
              <CardDescription>
                {funnelIdentifier} · Current revision {resource.data.funnel.revision}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              disabled={offset !== 0 || !resource.data.items[0]?.previousVersionIdentifier}
              onClick={() =>
                onIntent({
                  kind: 'rollback',
                  label: 'Previous activated version',
                  command: {
                    operationIdentifier: globalThis.crypto.randomUUID(),
                    funnelIdentifier,
                    expectedRevision: resource.data.funnel.revision,
                  },
                })
              }
            >
              <RotateCcw data-icon="inline-start" />
              {ConfigurationContent.Rollback}
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="px-0">
            {resource.data.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History />
                  </EmptyMedia>
                  <EmptyTitle>{ConfigurationContent.HistoryEmptyTitle}</EmptyTitle>
                  <EmptyDescription>
                    {ConfigurationContent.HistoryEmptyDescription}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <PublicationHistoryFeed
                funnelIdentifier={funnelIdentifier}
                items={resource.data.items}
              />
            )}
          </CardContent>
          <Separator />
          <CardFooter className="flex flex-wrap items-center justify-between gap-4 px-0 pt-4">
            <p className="text-xs text-muted-foreground">
              Showing {offset + (resource.data.items.length > 0 ? 1 : 0)}–
              {offset + resource.data.items.length}
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
                  isNull(resource.data.nextOffset) ||
                  resource.data.nextOffset > ManagementPolicy.MaximumOffset
                }
                onClick={() => {
                  const nextOffset = resource.data.nextOffset;

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
      )}
    </div>
  );
}
