import { useLocalization } from '../localization/use-localization';
import { LanguageSettings } from '../localization/language-settings';
import { Kbd } from '../components/kbd';
import { useState } from 'react';
import { ChartNoAxesCombined, History, Layers3, LogOut, PanelLeft } from 'lucide-react';
import { Button } from '../components/button';
import { KelpieMark } from '../components/kelpie-mark';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../components/sheet';
import { WorkspaceNavigation, WorkspacePage } from './workspace-navigation';
import { WorkspaceContent } from './workspace-content';
import { WorkspaceShortcutCatalog } from './workspace-shortcuts';
import { WorkspaceShortcutHelp } from './workspace-shortcut-help';
import type { AdministratorIdentity } from '../administration/administration-types';

interface WorkspaceSidebarProperties {
  page: WorkspacePage;
  funnelIdentifier: string;
  identity: AdministratorIdentity;
  signOut: () => void;
  pending: boolean;
}

const navigationPresentation = {
  [WorkspacePage.Analytics]: { icon: ChartNoAxesCombined, description: 'Journeys & conversion' },
  [WorkspacePage.Versions]: { icon: Layers3, description: 'Versions & experiments' },
  [WorkspacePage.History]: { icon: History, description: 'Publications & rollbacks' },
} as const;

function SidebarBrand({
  funnelIdentifier,
  onNavigate,
}: {
  funnelIdentifier: string;
  onNavigate?: () => void;
}): UIElement {
  const { t } = useLocalization();

  return (
    <a
      className="workspace-sidebar-brand brand"
      href={WorkspaceNavigation.href(WorkspacePage.Analytics, funnelIdentifier)}
      onClick={onNavigate}
      aria-label={t("Kelpie analytics")}
    >
      <KelpieMark />
      <span>{t("kelpie")}<span className="workspace-sidebar-product">{t("Flow analytics")}</span>
      </span>
    </a>
  );
}

function SidebarLinks({
  page,
  funnelIdentifier,
  onNavigate,
}: Pick<WorkspaceSidebarProperties, 'page' | 'funnelIdentifier'> & {
  onNavigate?: () => void;
}): UIElement {
  const { t } = useLocalization();

  const activePage = page === WorkspacePage.Version ? WorkspacePage.Versions : page;

  return (
    <>
      <div className="workspace-sidebar-context">
        <span className="workspace-sidebar-section-label">{t("Current funnel")}</span>
        <div>
          <Layers3 aria-hidden="true" />
          <span>{funnelIdentifier}</span>
        </div>
      </div>
      <nav className="workspace-sidebar-links" aria-label={t("Workspace navigation")}>
        <span className="workspace-sidebar-section-label">{t("Workspace")}</span>
        {WorkspaceShortcutCatalog.Navigation.map((item) => {
          const presentation = navigationPresentation[item.page];
          const Icon = presentation.icon;

          return (
            <a
              key={item.page}
              href={WorkspaceNavigation.href(item.page, funnelIdentifier)}
              aria-current={activePage === item.page ? "page" : undefined}
              aria-keyshortcuts={`Alt+${item.key}`}
              onClick={onNavigate}
            >
              <span className="workspace-sidebar-icon">
                <Icon strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="workspace-sidebar-label">
                <strong>{item.label}</strong>
                <small className="sr-only">{presentation.description}</small>
              </span>
              <Kbd aria-hidden="true" title={`Alt + ${item.key}`}>
                ⌥{item.key}
              </Kbd>
            </a>
          );
        })}
      </nav>
    </>
  );
}

function SidebarAccount({
  identity,
  pending,
  signOut,
}: Pick<WorkspaceSidebarProperties, 'identity' | 'pending' | 'signOut'>): UIElement {
  const { t } = useLocalization();

  return (
    <div className="workspace-sidebar-account">
      <div className="workspace-sidebar-person">
        <span className="workspace-sidebar-avatar" aria-hidden="true">
          {identity.username.slice(0, 2).toUpperCase()}
        </span>
        <span>
          <strong title={identity.username}>{identity.username}</strong>
          <small>{t(WorkspaceContent.Administrator)}</small>
        </span>
      </div>
      <Button
        className="workspace-sidebar-signout"
        variant="ghost"
        disabled={pending}
        onClick={signOut}
      >
        <LogOut aria-hidden="true" />
        {pending ? t(WorkspaceContent.SigningOut) : t(WorkspaceContent.SignOut)}
      </Button>
    </div>
  );
}

export function WorkspaceSidebar({
  page,
  funnelIdentifier,
  identity,
  signOut,
  pending,
}: WorkspaceSidebarProperties): UIElement {
  const { t } = useLocalization();

  const [open, setOpen] = useState(false);

  return (
    <aside className="workspace-sidebar-frame" aria-label={t("Kelpie workspace")}>
      <div className="workspace-sidebar-panel">
        <SidebarBrand funnelIdentifier={funnelIdentifier} />
        <div className="workspace-sidebar-desktop-content">
          <SidebarLinks page={page} funnelIdentifier={funnelIdentifier} />
        </div>
        <footer className="workspace-sidebar-footer">
          <LanguageSettings />
          <WorkspaceShortcutHelp funnelIdentifier={funnelIdentifier} />
          <div className="workspace-sidebar-desktop-account">
            <SidebarAccount identity={identity} pending={pending} signOut={signOut} />
          </div>
        </footer>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              className="workspace-sidebar-mobile-trigger"
              variant="ghost"
              size="icon"
              aria-label={t("Open navigation")}
            >
              <PanelLeft aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="workspace-sidebar-sheet">
            <SheetTitle className="sr-only">{t("Workspace navigation")}</SheetTitle>
            <SheetDescription className="sr-only">{t("Choose a section for your current funnel.")}</SheetDescription>
            <div className="workspace-sidebar-panel">
              <SidebarBrand funnelIdentifier={funnelIdentifier} onNavigate={() => setOpen(false)} />
              <SidebarLinks
                page={page}
                funnelIdentifier={funnelIdentifier}
                onNavigate={() => setOpen(false)}
              />
              <div className="workspace-sidebar-sheet-account">
                <SidebarAccount
                  identity={identity}
                  pending={pending}
                  signOut={() => {
                    setOpen(false);
                    signOut();
                  }}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </aside>
  );
}
