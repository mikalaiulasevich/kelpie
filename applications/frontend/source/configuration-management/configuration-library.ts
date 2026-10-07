import type {
  ConfigurationList,
  ConfigurationVersionMetadata,
} from '../management/management-types';
import { ConfigurationFormat } from './configuration-format';

interface ConfigurationLibrarySelection {
  search: string;
  status: string;
  descending: boolean;
}

export const ConfigurationLibrary = {
  select(
    configurations: ConfigurationList,
    selection: ConfigurationLibrarySelection,
  ): readonly ConfigurationVersionMetadata[] {
    const query = selection.search.trim().toLowerCase();

    return configurations.items
      .filter((version) => {
        const live = version.identifier === configurations.funnel.activeVersionIdentifier;
        const matchesStatus =
          selection.status === 'all' || (selection.status === 'live' ? live : !live);
        const matchesSearch = [
          ConfigurationFormat.version(version.version),
          version.schemaVersion,
          version.checksum,
          version.identifier,
        ].some((value) => value.toLowerCase().includes(query));

        return matchesStatus && matchesSearch;
      })
      .sort((left, right) =>
        selection.descending ? right.version - left.version : left.version - right.version,
      );
  },

  versionLabel(configurations: ConfigurationList, identifier: string): string {
    const version = configurations.items.find((candidate) => candidate.identifier === identifier);

    return version
      ? ConfigurationFormat.version(version.version)
      : ConfigurationFormat.identifier(identifier);
  },
} as const;
