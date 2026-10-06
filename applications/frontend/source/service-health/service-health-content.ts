export const ServiceHealthContent = {
  Heading: 'Service connection',
  CheckAction: 'Check connection',
  CheckingLabel: 'Checking backend connection',
  ReadyLabel: 'Backend connection verified',
  UnavailableLabel: 'Backend unavailable',
  CheckingDescription: 'Waiting for a readiness response.',
  UnavailableDescription: 'The readiness check did not succeed. Start the backend and try again.',
  VerifiedAt: 'Verified at ',
  ReadyDescription: '. This check confirms backend readiness only.',
} as const;
