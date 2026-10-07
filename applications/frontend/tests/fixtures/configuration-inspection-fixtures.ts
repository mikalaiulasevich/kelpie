import { readFileSync } from 'node:fs';
import { FunnelConfigurations, type FunnelConfiguration } from '@kelpie/contracts';

export const ConfigurationInspectionFixture = {
  configuration(): FunnelConfiguration {
    const document: unknown = JSON.parse(
      readFileSync(new URL('../../../../configurations/funnel-v3.json', import.meta.url), 'utf8'),
    );
    const validation = FunnelConfigurations.validate(document);

    if (!validation.valid) {
      throw new Error('The canonical version 3 fixture must be valid.');
    }

    return validation.configuration;
  },
} as const;
