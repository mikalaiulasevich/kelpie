import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkspaceSidebar } from '../../source/workspace/workspace-sidebar';
import { useWorkspaceNavigation } from '../../source/workspace/use-workspace-navigation';
import { WorkspaceShortcutCatalog } from '../../source/workspace/workspace-shortcuts';
import { FunnelSelector } from '../../source/workspace/funnel-selector';
import { AnalyticsVersionPanel } from '../../source/analytics/analytics-version-panel';
import { AnalyticsPageFixture } from './analytics-page-fixtures';
import '../../source/styling/application.css';
import '../../source/styling/interactions.css';
import '../../source/styling/workspace-sidebar.css';

export function SidebarPreview(): UIElement {
  const location = useWorkspaceNavigation();
  const [scrollMeasurement, setScrollMeasurement] = useState(
    'Switch a detail tab to measure scroll.',
  );
  const measurementFrame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(measurementFrame.current), []);

  const scheduleScrollMeasurement = (before: number) => {
    cancelAnimationFrame(measurementFrame.current);
    measurementFrame.current = requestAnimationFrame(() => {
      measurementFrame.current = requestAnimationFrame(() => {
        setScrollMeasurement(
          `Scroll before: ${before.toFixed(1)}; after: ${window.scrollY.toFixed(1)}`,
        );
      });
    });
  };

  const measureTabScroll = (event: React.SyntheticEvent) => {
    if (event.target instanceof Element && event.target.closest('[role="tab"]')) {
      scheduleScrollMeasurement(window.scrollY);
    }
  };

  const checkTabScroll = (value: string) => {
    const tab = document.querySelector<HTMLButtonElement>(`[role="tab"][id$="trigger-${value}"]`);

    if (!tab) {
      return;
    }

    tab.scrollIntoView({ block: 'start' });
    const before = window.scrollY;

    tab.focus({ preventScroll: true });
    scheduleScrollMeasurement(before);
  };

  const [signedOut, setSignedOut] = useState(false);
  const title =
    WorkspaceShortcutCatalog.Navigation.find((item) => item.page === location.page)?.label ??
    'Configuration detail';

  return (
    <div className="workspace-shell">
      <WorkspaceSidebar
        page={location.page}
        funnelIdentifier={location.funnelIdentifier}
        identity={{ identifier: 'visual-fixture', username: 'Alex Morgan' }}
        pending={false}
        signOut={() => setSignedOut(true)}
      />
      <main className="workspace-page">
        <header className="workspace-header flex flex-wrap items-center justify-between gap-4">
          <span>Interaction fixture · no live data</span>
          <button onClick={() => checkTabScroll('paths')}>Check Paths scroll</button>
          <button onClick={() => checkTabScroll('B')}>Check Variant B scroll</button>
          <FunnelSelector
            key={location.funnelIdentifier}
            page={location.page}
            funnelIdentifier={location.funnelIdentifier}
          />
        </header>
        <div className="screen-heading">
          <span className="screen-eyebrow">Workspace preview</span>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">
            Navigation, keyboard and responsive layout verification. The sample below has no
            recorded sessions.
          </p>
        </div>
        <p role="status">{signedOut ? 'Sign-out callback received by fixture.' : ''}</p>
        <div onMouseDownCapture={measureTabScroll} onKeyDownCapture={measureTabScroll}>
          <AnalyticsVersionPanel version={AnalyticsPageFixture.tabComparisonVersion()} />
        </div>
        <output className="fixed right-4 bottom-4 z-50 rounded border bg-background p-2 text-xs">
          {scrollMeasurement}
        </output>
      </main>
    </div>
  );
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<SidebarPreview />);
}
