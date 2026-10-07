import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalyticsVersionPanel } from '../../source/analytics/analytics-version-panel';
import { AnalyticsPageFixture } from '../fixtures/analytics-page-fixtures';

describe('analytics presentation', () => {
  it('keeps all zero-denominator summary ratios not applicable and shows an honest empty chart', () => {
    const version = AnalyticsPageFixture.emptyVersion();

    const markup = renderToStaticMarkup(createElement(AnalyticsVersionPanel, { version }));

    expect(markup.match(/Not applicable/g)).toHaveLength(3);
    expect(markup.match(/0 \/ 0 sessions/g)).toHaveLength(3);
    expect(markup).toContain('Waiting for session observations');
    expect(markup).not.toContain('>0%</');
    expect(markup).not.toContain('Loading comparison chart');
  });

  it('displays the distinct start and result denominators beside the corresponding rates', () => {
    const version = AnalyticsPageFixture.observedVersion();

    const markup = renderToStaticMarkup(createElement(AnalyticsVersionPanel, { version }));

    expect(markup).toContain('25%');
    expect(markup).toContain('50%');
    expect(markup).toContain('2 / 8 sessions');
    expect(markup).toContain('4 / 8 sessions');
    expect(markup).toContain('2 / 4 sessions');
    expect(markup).toContain('CTA conversion · primary');
    expect(markup).not.toContain('Not applicable');
    expect(markup).not.toContain('Waiting for session observations');
    expect(markup).toContain('Loading comparison chart');
  });
});
