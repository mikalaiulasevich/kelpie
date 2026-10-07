import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceNavigation } from '../../source/workspace/workspace-navigation';
import { WorkspaceNavigationCases } from '../cases/workspace-navigation-cases';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('workspace deep-link navigation', () => {
  it.each(WorkspaceNavigationCases.VersionDeepLinks)(
    'resolves version inspection deep link $hash',
    ({ hash, expected }) => {
      vi.stubGlobal('location', { hash });

      expect(WorkspaceNavigation.read()).toEqual(expected);
    },
  );

  it('includes the selected immutable version in its detail link only', () => {
    const identifier = '22345678-1234-1234-1234-123456789012';
    const href = WorkspaceNavigation.href('version', 'workstyle-planner', identifier);

    expect(href).toBe(
      '#version?funnel=workstyle-planner&version=22345678-1234-1234-1234-123456789012',
    );
    expect(WorkspaceNavigation.href('versions', 'workstyle-planner', identifier)).toBe(
      '#versions?funnel=workstyle-planner',
    );
  });

  it.each(WorkspaceNavigationCases.DeepLinks)(
    'resolves $hash with safe page and funnel fallbacks',
    ({ hash, page, funnelIdentifier }) => {
      vi.stubGlobal('location', { hash });

      expect(WorkspaceNavigation.read()).toEqual({ page, funnelIdentifier });
    },
  );

  it('encodes a funnel identifier as one query value', () => {
    const href = WorkspaceNavigation.href('versions', 'wellness & campaign=summer');

    expect(href).toBe('#versions?funnel=wellness+%26+campaign%3Dsummer');
    expect(new URLSearchParams(href.split('?')[1]).get('funnel')).toBe(
      'wellness & campaign=summer',
    );
  });

  it('updates the location to the selected page without losing the funnel', () => {
    const location = { hash: '#analytics?funnel=wellness' };
    vi.stubGlobal('location', location);

    WorkspaceNavigation.navigate('history', 'wellness');
    expect(location.hash).toBe('#history?funnel=wellness');
    expect(WorkspaceNavigation.read()).toEqual({ page: 'history', funnelIdentifier: 'wellness' });
  });
});
