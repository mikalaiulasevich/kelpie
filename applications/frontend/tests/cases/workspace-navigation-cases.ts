export const WorkspaceNavigationCases = {
  DeepLinks: [
    { hash: '#analytics?funnel=wellness', page: 'analytics', funnelIdentifier: 'wellness' },
    {
      hash: '#versions?funnel=workstyle-planner',
      page: 'versions',
      funnelIdentifier: 'workstyle-planner',
    },
    { hash: '#history?funnel=Program_2026', page: 'history', funnelIdentifier: 'Program_2026' },
    { hash: '#unknown?funnel=wellness', page: 'analytics', funnelIdentifier: 'wellness' },
    {
      hash: '#versions?funnel=%3Cscript%3E',
      page: 'versions',
      funnelIdentifier: 'workstyle-planner',
    },
    { hash: '#history?funnel=123wrong', page: 'history', funnelIdentifier: 'workstyle-planner' },
    { hash: '#analytics?funnel=', page: 'analytics', funnelIdentifier: 'workstyle-planner' },
    {
      hash: '#history?funnel=' + 'a'.repeat(101),
      page: 'history',
      funnelIdentifier: 'workstyle-planner',
    },
    { hash: '', page: 'analytics', funnelIdentifier: 'workstyle-planner' },
  ],
  VersionDeepLinks: [
    {
      hash: '#version?funnel=workstyle-planner&version=22345678-1234-1234-1234-123456789012',
      expected: {
        page: 'version',
        funnelIdentifier: 'workstyle-planner',
        versionIdentifier: '22345678-1234-1234-1234-123456789012',
      },
    },
    {
      hash: '#version?funnel=wellness&version=ABCDEF12-ABCD-ABCD-ABCD-ABCDEF123456',
      expected: {
        page: 'version',
        funnelIdentifier: 'wellness',
        versionIdentifier: 'ABCDEF12-ABCD-ABCD-ABCD-ABCDEF123456',
      },
    },
    {
      hash: '#version?funnel=wellness',
      expected: { page: 'versions', funnelIdentifier: 'wellness' },
    },
    {
      hash: '#version?funnel=wellness&version=',
      expected: { page: 'versions', funnelIdentifier: 'wellness' },
    },
    {
      hash: '#version?funnel=wellness&version=%3Cscript%3E',
      expected: { page: 'versions', funnelIdentifier: 'wellness' },
    },
    {
      hash: '#version?funnel=wellness&version=22345678-1234-1234-1234-123456789012extra',
      expected: { page: 'versions', funnelIdentifier: 'wellness' },
    },
    {
      hash: '#history?funnel=wellness&version=22345678-1234-1234-1234-123456789012',
      expected: { page: 'history', funnelIdentifier: 'wellness' },
    },
  ],
} as const;
