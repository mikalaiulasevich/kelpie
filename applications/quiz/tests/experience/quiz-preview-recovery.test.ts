import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { QuizSessionContent } from '../../source/experience/quiz-session-content';
import { SessionFixtures } from '../fixtures/session-fixtures';

describe('Quiz preview recovery', () => {
  it('explains how to recreate a missing preview without offering production creation', () => {
    vi.stubGlobal('window', { location: { search: '?preview=1' } });
    const session = SessionFixtures.controller();
    const markup = renderToStaticMarkup(createElement(QuizSessionContent, { session }));

    expect(markup).toContain('This preview is no longer available');
    expect(markup).toContain('Test this version');
    expect(markup).not.toContain('Find your workstyle');
    expect(markup).not.toContain('<button');
  });

  it('does not mistake an unsuccessful session lookup for an expired preview', () => {
    vi.stubGlobal('window', { location: { search: '?preview=1' } });
    const session = { ...SessionFixtures.controller(), error: 'Connection unavailable' };
    const markup = renderToStaticMarkup(createElement(QuizSessionContent, { session }));

    expect(markup).toBe('');
  });

  it('keeps the public welcome and a valid preview interactive', () => {
    const session = SessionFixtures.controller();
    const welcome = renderToStaticMarkup(createElement(QuizSessionContent, { session }));

    expect(welcome).toContain('Find your workstyle');
    vi.stubGlobal('window', { location: { search: '?preview=1' } });
    const preview = renderToStaticMarkup(
      createElement(QuizSessionContent, {
        session: SessionFixtures.controller(SessionFixtures.state()),
      }),
    );

    expect(preview).toContain('<button');
    expect(preview).not.toContain('This preview is no longer available');
  });
});
