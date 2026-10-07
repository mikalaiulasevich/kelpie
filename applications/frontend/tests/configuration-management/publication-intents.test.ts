import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicationIntents } from '../../source/configuration-management/publication-intents';
import { PublicationIntentFixture } from '../fixtures/publication-intent-fixtures';
import { PublicationIntentCases } from '../cases/publication-intent-cases';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('pending publication recovery', () => {
  it('preserves the exact publication body and operation identifier across repeated reload-like reads', () => {
    const { values } = PublicationIntentFixture.storage();

    PublicationIntents.save('administrator-1', PublicationIntentFixture.publish());
    expect(values.get('kelpie.publication-intent.administrator-1')).toBe(
      '{"kind":"publish","label":"Version 3","command":{"operationIdentifier":"12345678-1234-1234-1234-123456789012","funnelIdentifier":"workstyle-planner","expectedRevision":2,"targetVersionIdentifier":"22345678-1234-1234-1234-123456789012"}}',
    );
    const firstRead = PublicationIntents.read('administrator-1');
    const reloadedRead = PublicationIntents.read('administrator-1');

    expect(reloadedRead).toEqual({
      kind: 'publish',
      label: 'Version 3',
      command: {
        operationIdentifier: '12345678-1234-1234-1234-123456789012',
        funnelIdentifier: 'workstyle-planner',
        expectedRevision: 2,
        targetVersionIdentifier: '22345678-1234-1234-1234-123456789012',
      },
    });
    expect(reloadedRead).not.toBe(firstRead);
  });

  it('isolates administrator pending operations and clears only the requested owner', () => {
    PublicationIntentFixture.storage();
    PublicationIntents.save('administrator-1', PublicationIntentFixture.publish());
    PublicationIntents.save('administrator-2', PublicationIntentFixture.rollback());

    expect(PublicationIntents.read('administrator-3')).toBeUndefined();
    expect(PublicationIntents.clear('administrator-1')).toBe(true);
    expect(PublicationIntents.read('administrator-1')).toBeUndefined();
    expect(PublicationIntents.read('administrator-2')).toEqual({
      kind: 'rollback',
      label: 'Previous activation',
      command: {
        operationIdentifier: '32345678-1234-1234-1234-123456789012',
        funnelIdentifier: 'workstyle-planner',
        expectedRevision: 3,
      },
    });
  });

  it.each(PublicationIntentCases.InvalidSaved)(
    'ignores $name instead of restoring an unsafe command',
    ({ serialized }) => {
      const { values } = PublicationIntentFixture.storage();
      values.set('kelpie.publication-intent.administrator-1', serialized);

      expect(PublicationIntents.read('administrator-1')).toBeUndefined();
    },
  );

  it('throws the storage failure message and retains its cause before a command can be sent', () => {
    const { storage } = PublicationIntentFixture.storage();
    const failure = new DOMException('Storage is blocked', 'SecurityError');
    storage.setItem.mockImplementation(() => {
      throw failure;
    });

    expect(() =>
      PublicationIntents.save('administrator-1', PublicationIntentFixture.publish()),
    ).toThrow(
      'Your browser could not save this operation for a safe retry. This attempt was not sent.',
    );

    try {
      PublicationIntents.save('administrator-1', PublicationIntentFixture.publish());
    } catch (error) {
      expect(error).toMatchObject({ cause: failure });
    }
  });

  it('ignores unavailable storage during restoration', () => {
    const { storage } = PublicationIntentFixture.storage();
    storage.getItem.mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(PublicationIntents.read('administrator-1')).toBeUndefined();
  });

  it('reports failed cleanup without throwing or deleting the original retry command', () => {
    const { storage } = PublicationIntentFixture.storage();
    const intent = PublicationIntentFixture.publish();
    PublicationIntents.save('administrator-1', intent);
    storage.removeItem.mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    expect(PublicationIntents.clear('administrator-1')).toBe(false);
    expect(PublicationIntents.read('administrator-1')).toEqual(intent);
  });

  it('reports unavailable storage during cleanup without throwing', () => {
    vi.stubGlobal('sessionStorage', undefined);

    expect(PublicationIntents.clear('administrator-1')).toBe(false);
  });
});
