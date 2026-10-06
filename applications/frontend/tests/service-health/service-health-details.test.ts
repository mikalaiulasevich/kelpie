import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ServiceHealthStatus } from '../../source/service-health/service-health';
import { ServiceHealthDetails } from '../../source/service-health/service-health-details';
import { ServiceHealthDetailsCases } from '../cases/service-health-details-cases';

describe('service health details', () => {
  it.each(ServiceHealthDetailsCases.PendingOrFailed)(
    'renders only the $name description without a timestamp',
    ({ health, expectedDescription }) => {
      const markup = renderToStaticMarkup(createElement(ServiceHealthDetails, { health }));

      expect(markup).toBe(expectedDescription);
    },
  );

  it('renders the verified timestamp and readiness scope for a ready service', () => {
    const checkedAt = new Date('2026-10-06T12:34:56.000Z');
    const markup = renderToStaticMarkup(
      createElement(ServiceHealthDetails, {
        health: { status: ServiceHealthStatus.Ready, checkedAt },
      }),
    );

    expect(markup).toBe(
      'Verified at <time dateTime="2026-10-06T12:34:56.000Z">' +
        checkedAt.toLocaleTimeString('en-AU') +
        '</time>. This check confirms backend readiness only.',
    );
  });
});
