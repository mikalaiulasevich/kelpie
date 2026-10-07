import { Type, type Static } from 'typebox';
import { WorkspaceNavigationPolicy } from './workspace-policy';
import { isString } from 'es-toolkit/predicate';

export const WorkspacePage = {
  Analytics: 'analytics',
  Versions: 'versions',
  Version: 'version',
  History: 'history',
} as const;

export type WorkspacePage = ValueOf<typeof WorkspacePage>;

const WorkspaceSchemas = {
  Location: Type.Object({
    page: Type.Enum(WorkspacePage),
    funnelIdentifier: Type.String(),
    versionIdentifier: Type.Optional(Type.String()),
  }),
} as const;

export type WorkspaceLocation = Readonly<Static<typeof WorkspaceSchemas.Location>>;

export const WorkspaceNavigation = {
  validIdentifier(value: unknown): value is string {
    return (
      isString(value) &&
      value.length <= WorkspaceNavigationPolicy.MaximumIdentifierCharacters &&
      WorkspaceNavigationPolicy.IdentifierPattern.test(value)
    );
  },

  validVersionIdentifier(value: unknown): value is string {
    return isString(value) && WorkspaceNavigationPolicy.VersionIdentifierPattern.test(value);
  },

  read(): WorkspaceLocation {
    const [path, query] = globalThis.location.hash.slice(1).split('?');
    const parameters = new URLSearchParams(query);
    const candidate = parameters.get('funnel');
    const versionIdentifier = parameters.get('version');
    const page =
      Object.values(WorkspacePage).find((value) => value === path) ?? WorkspacePage.Analytics;
    const funnelIdentifier = WorkspaceNavigation.validIdentifier(candidate)
      ? candidate
      : WorkspaceNavigationPolicy.DefaultFunnel;

    if (page !== WorkspacePage.Version) {
      return { page, funnelIdentifier };
    }

    if (!WorkspaceNavigation.validVersionIdentifier(versionIdentifier)) {
      return { page: WorkspacePage.Versions, funnelIdentifier };
    }

    return { page, funnelIdentifier, versionIdentifier };
  },

  href(page: WorkspacePage, funnelIdentifier: string, versionIdentifier?: string): string {
    const parameters = new URLSearchParams({ funnel: funnelIdentifier });

    if (page === WorkspacePage.Version && versionIdentifier) {
      parameters.set('version', versionIdentifier);
    }

    return `#${page}?${parameters}`;
  },

  navigate(page: WorkspacePage, funnelIdentifier: string): void {
    globalThis.location.hash = WorkspaceNavigation.href(page, funnelIdentifier);
  },
} as const;
