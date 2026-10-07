export const ManagementPolicy = {
  DefaultPageSize: 25,
  MaximumPageSize: 100,
  MaximumOffset: 10_000,
  MaximumIdentifierLength: 100,
  IdentifierPattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
  PageSizePattern: '^[1-9][0-9]{0,2}$',
  OffsetPattern: '^(0|[1-9][0-9]{0,4})$',
  FunnelSelection: { identifier: true, activeVersionIdentifier: true, revision: true },
} as const;
