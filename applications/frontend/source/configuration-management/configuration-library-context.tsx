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
            className={ClassNames.combine(
              'group min-w-0 gap-4 overflow-hidden pt-0 transition-colors duration-150 hover:border-primary/40 focus-within:border-primary/60',
              version.identifier === configurations.funnel.activeVersionIdentifier &&
                'border-primary/35',
            )}
          >
            <div
              aria-hidden="true"
              className={ClassNames.combine(
                'relative flex h-40 items-end justify-center overflow-hidden border-b px-6 pt-5',
                version.identifier === configurations.funnel.activeVersionIdentifier
                  ? 'bg-gradient-to-br from-primary/15 via-primary/5 to-card'
                  : 'bg-gradient-to-br from-muted/70 to-card',
              )}
            >
              <div className="absolute bottom-0 h-28 w-36 translate-x-3 rotate-6 rounded-t-xl border border-border/70 bg-background/40" />
              <div
                className={ClassNames.combine(
                  'relative flex h-32 w-40 flex-col gap-3 rounded-t-xl border bg-card px-4 pt-4 shadow-lg',
                  version.identifier === configurations.funnel.activeVersionIdentifier
                    ? 'border-primary/40'
                    : 'border-border',
                )}
              >
                <div className="flex items-center justify-between text-primary">
                  <FileJson className="size-5" />
                  <span className="font-mono text-xs tracking-widest">JSON</span>
                </div>
                <svg viewBox="0 0 128 64" fill="none" className="h-16 w-full text-muted-foreground">
                  <path
                    d="M14 4h-4v20l-5 8 5 8v20h4M114 4h4v20l5 8-5 8v20h-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M26 15h22M26 31h16M26 47h25"
                    className="stroke-primary/70"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M60 15h37M54 31h26M63 47h30"
                    stroke="currentColor"
                    strokeOpacity="0.35"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {ConfigurationContent.Version}
              </span>
              <ConfigurationStatus
                live={version.identifier === configurations.funnel.activeVersionIdentifier}
              />
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-1">
              <a
                className="w-fit rounded-sm text-2xl font-semibold tracking-tight underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
            <CardFooter className="mt-auto justify-between gap-2 border-t [.border-t]:pt-3 text-xs text-muted-foreground">
              <span className="min-w-0 break-words">
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
      <Card className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className={ClassNames.combine(
            'absolute inset-x-0 top-0 h-1',
            configurations.funnel.activeVersionIdentifier ? 'bg-primary' : 'bg-muted',
          )}
        />
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
          <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
            <p className="break-words text-4xl font-semibold tracking-tight tabular-nums text-primary">
              {ConfigurationFormat.activeVersion(configurations)}
            </p>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              {configurations.funnel.identifier}
            </p>
          </div>
          <Separator />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
            <div className="flex min-w-0 flex-col gap-2">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <History aria-hidden="true" className="size-4 shrink-0" />
                {ConfigurationContent.Revision}
              </dt>
              <dd className="text-xl font-medium tabular-nums">{configurations.funnel.revision}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-2 border-l pl-4">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Layers3 aria-hidden="true" className="size-4 shrink-0" />
                {ConfigurationContent.ListedVersions}
              </dt>
              <dd className="text-xl font-medium tabular-nums">{configurations.items.length}</dd>
            </div>
            {latest && (
              <div className="col-span-2 flex flex-col gap-1.5">
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
        <CardContent>
          {history.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {ConfigurationContent.HistoryEmptyDescription}
            </p>
          ) : (
            <ol className="flex flex-col">
              {history.items.slice(0, 3).map((publication, index) => (
                <li
                  className="group/activity relative flex gap-3 pb-6 last:pb-0"
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
                        · r{publication.revision}
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
