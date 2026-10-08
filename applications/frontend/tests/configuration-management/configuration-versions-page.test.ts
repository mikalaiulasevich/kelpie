import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ConfigurationVersionsPage } from '../../source/configuration-management/configuration-versions-page';
import { useManagementRead } from '../../source/management/use-management-read';

vi.mock('../../source/management/use-management-read', () => ({ useManagementRead: vi.fn() }));

describe('configuration library loading controls', () => {
  it('keeps search and sorting available without stale rows during loading', () => {
    vi.mocked(useManagementRead).mockReturnValue({ status: 'loading' });
    const markup = renderToStaticMarkup(
      createElement(ConfigurationVersionsPage, {
        funnelIdentifier: 'current-funnel',
        revision: 4,
        onUnauthorized: vi.fn(),
        onImport: vi.fn(),
        onIntent: vi.fn(),
      }),
    );

    expect(markup).toContain('aria-label="Search versions"');
    expect(markup).toContain('aria-label="Sort by version"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('<tbody data-slot="table-body"');
    expect(markup).not.toContain('data-slot="table-cell"');
    expect(markup).not.toContain('No versions yet');
  });
});
