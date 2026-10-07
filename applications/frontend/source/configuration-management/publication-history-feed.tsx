import { useLocalization } from '../localization/use-localization';
import { groupBy } from 'es-toolkit';
import { Check, RotateCcw } from 'lucide-react';
import { Badge } from '../components/badge';
import type { PublicationHistory } from '../management/management-types';
import { ClassNames } from '../styling/combine-class-names';
import { WorkspaceNavigation, WorkspacePage } from '../workspace/workspace-navigation';
import { ConfigurationContent } from './configuration-content';
import { ConfigurationFormat } from './configuration-format';
import { PublicationHistoryContent } from './publication-history-content';

interface PublicationHistoryFeedProperties {
  funnelIdentifier: string;
  items: PublicationHistory['items'];
}

interface PublicationVersionLinkProperties {
  funnelIdentifier: string;
  identifier: string;
}

function PublicationVersionLink({
  funnelIdentifier,
  identifier,
}: PublicationVersionLinkProperties): UIElement {
  useLocalization();
  const label = ConfigurationFormat.identifier(identifier);

  if (
    !WorkspaceNavigation.validIdentifier(funnelIdentifier) ||
    !WorkspaceNavigation.validVersionIdentifier(identifier)
  ) {
    return <code title={identifier}>{label}</code>;
  }

  return (
    <a
      href={WorkspaceNavigation.href(WorkspacePage.Version, funnelIdentifier, identifier)}
      title={identifier}
      aria-label={PublicationHistoryContent.versionLink(identifier)}
      className="rounded-sm font-mono text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </a>
  );
}

export function PublicationHistoryFeed({
  funnelIdentifier,
  items,
}: PublicationHistoryFeedProperties): UIElement {
  const { t: translate } = useLocalization();
  const days = groupBy(items, (item) =>
    ConfigurationFormat.timestamp(item.createdAt, { dateStyle: 'long' }),
  );

  return (
    <div className="flex flex-col gap-8 py-6">
      {Object.entries(days).map(([day, publications]) => (
        <section key={day} aria-label={day} className="flex flex-col gap-5">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground">{day}</h2>
          <ol className="flex flex-col">
            {publications.map((item) => (
              <li
                key={item.identifier}
                className="group relative flex gap-3 pb-7 last:pb-0 sm:gap-4"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-9 bottom-0 left-4 w-px bg-border group-last:hidden"
                />
                <span
                  aria-hidden="true"
                  className={ClassNames.combine(
                    'relative flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                    item.action === 'rollback'
                      ? 'bg-info/10 text-info ring-info/20'
                      : 'bg-success/10 text-success ring-success/20',
                  )}
                >
                  {item.action === 'rollback' ? (
                    <RotateCcw className="size-4" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">
                        {item.action === 'rollback'
                          ? translate(PublicationHistoryContent.RolledBack)
                          : translate(PublicationHistoryContent.Published)}
                      </h3>
                      <Badge variant="outline">
                        <span className="sr-only">{translate(ConfigurationContent.Revision)} </span>
                        #{item.revision}
                      </Badge>
                    </div>
                    <time
                      dateTime={item.createdAt}
                      title={ConfigurationFormat.date(item.createdAt)}
                      className="ml-auto text-xs whitespace-nowrap text-muted-foreground tabular-nums"
                    >
                      {ConfigurationFormat.timestamp(item.createdAt, { timeStyle: 'short' })}
                    </time>
                  </div>
                  <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <div className="flex items-baseline gap-2">
                      <dt>{translate(ConfigurationContent.Target)}</dt>
                      <dd>
                        <PublicationVersionLink
                          funnelIdentifier={funnelIdentifier}
                          identifier={item.targetVersionIdentifier}
                        />
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt>{translate(ConfigurationContent.PreviousVersion)}</dt>
                      <dd>
                        {item.previousVersionIdentifier ? (
                          <PublicationVersionLink
                            funnelIdentifier={funnelIdentifier}
                            identifier={item.previousVersionIdentifier}
                          />
                        ) : (
                          '—'
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
