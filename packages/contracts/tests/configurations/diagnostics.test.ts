import { describe, expect, it } from 'vitest';

import { FunnelConfigurations } from '../../source/index.js';
import { DiagnosticFixtures } from '../fixtures/diagnostic-fixtures.js';
import { ConfigurationFixtures } from '../fixtures/configuration-fixtures.js';

describe('semantic validation phases', () => {
  it('preserves step, variant, result, and event issue ordering', () => {
    const document = DiagnosticFixtures.multiplePhaseFailures();

    const result = FunnelConfigurations.validate(document);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual([
      '/steps/intro/id',
      '/experiment/variants',
      '/defaultResultId',
      '/events/baseProperties',
    ]);
    // A failed traversal must not leak diagnostics or indexes into the next document.
    expect(FunnelConfigurations.validate(ConfigurationFixtures.original(1)).valid).toBe(true);
  });

  it('preserves duplicate, property and missing-event diagnostics without mutating declarations', () => {
    const document = DiagnosticFixtures.eventDeclarationFailures();
    const original = structuredClone(document);

    const result = FunnelConfigurations.validate(document);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      { path: '/events/allowed', message: 'Event names must be unique.' },
      {
        path: '/events/baseProperties',
        message: 'Unsupported base event property: unsupported_first.',
      },
      {
        path: '/events/baseProperties',
        message: 'Unsupported base event property: unsupported_second.',
      },
      { path: '/events/allowed', message: 'Unsupported event property: unsupported_first.' },
      { path: '/events/allowed', message: 'Unsupported event property: unsupported_second.' },
      { path: '/events/allowed', message: 'Required event missing: session_started.' },
      { path: '/events/allowed', message: 'Required event missing: step_viewed.' },
    ]);
    expect(document).toEqual(original);
  });

  it('keeps a bounded diagnostic prefix for many semantic failures', () => {
    const document = DiagnosticFixtures.excessiveSemanticFailures();
    const result = FunnelConfigurations.validate(document);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(FunnelConfigurations.limits.maximumIssues);
    expect(result.issues[0]?.path).toBe('/resultRules/0/resultId');
    expect(result.issues[1]?.path).toBe('/resultRules/0/when');
  });
});

describe('diagnostic path compatibility', () => {
  it('preserves concrete override, visibility, event, and numeric locations', () => {
    const result = FunnelConfigurations.validate(DiagnosticFixtures.pathCompatibilityFailures());

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toEqual([
      '/steps/team_size/input',
      '/steps/team_size/visibleWhen',
      '/experiment/variants/B/stepOverrides/work_mode/content/title',
      '/steps/team_size/visibleWhen',
      '/experiment/variants/B/stepOverrides/absent_step',
      '/experiment/variants/B/resultOverrides/absent_result',
      '/events/allowed',
    ]);
  });
});
