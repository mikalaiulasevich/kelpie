import {
  ArrowUpRight,
  CircleCheck,
  CircleDashed,
  FileJson,
  History,
  Layers3,
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
  return (
    <Badge variant={live ? 'success' : 'outline'}>
      {live ? <CircleCheck /> : <CircleDashed />}
      {live ? ConfigurationContent.Live : ConfigurationContent.Draft}
    </Badge>
  );
}

export function ConfigurationHighlights({
  configurations,
}: {
  configurations: ConfigurationList;
}): UIElement {
  const versions = [...configurations.items]
    .sort((left, right) => right.version - left.version)
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-4" aria-label={ConfigurationContent.Highlights}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{ConfigurationContent.Highlights}</h2>
        <span className="text-xs text-muted-foreground">
          {ConfigurationContent.HighlightsScope}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {versions.map((version) => (
          <Card
            key={version.identifier}
            className="gap-5 overflow-hidden transition-colors duration-150 hover:border-primary/40"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <span
                className={ClassNames.combine(
                  'flex size-12 items-center justify-center rounded-xl',
                  version.identifier === configurations.funnel.activeVersionIdentifier
                    ? 'bg-success/10 text-success'
                    : 'bg-primary/10 text-primary',
                )}
              >
                <FileJson className="size-5" />
              </span>
              <ConfigurationStatus
                live={version.identifier === configurations.funnel.activeVersionIdentifier}
              />
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-1">
              <a
                className="text-xl font-semibold tracking-tight underline-offset-4 hover:underline focus-visible:outline-ring"
                href={WorkspaceNavigation.href(
                  WorkspacePage.Version,
                  version.funnelIdentifier,
                  version.identifier,
                )}
              >
                {ConfigurationContent.Version} {version.version}
              </a>
              <p
                className="truncate text-sm text-muted-foreground"
                title={version.funnelIdentifier}
              >
                {version.funnelIdentifier}
              </p>
            </CardContent>
            <CardFooter className="justify-between gap-2 border-t [.border-t]:pt-4 text-xs text-muted-foreground">
              <span>
                JSON · {ConfigurationContent.Schema} {version.schemaVersion}
              </span>
              <Button variant="ghost" size="icon" asChild>
                <a
                  aria-label={`Inspect version ${version.version}`}
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
  const latest = history.items[0];

  return (
    <aside className="flex min-w-0 flex-col gap-5" aria-label={ConfigurationContent.FunnelContext}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{ConfigurationContent.CurrentVersion}</CardTitle>
            <span
              className={ClassNames.combine(
                'flex size-8 items-center justify-center rounded-lg',
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
          <CardDescription>{ConfigurationContent.ActiveVersionDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div>
            <p className="text-5xl font-semibold tracking-tight">
              {ConfigurationFormat.activeVersion(configurations)}
            </p>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              {configurations.funnel.identifier}
            </p>
          </div>
          <Separator />
          <dl className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <History className="size-4" />
                {ConfigurationContent.Revision}
              </dt>
              <dd className="font-medium tabular-nums">{configurations.funnel.revision}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Layers3 className="size-4" />
                {ConfigurationContent.ListedVersions}
              </dt>
              <dd className="font-medium tabular-nums">{configurations.items.length}</dd>
            </div>
            {latest && (
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground">{ConfigurationContent.LastActivation}</dt>
                <dd className="text-xs">{ConfigurationFormat.date(latest.createdAt)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
        {configurations.funnel.activeVersionIdentifier && (
          <CardFooter className="border-t pt-5">
            <Button className="w-full" variant="outline" asChild>
              <a
                href={WorkspaceNavigation.href(
                  WorkspacePage.Version,
                  configurations.funnel.identifier,
                  configurations.funnel.activeVersionIdentifier,
                )}
              >
                {ConfigurationContent.InspectActive}
                <ArrowUpRight data-icon="inline-end" />
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{ConfigurationContent.RecentActivity}</CardTitle>
          <CardDescription>{ConfigurationContent.ActivationContext}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {history.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {ConfigurationContent.HistoryEmptyDescription}
            </p>
          ) : (
            history.items.slice(0, 3).map((publication) => (
              <div className="flex gap-3" key={publication.identifier}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <History className="size-4" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm font-medium">
                    {ConfigurationFormat.action(publication.action)}{' '}
                    <span className="font-normal text-muted-foreground">
                      · r{publication.revision}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ConfigurationFormat.date(publication.createdAt)}
                  </p>
                  <code
                    className="text-xs text-muted-foreground"
                    title={publication.targetVersionIdentifier}
                  >
                    {ConfigurationLibrary.versionLabel(
                      configurations,
                      publication.targetVersionIdentifier,
                    )}
                  </code>
                </div>
              </div>
            ))
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <a
              href={WorkspaceNavigation.href(
                WorkspacePage.History,
                configurations.funnel.identifier,
              )}
            >
              {ConfigurationContent.ViewHistory}
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
        </CardFooter>
      </Card>
      <div className="flex items-start gap-3 px-1 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>{ConfigurationContent.VersionSafety}</p>
      </div>
    </aside>
  );
}
