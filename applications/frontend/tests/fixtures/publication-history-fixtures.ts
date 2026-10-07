import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { vi } from 'vitest';
import { PublicationHistoryPage } from '../../source/configuration-management/publication-history-page';
import type { PublicationHistory } from '../../source/management/management-types';

export const PublicationHistoryFixture = {
  history(): PublicationHistory {
    const publication = {
      identifier: 'activation-3',
      operationIdentifier: 'operation-3',
      administratorIdentifier: 'administrator-private-identifier',
      funnelIdentifier: 'workstyle-planner',
      action: 'publish',
      targetVersionIdentifier: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      previousVersionIdentifier: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      revision: 3,
      createdAt: '2026-10-07T14:00:00',
    };

    return {
      funnel: {
        identifier: 'workstyle-planner',
        activeVersionIdentifier: publication.targetVersionIdentifier,
        revision: 3,
      },
      items: [
        publication,
        {
          ...publication,
          identifier: 'activation-2',
          operationIdentifier: 'operation-2',
          action: 'rollback',
          revision: 2,
          createdAt: '2026-10-07T10:00:00',
        },
        {
          ...publication,
          identifier: 'activation-1',
          operationIdentifier: 'operation-1',
          revision: 1,
          previousVersionIdentifier: null,
          createdAt: '2026-10-06T09:00:00',
        },
      ],
      nextOffset: 3,
    };
  },
} as const;

export const PublicationHistoryRendering = {
  page(): string {
    return renderToStaticMarkup(
      createElement(PublicationHistoryPage, {
        funnelIdentifier: 'workstyle-planner',
        revision: 3,
        onUnauthorized: vi.fn(),
        onIntent: vi.fn(),
      }),
    );
  },

  button(markup: string, label: string): Optional<string> {
    return markup
      .match(/<button\b[^>]*>[\s\S]*?<\/button>/g)
      ?.find((button) => button.includes(label));
  },
} as const;
