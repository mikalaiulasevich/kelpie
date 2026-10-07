import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceSidebar } from '../../source/workspace/workspace-sidebar';
import { WorkspacePage } from '../../source/workspace/workspace-navigation';

describe('workspace sidebar navigation', () => {
  it('keeps configuration inspection in its parent section and preserves encoded funnel links', () => {
    const markup = renderToStaticMarkup(
      createElement(WorkspaceSidebar, {
        page: WorkspacePage.Version,
        funnelIdentifier: 'wellness & campaign=summer',
        identity: { identifier: 'administrator', username: 'admin@example.com' },
        pending: false,
        signOut: vi.fn(),
      }),
    );

    expect(markup).toMatch(
      /href="#versions\?funnel=wellness\+%26\+campaign%3Dsummer" aria-current="page"/,
    );
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toContain('href="#analytics?funnel=wellness+%26+campaign%3Dsummer"');
    expect(markup).toContain('href="#history?funnel=wellness+%26+campaign%3Dsummer"');
    expect(markup.match(/aria-label="Keyboard shortcuts"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Open navigation"');
  });
});
