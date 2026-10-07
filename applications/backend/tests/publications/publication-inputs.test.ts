import { describe, expect, it } from 'vitest';
import { PublicationInputs } from '../../source/publications/publication-inputs.js';
import { PublicationCases } from '../cases/publication-cases.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';

describe('bounded administration inputs', () => {
  it.each(PublicationCases.InvalidQueries)('rejects $name', ({ query }) => {
    expect(() => PublicationInputs.query(query)).toThrow();
  });
  it.each(PublicationCases.InvalidPublications)('rejects $name', ({ properties }) => {
    const request = PublicationFixtures.request('test', '00000000-0000-0000-0000-000000000001');
    expect(() => PublicationInputs.publish({ ...request, ...properties })).toThrow();
  });
});
