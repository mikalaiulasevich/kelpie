/** Serialized diagnostic paths belong here; validators select a named domain location. */
export const ConfigurationPaths = {
  Root: '/',
  Variants: '/experiment/variants',
  DefaultResult: '/defaultResultId',
  AllowedEvents: '/events/allowed',
  BaseEventProperties: '/events/baseProperties',

  step(identifier: string) {
    const path = `/steps/${identifier}` as const;

    return {
      identifier: `${path}/id`,
      input: `${path}/input`,
      options: `${path}/input/options`,
      answerName: `${path}/input/name`,
      validation: `${path}/validation`,
      visibility: `${path}/visibleWhen`,
    } as const;
  },

  variant(identifier: string) {
    const path = `${ConfigurationPaths.Variants}/${identifier}` as const;

    return {
      sequence: `${path}/stepSequence`,

      stepOverride(stepIdentifier: string): string {
        return `${path}/stepOverrides/${stepIdentifier}`;
      },

      stepOverrideContent(stepIdentifier: string): string {
        return `${path}/stepOverrides/${stepIdentifier}/content`;
      },

      resultOverride(resultIdentifier: string): string {
        return `${path}/resultOverrides/${resultIdentifier}`;
      },
    } as const;
  },

  resultIdentifier(identifier: string): string {
    return `/results/${identifier}/id`;
  },

  resultRule(position: number) {
    const path = `/resultRules/${position}` as const;

    return { result: `${path}/resultId`, condition: `${path}/when` } as const;
  },

  contentTitle(contentPath: string): string {
    return `${contentPath}/title`;
  },
} as const;
