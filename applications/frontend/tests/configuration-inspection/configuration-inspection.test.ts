import { ConfigurationInspectionProjection } from '../../source/configuration-inspection/configuration-inspection-projection';
import { ConfigurationJson } from '../../source/configuration-inspection/configuration-json';
import { ConfigurationStepDetails } from '../../source/configuration-inspection/configuration-step-details';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DictionaryAccess, ExperimentVariant } from '@kelpie/contracts';
import { describe, expect, it } from 'vitest';
import { ConfigurationStepsPanel } from '../../source/configuration-inspection/configuration-steps-panel';
import { ConfigurationResultsPanel } from '../../source/configuration-inspection/configuration-results-panel';
import { ConfigurationInspectionFixture } from '../fixtures/configuration-inspection-fixtures';

describe('configuration inspection', () => {
  it('applies variant B partial content without mutating the persisted document or losing base fields', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const originalDocument = JSON.stringify(configuration);
    const step = DictionaryAccess.readOwn(configuration.steps, 'priorities');

    expect(step).toBeDefined();

    if (!step) {
      return;
    }

    const content = ConfigurationInspectionProjection.stepContent(
      configuration,
      ExperimentVariant.B,
      step,
    );

    expect(content.title).toBe('What is the most urgent operating constraint?');
    expect(content.helperText).toBe(
      'Choose up to three. Some answers may open a follow-up question.',
    );
    expect(
      ConfigurationInspectionProjection.stepContent(configuration, ExperimentVariant.A, step).title,
    ).toBe('What should the operating model improve?');
    const partialOverrideConfiguration = {
      ...configuration,
      experiment: {
        ...configuration.experiment,
        variants: {
          ...configuration.experiment.variants,
          B: {
            ...configuration.experiment.variants.B,
            stepOverrides: { priorities: { content: { title: 'One changed field' } } },
          },
        },
      },
    };

    expect(
      ConfigurationInspectionProjection.stepContent(
        partialOverrideConfiguration,
        ExperimentVariant.B,
        step,
      ),
    ).toEqual({
      title: 'One changed field',
      helperText: 'Choose between one and three priorities.',
    });
    expect(JSON.stringify(configuration)).toBe(originalDocument);
  });

  it('renders the selected variant’s sequence, conditional steps and content while omitting removed steps', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const markup = renderToStaticMarkup(
      createElement(ConfigurationStepsPanel, { configuration, variant: ExperimentVariant.B }),
    );

    expect(markup).toContain('Is your team losing time to the way it works?');
    expect(markup).toContain('security_constraints');
    expect(markup).toContain('If');
    expect(markup).not.toContain('Number input');
    expect(markup).not.toContain('tool_count');
    expect(markup.indexOf('work_mode')).toBeLessThan(markup.indexOf('team_size'));
    expect(markup.indexOf('meeting_hours')).toBeLessThan(markup.indexOf('timezone_span'));
  });

  it('renders result overrides and keeps default result, rule order and base recommendations', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const originalDocument = JSON.stringify(configuration);
    const markup = renderToStaticMarkup(
      createElement(ConfigurationResultsPanel, { configuration, variant: ExperimentVariant.B }),
    );

    expect(markup).toContain('Your team needs a compliance-aware operating model');
    expect(markup).toContain('Open the implementation details');
    expect(markup).toContain('expand_recommendation');
    expect(markup).toContain('Separate decision records from restricted source material.');
    expect(markup).toContain('Otherwise show');
    expect(markup.indexOf('regulated_scale')).toBeLessThan(markup.indexOf('meeting_heavy'));
    expect(JSON.stringify(configuration)).toBe(originalDocument);
  });

  it('shows readable numeric boundaries while keeping advanced validation collapsed', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const step = DictionaryAccess.readOwn(configuration.steps, 'meeting_hours');

    expect(step).toBeDefined();

    if (!step) {
      return;
    }

    const markup = renderToStaticMarkup(
      createElement(ConfigurationStepDetails, {
        configuration,
        variant: ExperimentVariant.B,
        step,
        position: 3,
      }),
    );

    expect(markup).toContain('Number input');
    expect(markup).toContain('0 – 40 hours');
    expect(markup).toContain('Increment: 1');
    expect(markup).toContain('Required');
    expect(markup).toContain('Advanced input &amp; validation');
    expect(markup).not.toContain('&quot;messages&quot;');
  });

  it('shows selection labels, serialized values and exact visibility declaration', () => {
    const configuration = ConfigurationInspectionFixture.configuration();
    const step = DictionaryAccess.readOwn(configuration.steps, 'security_constraints');

    expect(step).toBeDefined();

    if (!step) {
      return;
    }

    const markup = renderToStaticMarkup(
      createElement(ConfigurationStepDetails, {
        configuration,
        variant: ExperimentVariant.B,
        step,
        position: 8,
      }),
    );

    expect(markup).toContain('Standard role-based access');
    expect(markup).toContain('standard');
    expect(markup).toContain('Choose one');
    expect(markup).toContain('&quot;contains&quot;');
    expect(markup).toContain('&quot;compliance&quot;');
  });

  it('escapes configuration text rather than interpreting it as executable HTML', () => {
    const markup = renderToStaticMarkup(
      createElement(ConfigurationJson, { value: { title: '<script>alert(1)</script>' } }),
    );

    expect(markup).toContain('&lt;script&gt;');
    expect(markup).not.toContain('<script>');
  });
});
