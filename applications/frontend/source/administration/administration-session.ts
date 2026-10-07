import type { AdministratorIdentity } from './administration-types';

export const AdministrationSessionStatus = {
  Checking: 'checking',
  SignedOut: 'signed-out',
  SignedIn: 'signed-in',
  Unavailable: 'unavailable',
} as const;

export type AdministrationSession =
  | Readonly<{ status: typeof AdministrationSessionStatus.Checking }>
  | Readonly<{ status: typeof AdministrationSessionStatus.SignedOut }>
  | Readonly<{
      status: typeof AdministrationSessionStatus.SignedIn;
      identity: AdministratorIdentity;
    }>
  | Readonly<{
      status: typeof AdministrationSessionStatus.Unavailable;
      message: string;
    }>;
