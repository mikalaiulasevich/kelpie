import type { ConfigurationList } from '../../source/management/management-types';

export const ConfigurationLibraryFixture = {
  collection(): ConfigurationList {
    return {
      funnel: { identifier: 'library', activeVersionIdentifier: 'version-two', revision: 3 },
      items: [
        {
          identifier: 'version-two',
          funnelIdentifier: 'library',
          version: 2,
          schemaVersion: '1.0',
          checksum: 'AABB22',
        },
        {
          identifier: 'version-ten',
          funnelIdentifier: 'library',
          version: 10,
          schemaVersion: '1.1',
          checksum: 'CCDD10',
        },
        {
          identifier: 'version-one',
          funnelIdentifier: 'library',
          version: 1,
          schemaVersion: '1.0',
          checksum: 'EEFF11',
        },
      ],
      nextOffset: 25,
    };
  },
} as const;
