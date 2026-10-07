import { match } from 'ts-pattern';
import { useWorkspaceNavigation } from '../../source/workspace/use-workspace-navigation';
import { ConfigurationVersionsPage } from '../../source/configuration-management/configuration-versions-page';
import { PublicationHistoryPage } from '../../source/configuration-management/publication-history-page';
import { AnalyticsPageFixture } from './analytics-page-fixtures';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnalyticsPage } from '../../source/analytics/analytics-page';
import { WorkspaceSidebar } from '../../source/workspace/workspace-sidebar';
import { WorkspacePage } from '../../source/workspace/workspace-navigation';
import { MarketingPreviewData } from './marketing-preview-data';
import '../../source/styling/application.css';
import '../../source/styling/interactions.css';
import '../../source/styling/workspace-sidebar.css';

const funnelIdentifier = 'demo-workstyle-studio';
let analyticsRequests = 0;

// This isolated fixture intercepts its own requests; it never calls the live API.
globalThis.fetch = async (input) => {
  const address = input instanceof Request ? input.url : String(input);
  const url = new URL(address, location.origin);
  const version = new URLSearchParams(location.search).has('zero')
    ? AnalyticsPageFixture.emptyVersion()
    : MarketingPreviewData.version();

  if (url.pathname === '/api/administration/analytics') {
    analyticsRequests += 1;

    return Response.json({
      generatedAt: '2026-10-07T18:00:00Z',
      filters: {
        funnelIdentifier,
        includeForced: false,
        trafficOrigin: 'synthetic',
        limit: 1,
        offset: 0,
      },
      pagination: { limit: 1, offset: 0, hasMore: false },
      versions: new URLSearchParams(location.search).has('empty') ? [] : [version],
    });
  }

  if (url.pathname === '/api/administration/configurations') {
    return Response.json({
      funnel: {
        identifier: funnelIdentifier,
        activeVersionIdentifier: version.versionIdentifier,
        revision: 3,
      },
      items: [
        {
          identifier: version.versionIdentifier,
          funnelIdentifier,
          version: 3,
          schemaVersion: '1',
          checksum: 'synthetic',
        },
      ],
      nextOffset: null,
    });
  }

  if (url.pathname === '/api/administration/publications') {
    return Response.json({
      funnel: {
        identifier: funnelIdentifier,
        activeVersionIdentifier: version.versionIdentifier,
        revision: 3,
      },
      items: [],
      nextOffset: null,
    });
  }

  return Response.json(
    { message: 'No live requests are permitted in this fixture.' },
    { status: 404 },
  );
};

export function MarketingPreview(): UIElement {
  const [requests, setRequests] = useState(0);
  const [notice, setNotice] = useState('');
  const navigation = useWorkspaceNavigation();

  return (
    <div className="workspace-shell">
      <WorkspaceSidebar
        page={navigation.page}
        funnelIdentifier={funnelIdentifier}
        identity={{ identifier: 'fixture', username: 'Marketing preview' }}
        pending={false}
        signOut={() => undefined}
      />
      <main className="workspace-page">
        <header className="flex flex-wrap items-center gap-3 py-4 text-xs text-muted-foreground">
          <span>Synthetic fixture · no live data or API calls</span>
          <button onClick={() => setRequests(analyticsRequests)}>Check request count</button>
          <output>Analytics requests: {requests}</output>
        </header>
        <p role="status">{notice}</p>
        {match(navigation.page)
          .with(WorkspacePage.Versions, () => (
            <ConfigurationVersionsPage
              funnelIdentifier={funnelIdentifier}
              revision={3}
              onUnauthorized={() => undefined}
              onImport={() => setNotice('Import action received.')}
              onIntent={() => setNotice('Mutation blocked by fixture.')}
            />
          ))
          .with(WorkspacePage.History, () => (
            <PublicationHistoryPage
              funnelIdentifier={funnelIdentifier}
              revision={3}
              onUnauthorized={() => undefined}
              onIntent={() => setNotice('Mutation blocked by fixture.')}
            />
          ))
          .otherwise(() => (
            <AnalyticsPage funnelIdentifier={funnelIdentifier} onUnauthorized={() => undefined} />
          ))}
      </main>
    </div>
  );
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<MarketingPreview />);
}
