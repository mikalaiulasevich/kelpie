import { validateFunnelConfiguration } from './configuration-validation.js';
import { configurationLimits } from './configuration-policy.js';

export const FunnelConfigurations = Object.freeze({
  validate: validateFunnelConfiguration,
  limits: configurationLimits,
});
