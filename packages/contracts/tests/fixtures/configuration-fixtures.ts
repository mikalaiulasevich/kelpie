import { readFileSync } from 'node:fs';
import {
  FunnelConfigurations,
  type FunnelConfiguration,
  type InformationStep,
  type NumberStep,
  type StepOverride,
} from '../../source/index.js';

export const ConfigurationFixtures = {
  original(version: number): unknown {
    return JSON.parse(
      readFileSync(
        new URL(`../../../../configurations/funnel-v${version}.json`, import.meta.url),
        'utf8',
      ),
    );
  },
  valid(version = 1): FunnelConfiguration {
    const result = FunnelConfigurations.validate(ConfigurationFixtures.original(version));
    if (!result.valid) {
      throw new Error(`Invalid configuration fixture ${version}: ${JSON.stringify(result.issues)}`);
    }

    return result.configuration;
  },
  informationStep(configuration: FunnelConfiguration): InformationStep {
    const step = configuration.steps['intro'];
    if (step?.type !== 'info') {
      throw new Error('Configuration fixture requires an information introduction.');
    }

    return step;
  },
  withVariantIntroductionContent(content: StepOverride['content']): FunnelConfiguration {
    const configuration = ConfigurationFixtures.valid();

    return {
      ...configuration,
      experiment: {
        ...configuration.experiment,
        variants: {
          ...configuration.experiment.variants,
          B: { ...configuration.experiment.variants.B, stepOverrides: { intro: { content } } },
        },
      },
    };
  },
  numberStep(configuration: FunnelConfiguration): NumberStep {
    const step = configuration.steps['team_size'];
    if (step?.type !== 'number') {
      throw new Error('Configuration fixture requires numeric team size.');
    }

    return step;
  },
} as const;
