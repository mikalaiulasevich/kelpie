import { useLocalization } from '../localization/use-localization';
import {
  ArrowUpRight,
  CircleCheck,
  CircleDashed,
  FilePenLine,
  History,
  Layers3,
  FileJson2,
  Fingerprint,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../components/badge';
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
import type { ConfigurationList, PublicationHistory } from '../management/management-types';
import { WorkspaceNavigation, WorkspacePage } from '../workspace/workspace-navigation';
import { ConfigurationFormat } from './configuration-format';
import { ConfigurationContent } from './configuration-content';
import { ConfigurationLibrary } from './configuration-library';
import { ClassNames } from '../styling/combine-class-names';

export function ConfigurationStatus({ live }: { live: boolean }): UIElement {
  const { t } = useLocalization();

  return (
    <Badge variant={live ? 'success' : 'secondary'}>
      {live ? <CircleCheck aria-hidden="true" /> : <FilePenLine aria-hidden="true" />}
      {live ? t(ConfigurationContent.Live) : t(ConfigurationContent.Inactive)}
    </Badge>
  );
}

export function ConfigurationHighlights({
  configurations,
}: {
  configurations: ConfigurationList;
}): UIElement {
  const { t } = useLocalization();
  const versions = [...configurations.items]
    .sort((left, right) => right.version - left.version)
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-3" aria-label={t(ConfigurationContent.Highlights)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{t(ConfigurationContent.Highlights)}</h2>
        <span className="text-xs text-muted-foreground">
          {t(ConfigurationContent.HighlightsScope)}
        </span>
      </div>
      <div className="configuration-highlights grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
        {versions.map((version) => (
          <Card
            key={version.identifier}
            className={ClassNames.combine(
              'configuration-highlight compact-card group min-w-0 gap-6 overflow-hidden py-6 hover:border-primary/40 focus-within:border-primary/60',
              version.identifier === configurations.funnel.activeVersionIdentifier &&
                'border-primary/35',
            )}
          >
            <CardHeader className="gap-3 px-5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                  <FileJson2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <ConfigurationStatus
                  live={version.identifier === configurations.funnel.activeVersionIdentifier}
                />
              </div>
              <a
                className="w-fit rounded-sm text-xl font-medium tracking-tight underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                href={WorkspaceNavigation.href(
                  WorkspacePage.Version,
                  version.funnelIdentifier,
                  version.identifier,
                )}
              >
                {t(ConfigurationContent.Version)} {version.version}
              </a>
              <CardDescription className="text-xs leading-relaxed">
                {version.identifier === configurations.funnel.activeVersionIdentifier
                  ? t('Serving new sessions. Existing sessions keep their assigned version.')
                  : t('Saved configuration. Inspect its steps and experiment before activation.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                <div>
                  <dt className="mb-1 text-muted-foreground">{t('Schema')}</dt>
                  <dd>{version.schemaVersion}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="mb-1 flex items-center gap-1 text-muted-foreground">
                    <Fingerprint className="size-3" aria-hidden="true" />
                    {t('Fingerprint')}
                  </dt>
                  <dd className="truncate" title={version.checksum}>
                    {version.checksum.slice(0, 12)}
                  </dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="mt-auto justify-between gap-2 px-5 text-xs text-muted-foreground">
              <span>{t('View configuration')}</span>
              <Button variant="ghost" size="icon" asChild>
                <a
                  aria-label={t('Inspect version {version}', { version: version.version })}
                  href={WorkspaceNavigation.href(
                    WorkspacePage.Version,
                    version.funnelIdentifier,
                    version.identifier,
                  )}
                >
                  <ArrowUpRight />
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ConfigurationLibraryContext({
  configurations,
  history,
}: {
  configurations: ConfigurationList;
  history: PublicationHistory;
}): UIElement {
  const { t } = useLocalization();
  const latest = history.items[0];

  return (
    <aside
      className="flex min-w-0 flex-col gap-5"
      aria-label={t(ConfigurationContent.FunnelContext)}
    >
      <Card className="compact-card relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t(ConfigurationContent.CurrentVersion)}</CardTitle>
            <span
              className={ClassNames.combine(
                'flex size-8 items-center justify-center rounded-[10px]',
                configurations.funnel.activeVersionIdentifier
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {configurations.funnel.activeVersionIdentifier ? (
                <CircleCheck className="size-4" />
              ) : (
                <CircleDashed className="size-4" />
              )}
            </span>
          </div>
          <CardDescription>{t(ConfigurationContent.ActiveVersionDescription)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="break-words text-2xl font-medium tracking-tight tabular-nums text-primary">
              {ConfigurationFormat.activeVersion(configurations)}
            </p>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              {configurations.funnel.identifier}
            </p>
          </div>
          <Separator />
          <dl className="flex min-w-0 flex-col gap-2 text-sm">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <dt className="flex min-w-0 items-center gap-2 leading-snug text-muted-foreground">
                <History aria-hidden="true" className="size-4 shrink-0" />
                {t(ConfigurationContent.Revision)}
              </dt>
              <dd className="text-xl font-medium tabular-nums">{configurations.funnel.revision}</dd>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t pt-2">
              <dt className="flex min-w-0 items-center gap-2 leading-snug text-muted-foreground">
                <Layers3 aria-hidden="true" className="size-4 shrink-0" />
                {t(ConfigurationContent.ListedVersions)}
              </dt>
              <dd className="text-xl font-medium tabular-nums">{configurations.items.length}</dd>
            </div>
            {latest && (
              <div className="flex min-w-0 flex-col gap-1.5 border-t pt-2">
                <dt className="text-muted-foreground">{t(ConfigurationContent.LastActivation)}</dt>
                <dd className="break-words text-xs leading-relaxed">
                  {ConfigurationFormat.date(latest.createdAt)}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
        {configurations.funnel.activeVersionIdentifier && (
          <CardFooter className="border-t pt-3">
            <Button className="w-full" variant="outline" asChild>
              <a
                href={WorkspaceNavigation.href(
                  WorkspacePage.Version,
                  configurations.funnel.identifier,
                  configurations.funnel.activeVersionIdentifier,
                )}
              >
                {t(ConfigurationContent.InspectActive)}
                <ArrowUpRight data-icon="inline-end" />
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
      <Card className="compact-card">
        <CardHeader>
          <CardTitle>{t(ConfigurationContent.RecentActivity)}</CardTitle>
          <CardDescription>{t(ConfigurationContent.ActivationContext)}</CardDescription>
        </CardHeader>
        <CardContent>
          {history.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(ConfigurationContent.HistoryEmptyDescription)}
            </p>
          ) : (
            <ol className="flex flex-col">
              {history.items.slice(0, 3).map((publication, index) => (
                <li
                  className="group/activity relative flex gap-3 pb-4 last:pb-0"
                  key={publication.identifier}
                >
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-4 top-8 w-px bg-border group-last/activity:hidden"
                  />
                  <span
                    className={ClassNames.combine(
                      'relative flex size-8 shrink-0 items-center justify-center rounded-full border',
                      index === 0
                        ? 'border-primary/25 bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground',
                    )}
                  >
                    <History aria-hidden="true" className="size-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-sm font-medium">
                      {ConfigurationFormat.action(publication.action)}{' '}
                      <span className="font-normal text-muted-foreground">
                        {t('· r')} {publication.revision}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ConfigurationFormat.date(publication.createdAt)}
                    </p>
                    <code
                      className="w-fit max-w-full truncate rounded border bg-muted/40 px-1.5 py-0.5 text-xs text-muted-foreground"
                      title={publication.targetVersionIdentifier}
                    >
                      {ConfigurationLibrary.versionLabel(
                        configurations,
                        publication.targetVersionIdentifier,
                      )}
                    </code>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full justify-between" asChild>
            <a
              href={WorkspaceNavigation.href(
                WorkspacePage.History,
                configurations.funnel.identifier,
              )}
            >
              {t(ConfigurationContent.ViewHistory)}
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
        </CardFooter>
      </Card>
      <div className="flex items-start gap-3 px-1 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>{t(ConfigurationContent.VersionSafety)}</p>
      </div>
    </aside>
  );
}
