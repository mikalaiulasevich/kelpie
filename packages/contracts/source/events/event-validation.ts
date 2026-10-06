import { difference } from 'es-toolkit/array';

import { ConfigurationPaths } from '../configurations/configuration-paths.js';
import { ConfigurationMessages } from '../configurations/configuration-messages.js';
import type { ConfigurationValidationContext } from '../configurations/validation/configuration-validation-context.js';
import { EventPolicy } from './event-policy.js';

export const EventValidation = {
  baseProperties(context: ConfigurationValidationContext): void {
    const unsupported = difference(
      context.configuration.events.baseProperties,
      EventPolicy.BaseProperties,
    );

    for (const property of unsupported) {
      context.report(
        ConfigurationPaths.BaseEventProperties,
        ConfigurationMessages.UnsupportedBaseEventProperty(property),
      );
    }
  },

  declaredProperties(context: ConfigurationValidationContext): void {
    for (const event of context.configuration.events.allowed) {
      for (const property of difference(event.properties, EventPolicy.Properties)) {
        context.report(
          ConfigurationPaths.AllowedEvents,
          ConfigurationMessages.UnsupportedEventProperty(property),
        );
      }
    }
  },

  requiredEvents(context: ConfigurationValidationContext, eventNames: ReadonlyList<string>): void {
    for (const name of difference(EventPolicy.RequiredEvents, eventNames)) {
      context.report(
        ConfigurationPaths.AllowedEvents,
        ConfigurationMessages.MissingRequiredEvent(name),
      );
    }
  },

  validate(context: ConfigurationValidationContext): void {
    const declarations = context.configuration.events.allowed;
    const eventNames = declarations.map((event) => event.name);

    if (new Set(eventNames).size !== declarations.length) {
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
