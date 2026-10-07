import { isString } from 'es-toolkit/predicate';

export const WorkspacePage = {
  Analytics: 'analytics',
  Versions: 'versions',
  Version: 'version',
  History: 'history',
} as const;

export type WorkspacePage = ValueOf<typeof WorkspacePage>;

export interface WorkspaceLocation {
  readonly page: WorkspacePage;
  readonly funnelIdentifier: string;
  readonly versionIdentifier?: string;
}

export const WorkspaceNavigation = {
  DefaultFunnel: 'workstyle-planner',
  MaximumIdentifierCharacters: 100,
  VersionIdentifierPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  IdentifierPattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,

  validIdentifier(value: unknown): value is string {
    return (
      isString(value) &&
      value.length <= this.MaximumIdentifierCharacters &&
      this.IdentifierPattern.test(value)
    );
  },

  read(): WorkspaceLocation {
    const [path, query] = globalThis.location.hash.slice(1).split('?');
    const parameters = new URLSearchParams(query);
    const candidate = parameters.get('funnel');
    const version = parameters.get('version');
    const page =
      Object.values(WorkspacePage).find((value) => value === path) ?? WorkspacePage.Analytics;

    return {
      page:
        page === WorkspacePage.Version && (!version || !this.VersionIdentifierPattern.test(version))
          ? WorkspacePage.Versions
          : page,
      ...(page === WorkspacePage.Version && version && this.VersionIdentifierPattern.test(version)
        ? { versionIdentifier: version }
        : {}),
      funnelIdentifier: this.validIdentifier(candidate) ? candidate : this.DefaultFunnel,
    };
  },

  href(page: WorkspacePage, funnelIdentifier: string, versionIdentifier?: string): string {
    const parameters = new URLSearchParams({ funnel: funnelIdentifier });

    if (page === WorkspacePage.Version && versionIdentifier) {
      parameters.set('version', versionIdentifier);
    }

    return `#${page}?${parameters}`;
  },

  navigate(page: WorkspacePage, funnelIdentifier: string): void {
    globalThis.location.hash = this.href(page, funnelIdentifier);
  },
} as const;
