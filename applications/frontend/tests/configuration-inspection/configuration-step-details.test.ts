import { ExperimentVariant, StepType } from '@kelpie/contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConfigurationStepDetails } from '../../source/configuration-inspection/configuration-step-details';
import { ConfigurationInspectionFixture } from '../fixtures/configuration-inspection-fixtures';

describe('step inspector presentation', () => {
  it('keeps visibility accessible in a closed disclosure and options readonly', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const step = configuration.steps.security_constraints;

    expect(step).toBeDefined();

    if (!step) {
      return;
    }

    const originalDocument = JSON.stringify(configuration);
    const markup = renderToStaticMarkup(
      createElement(ConfigurationStepDetails, {
        configuration,
        variant: ExperimentVariant.B,
        step,
        position: 8,
      }),
    );

    expect(markup).toMatch(/<details[^>]*><summary/);
    expect(markup).not.toMatch(/<details[^>]*\bopen(?:[\s=>])/);
    expect(markup).toContain('Visibility rules');
    expect(markup).toContain('&quot;contains&quot;');
    expect(markup).toContain('&quot;compliance&quot;');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('Standard role-based access');
    expect(markup).not.toMatch(/<(input|select|textarea)\b|role="(checkbox|radio)"/);
    expect(JSON.stringify(configuration)).toBe(originalDocument);
  });

  it('retains optional selection limits, exact labels and code values', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const originalStep = configuration.steps.priorities;

    expect(originalStep?.type).toBe(StepType.MultiSelect);

    if (originalStep?.type !== StepType.MultiSelect) {
      return;
    }

    const step = {
      ...originalStep,
      validation: {
        ...originalStep.validation,
        required: false,
        minSelections: 0,
        maxSelections: 2,
      },
    };
    const markup = renderToStaticMarkup(
      createElement(ConfigurationStepDetails, {
        configuration,
        variant: ExperimentVariant.A,
        step,
        position: 4,
      }),
    );

    expect(markup).toContain('Optional');
    expect(markup).toContain('Selections: 0 – 2');
    expect(markup).toContain('Choose between one and three priorities.');

    for (const option of step.input.options) {
      expect(markup).toContain(option.label);
      expect(markup).toContain(`>${option.value}</code>`);
    }

    expect(markup).not.toMatch(/<(input|select|textarea)\b/);
  });

  it('preserves title and loading copy together and escapes multiline prose', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const originalStep = configuration.steps.result;

    expect(originalStep?.type).toBe(StepType.Result);

    if (originalStep?.type !== StepType.Result) {
      return;
    }

    const step = {
      ...originalStep,
      content: {
        ...originalStep.content,
        title: 'Result overview',
        body: 'First line\n<script>literal text</script>',
      },
    };
    const markup = renderToStaticMarkup(
      createElement(ConfigurationStepDetails, {
        configuration,
        variant: ExperimentVariant.A,
        step,
        position: 10,
      }),
    );

    expect(markup).toContain('Result overview');
    expect(markup).toContain('Building your recommendation…');
    expect(markup).toContain('We could not build the recommendation');
    expect(markup).toContain('Try again');
    expect(markup).toContain('First line\n&lt;script&gt;literal text&lt;/script&gt;');
    expect(markup).toContain('resultRules');
    expect(markup).not.toContain('<script>');
    expect(markup).not.toContain('Advanced input');
  });
});
