export const TrafficOracleMessages = {
  coverage(group: string, requirement: string): string {
    return `Synthetic traffic coverage missing ${requirement} in ${group}.`;
  },

  InvalidManifest: 'Synthetic traffic manifest does not satisfy its contract.',
  DuplicateSession: 'Synthetic traffic manifest contains duplicate session identifiers.',
  MissingGroup: 'Analytics omitted a version and variant present in the traffic manifest.',
  UnexpectedPagination: 'The traffic oracle requires every version on a single analytics page.',
};
