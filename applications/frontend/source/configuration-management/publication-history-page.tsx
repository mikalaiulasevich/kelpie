import { useLocalization } from '../localization/use-localization';
import { Kbd, KbdGroup } from '../components/kbd';
import { ActionShortcutCatalog } from '../workspace/action-shortcuts';
import { useActionShortcuts } from '../workspace/use-action-shortcuts';
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
import { SkeletonRows } from '../components/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../components/empty';
import { LoadErrorState } from '../components/load-error-state';
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
  const { t } = useLocalization();
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

  useActionShortcuts([
    {
      shortcut: ActionShortcutCatalog.Refresh,
      enabled: resource.status !== 'loading',
      activate: reload,
    },
  ]);

  return (
    <div className="workspace-page flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="screen-heading flex flex-col gap-3">
          <h1 className="page-title">{t(ConfigurationContent.HistoryHeading)}</h1>
          <p className="page-description">{t(ConfigurationContent.HistoryDescription)}</p>
        </div>
        <Button
          variant="outline"
          onClick={reload}
          disabled={resource.status === 'loading'}
          aria-keyshortcuts={ActionShortcutCatalog.Refresh.aria}
        >
          <RefreshCw data-icon="inline-start" />
          {t(ConfigurationContent.Refresh)}
          <KbdGroup aria-hidden="true" className="ml-1 hidden sm:inline-flex">
            <Kbd>Alt</Kbd>
            <Kbd>R</Kbd>
          </KbdGroup>
        </Button>
      </div>
      {resource.status === 'loading' && <SkeletonRows label="Loading activation history" />}
      {resource.status === 'error' && (
        <LoadErrorState
          title={t('Activation history could not be loaded')}
          message={t(resource.message)}
          onRetry={reload}
          retryLabel={t('Try again')}
        />
      )}
      {resource.status === 'ready' && (
        <Card className="publication-log w-full gap-0 overflow-hidden">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4 pb-5">
            <div className="flex flex-col gap-1.5">
              <CardTitle>{t('Activity')}</CardTitle>
              <CardDescription>
                {funnelIdentifier} {t('· Current revision')} {resource.data.funnel.revision}
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
              {t(ConfigurationContent.Rollback)}
            </Button>
          </CardHeader>
          <Separator />
          <CardContent>
            {resource.data.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History />
                  </EmptyMedia>
                  <EmptyTitle>{t(ConfigurationContent.HistoryEmptyTitle)}</EmptyTitle>
                  <EmptyDescription>
                    {t(ConfigurationContent.HistoryEmptyDescription)}
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
          <CardFooter className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <p className="text-xs text-muted-foreground">
              {t('Showing')} {offset + (resource.data.items.length > 0 ? 1 : 0)}–
              {offset + resource.data.items.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={offsets.length <= 1}
                onClick={() => setOffsets((previous) => previous.slice(0, -1))}
              >
                <ArrowLeft data-icon="inline-start" />
                {t(ConfigurationContent.Previous)}
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
                {t(ConfigurationContent.Next)}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
