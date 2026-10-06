import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationValidationContext } from '../configurations/validation/configuration-validation-context.js';
import { EventPolicy } from './event-policy.js';

const supportedProperties: ReadonlySet<string> = new Set(EventPolicy.Properties);
const supportedBaseProperties: ReadonlySet<string> = new Set(EventPolicy.BaseProperties);

export const EventValidation = {
  baseProperties(context: ConfigurationValidationContext): void {
    for (const property of context.configuration.events.baseProperties) {
      if (!supportedBaseProperties.has(property)) {
        context.report(
          ConfigurationPaths.BaseEventProperties,
          ConfigurationMessages.UnsupportedBaseEventProperty(property),
        );
      }
    }
  },

  declaredProperties(context: ConfigurationValidationContext): void {
    for (const event of context.configuration.events.allowed) {
      for (const property of event.properties) {
        if (!supportedProperties.has(property)) {
          context.report(
            ConfigurationPaths.AllowedEvents,
            ConfigurationMessages.UnsupportedEventProperty(property),
          );
        }
      }
    }
  },

  requiredEvents(context: ConfigurationValidationContext, eventNames: ReadonlySet<string>): void {
    for (const name of EventPolicy.RequiredEvents) {
      if (!eventNames.has(name)) {
        context.report(
          ConfigurationPaths.AllowedEvents,
          ConfigurationMessages.MissingRequiredEvent(name),
        );
      }
    }
  },

  validate(context: ConfigurationValidationContext): void {
    const declarations = context.configuration.events.allowed;
    const eventNames = new Set(declarations.map((event) => event.name));

    if (eventNames.size !== declarations.length) {
      context.report(
        ConfigurationPaths.AllowedEvents,
        ConfigurationMessages.UniqueEventNamesRequired,
      );
    }

    EventValidation.baseProperties(context);
    EventValidation.declaredProperties(context);
    EventValidation.requiredEvents(context, eventNames);
  },
} as const;
