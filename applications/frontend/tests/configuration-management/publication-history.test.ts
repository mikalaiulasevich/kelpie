import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PublicationHistoryFeed } from '../../source/configuration-management/publication-history-feed';
import { useManagementRead } from '../../source/management/use-management-read';
import {
  PublicationHistoryFixture,
  PublicationHistoryRendering,
} from '../fixtures/publication-history-fixtures';

vi.mock('../../source/management/use-management-read', () => ({ useManagementRead: vi.fn() }));

describe('publication history presentation', () => {
  it('groups the server chronology by date with action titles, revisions and exact timestamps', () => {
    const history = PublicationHistoryFixture.history();
    const markup = renderToStaticMarkup(
      createElement(PublicationHistoryFeed, {
        funnelIdentifier: history.funnel.identifier,
        items: history.items,
      }),
    );

    expect(markup.match(/<section /g)).toHaveLength(2);
    expect(markup.match(/<ol /g)).toHaveLength(2);
    expect(markup.match(/<li /g)).toHaveLength(3);
    expect(markup).toContain('October 7, 2026');
    expect(markup).toContain('October 6, 2026');
    expect(markup.indexOf('#3')).toBeLessThan(markup.indexOf('#2'));
    expect(markup.indexOf('#2')).toBeLessThan(markup.indexOf('#1'));
    expect(markup.match(/>Published</g)).toHaveLength(2);
    expect(markup).toContain('>Rolled back<');
    expect(markup).toContain('dateTime="2026-10-07T14:00:00"');
    expect(markup).toContain('2:00 PM');
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('administrator-private-identifier');
  });

  it('links real version identifiers to their funnel and leaves the initial previous version empty', () => {
    const history = PublicationHistoryFixture.history();
    const markup = renderToStaticMarkup(
      createElement(PublicationHistoryFeed, {
        funnelIdentifier: history.funnel.identifier,
        items: history.items,
      }),
    );

    expect(markup).toContain(
      'href="#version?funnel=workstyle-planner&amp;version=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"',
    );
    expect(markup).toContain(
      'href="#version?funnel=workstyle-planner&amp;version=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"',
    );
    expect(markup).toContain('title="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"');
    expect(markup).toContain('aaaaaaaa…');
    expect(markup).toContain('<dd>—</dd>');
    expect(markup.match(/<a /g)).toHaveLength(5);
  });

  it('does not create routes for malformed identifiers and tolerates unparseable timestamps', () => {
    const history = PublicationHistoryFixture.history();
    const markup = renderToStaticMarkup(
      createElement(PublicationHistoryFeed, {
        funnelIdentifier: history.funnel.identifier,
        items: history.items.map((item) => ({
          ...item,
          targetVersionIdentifier: 'not-a-version',
          previousVersionIdentifier: null,
          createdAt: 'unknown date',
        })),
      }),
    );

    expect(markup).not.toContain('href=');
    expect(markup).toContain('unknown date');
    expect(markup).toContain('not-a-ve…');
  });

  it('retains loading and error recovery without showing a feed', () => {
    vi.mocked(useManagementRead).mockReturnValue({ status: 'loading' });
    const loading = PublicationHistoryRendering.page();

    expect(loading).toContain('Loading activation history');
    expect(loading).not.toContain('<ol');

    vi.mocked(useManagementRead).mockReturnValue({
      status: 'error',
      message: 'History unavailable',
    });
    const error = PublicationHistoryRendering.page();

    expect(error).toContain('History unavailable');
    expect(PublicationHistoryRendering.button(error, 'Try again')).toBeDefined();
    expect(error).not.toContain('<ol');
  });

  it('retains rollback eligibility and page controls for a populated first page', () => {
    vi.mocked(useManagementRead).mockReturnValue({
      status: 'ready',
      data: PublicationHistoryFixture.history(),
    });
    const markup = PublicationHistoryRendering.page();

    expect(PublicationHistoryRendering.button(markup, 'Roll back')).toMatch(/^<button/);
    expect(PublicationHistoryRendering.button(markup, 'Roll back')).not.toContain('disabled=""');
    expect(PublicationHistoryRendering.button(markup, 'Previous')).toContain('disabled=""');
    expect(PublicationHistoryRendering.button(markup, 'Next')).toMatch(/^<button/);
    expect(PublicationHistoryRendering.button(markup, 'Next')).not.toContain('disabled=""');
    expect(markup).toContain('Showing 1–3');
    expect(markup).toContain('<ol');
  });

  it('retains the empty state with unavailable rollback and pagination', () => {
    vi.mocked(useManagementRead).mockReturnValue({
      status: 'ready',
      data: { ...PublicationHistoryFixture.history(), items: [], nextOffset: null },
    });
    const markup = PublicationHistoryRendering.page();

    expect(markup).toContain('No activations yet');
    expect(PublicationHistoryRendering.button(markup, 'Roll back')).toContain('disabled=""');
    expect(PublicationHistoryRendering.button(markup, 'Next')).toContain('disabled=""');
    expect(markup).toContain('Showing 0–0');
    expect(markup).not.toContain('<ol');
  });
});
