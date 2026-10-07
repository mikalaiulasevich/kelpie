import type { Publication } from '../../generated/prisma/client.js';
import type { PublicationAction } from './publication-policy.js';

export interface PublicationIntent {
  readonly action: PublicationAction;
  readonly administratorIdentifier: string;
  readonly operationIdentifier: string;
  readonly funnelIdentifier: string;
  readonly expectedRevision: number;
  readonly targetVersionIdentifier?: string;
}
export type PublicationResponse = Readonly<
  Omit<Publication, 'requestFingerprint' | 'createdAt'> & { createdAt: string }
>;
