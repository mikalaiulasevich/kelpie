import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationFactory } from '../../source/application/create-application.js';
import { ApplicationCreationFailure } from '../fixtures/application-creation-failure.js';

describe('application creation cleanup', () => {
  afterEach(() => vi.restoreAllMocks());

  it('closes its Fastify adapter when Nest rejects before returning an application', async () => {
    const setupError = new Error('Nest initialization failed.');
    const fixture = ApplicationCreationFailure.prepare(setupError);

    await expect(ApplicationFactory.create(fixture.environment)).rejects.toBe(setupError);

    expect(fixture.create).toHaveBeenCalledOnce();
    expect(fixture.close).toHaveBeenCalledOnce();
  });

  it('preserves both Nest initialization and adapter cleanup failures', async () => {
    const setupError = new Error('Nest initialization failed.');
    const cleanupError = new Error('Fastify cleanup failed.');
    const fixture = ApplicationCreationFailure.prepare(setupError, cleanupError);

    await expect(ApplicationFactory.create(fixture.environment)).rejects.toMatchObject({
      name: 'AggregateError',
      message: 'Application setup failed and its resources could not be released.',
      errors: [setupError, cleanupError],
      cause: cleanupError,
    });

    expect(fixture.create).toHaveBeenCalledOnce();
    expect(fixture.close).toHaveBeenCalledOnce();
  });
});
