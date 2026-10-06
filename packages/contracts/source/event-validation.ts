import { ConfigurationPaths } from './configuration-paths.js';
import { ConfigurationMessages } from './configuration-messages.js';
import type { ConfigurationValidationContext } from './configuration-validation-context.js';
import { EventPolicy } from './event-policy.js';

const supportedProperties: ReadonlySet<string> = new Set(EventPolicy.properties);
const supportedBaseProperties: ReadonlySet<string> = new Set(EventPolicy.baseProperties);

export const EventValidation = {
  validate(context: ConfigurationValidationContext): void {
    const { configuration } = context;
    const eventNames = new Set(configuration.events.allowed.map((event) => event.name));

    if (eventNames.size !== configuration.events.allowed.length) {
      context.report(
        ConfigurationPaths.allowedEvents,
        ConfigurationMessages.UniqueEventNamesRequired,
      );
    }

    for (const property of configuration.events.baseProperties) {
      if (!supportedBaseProperties.has(property)) {
        context.report(
          ConfigurationPaths.baseEventProperties,
          ConfigurationMessages.UnsupportedBaseEventProperty(property),
        );
      }
    }

    for (const event of configuration.events.allowed) {
      for (const property of event.properties) {
        if (!supportedProperties.has(property)) {
          context.report(
            ConfigurationPaths.allowedEvents,
            ConfigurationMessages.UnsupportedEventProperty(property),
          );
        }
      }
    }

    for (const name of EventPolicy.requiredEvents) {
      if (!eventNames.has(name)) {
        context.report(
          ConfigurationPaths.allowedEvents,
          ConfigurationMessages.MissingRequiredEvent(name),
        );
      }
    }
  },
} as const;
