import { ExperimentVariant } from '@kelpie/contracts';

interface PublishedVariantCase {
  readonly version: number;
  readonly variant: ExperimentVariant;
}

export const ExperimentCases = {
  publishedVariants: [
    { version: 1, variant: ExperimentVariant.A },
    { version: 1, variant: ExperimentVariant.B },
    { version: 2, variant: ExperimentVariant.A },
    { version: 2, variant: ExperimentVariant.B },
    { version: 3, variant: ExperimentVariant.A },
    { version: 3, variant: ExperimentVariant.B },
  ] satisfies ReadonlyList<PublishedVariantCase>,
} as const;
