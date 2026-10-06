import type { InformationStep } from '../../source/index.js';

declare const informationStep: InformationStep;

export const informationContent: Readonly<{ title: string; body: string }> = {
  title: informationStep.content.title,
  body: informationStep.content.body,
};

// @ts-expect-error Information content must include all required fields from its schema.
export const incompleteInformationContent: InformationStep['content'] = { title: 'Only a title' };
