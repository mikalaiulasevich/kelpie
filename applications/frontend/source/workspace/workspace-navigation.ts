import { isString } from 'es-toolkit/predicate';

export const WorkspacePage = {
  Analytics: 'analytics',
  Versions: 'versions',
  History: 'history',
} as const;

export type WorkspacePage = ValueOf<typeof WorkspacePage>;

export interface WorkspaceLocation {
  readonly page: WorkspacePage;
  readonly funnelIdentifier: string;
}

export const WorkspaceNavigation = {
  DefaultFunnel: 'workstyle-planner',
  MaximumIdentifierCharacters: 100,
  IdentifierPattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/,

  validIdentifier(value: unknown): value is string {
    return isString(value) && value.length <= this.MaximumIdentifierCharacters && this.IdentifierPattern.test(value);
  },

  read(): WorkspaceLocation {
    const [path, query] = globalThis.location.hash.slice(1).split('?');
    const parameters = new URLSearchParams(query);
    const candidate = parameters.get('funnel');
    const page = Object.values(WorkspacePage).find(value => value === path) ?? WorkspacePage.Analytics;

    return { page, funnelIdentifier: this.validIdentifier(candidate) ? candidate : this.DefaultFunnel };
  },

  href(page: WorkspacePage, funnelIdentifier: string): string {
    const parameters = new URLSearchParams({ funnel: funnelIdentifier });

    return `#${page}?${parameters}`;
  },

  navigate(page: WorkspacePage, funnelIdentifier: string): void {
    globalThis.location.hash = this.href(page, funnelIdentifier);
  },
} as const;
