import { describe, expect, it } from 'vitest';
import { ManagementQueries } from '../../source/management/management-queries.js';
import { ManagementCases } from '../cases/management-cases.js';

describe('bounded management queries', () => {
  it.each(ManagementCases.InvalidQueries)('rejects $name', ({ query }) => {
    expect(() => ManagementQueries.read(query)).toThrow();
  });

  it('normalizes defaults without mutating the input', () => {
    const query = { funnelIdentifier: 'workstyle-planner' };
    expect(ManagementQueries.read(query)).toEqual({
      funnelIdentifier: 'workstyle-planner',
      limit: 25,
      offset: 0,
    });
    expect(query).toEqual({ funnelIdentifier: 'workstyle-planner' });
  });

  it('accepts maximum page size and offset without coercing unknown fields', () => {
    expect(
      ManagementQueries.read({
        funnelIdentifier: 'workstyle-planner',
        limit: '100',
        offset: '10000',
      }),
    ).toEqual({ funnelIdentifier: 'workstyle-planner', limit: 100, offset: 10000 });
  });
});
