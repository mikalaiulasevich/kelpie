import { DeferredView } from '../application/deferred-view';
import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import { match } from 'ts-pattern';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/sidebar';
import { Separator } from '../components/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '../components/breadcrumb';
import { Alert, AlertDescription } from '../components/alert';
import type { AdministratorIdentity } from '../administration/administration-types';
import { WorkspaceSidebar } from './workspace-sidebar';
import { WorkspaceContent } from './workspace-content';
import { WorkspaceNavigation, WorkspacePage } from './workspace-navigation';
import { useWorkspaceNavigation } from './use-workspace-navigation';
import {
  PublicationIntents,
  type PublicationIntent,
} from '../configuration-management/publication-intents';
import { FunnelSelector } from './funnel-selector';
import { WorkspacePageContent } from './workspace-page-content';

const ConfigurationImportDialog = lazy(async () => {
  const module = await import('../configuration-management/configuration-import-dialog');

  return { default: module.ConfigurationImportDialog };
});

const PublicationDialog = lazy(async () => {
  const module = await import('../configuration-management/publication-dialog');

  return { default: module.PublicationDialog };
});

interface WorkspaceProperties {
  identity: AdministratorIdentity;
  signOut: () => Promise<void>;
  onUnauthorized: () => void;
}

export function Workspace({ identity, signOut, onUnauthorized }: WorkspaceProperties): UIElement {
  const { page, funnelIdentifier, versionIdentifier } = useWorkspaceNavigation();
  const [revision, setRevision] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [intent, setIntent] = useState<Optional<PublicationIntent>>(() =>
    PublicationIntents.read(identity.identifier),
  );
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const signOutPending = useRef(false);
  const title = match(page)
    .with(WorkspacePage.Analytics, () => WorkspaceContent.Analytics)
    .with(WorkspacePage.Versions, WorkspacePage.Version, () => WorkspaceContent.Versions)
    .with(WorkspacePage.History, () => WorkspaceContent.History)
    .exhaustive();

  useEffect(() => {
    document.title = `${title} · Kelpie`;
  }, [title]);
  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const openImport = useCallback(() => setImportOpen(true), []);
  const onImported = useCallback((identifier: string) => {
    setRevision((value) => value + 1);
    WorkspaceNavigation.navigate(WorkspacePage.Versions, identifier);
  }, []);
  const onChanged = useCallback(
    (identifier: string) => {
      setRevision((value) => value + 1);
      WorkspaceNavigation.navigate(page, identifier);
    },
    [page],
  );
  const logout = async () => {
    if (signOutPending.current) {
      return;
    }

    signOutPending.current = true;
    setSigningOut(true);
    setMessage('');

    try {
      await signOut();
    } catch (error) {
      if (mounted.current) {
        setMessage(isError(error) ? error.message : WorkspaceContent.RequestFailure);
      }
    } finally {
      signOutPending.current = false;

      if (mounted.current) {
        setSigningOut(false);
      }
    }
  };

  return (
    <SidebarProvider>
      <WorkspaceSidebar
        page={page}
        funnelIdentifier={funnelIdentifier}
        identity={identity}
        pending={signingOut}
        signOut={() => {
          void logout();
        }}
      />
      <SidebarInset className="min-w-0">
        <header className="workspace-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <FunnelSelector key={funnelIdentifier} funnelIdentifier={funnelIdentifier} page={page} />
        </header>
        <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          {message && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <WorkspacePageContent
            page={page}
            funnelIdentifier={funnelIdentifier}
            versionIdentifier={versionIdentifier}
            revision={revision}
            onUnauthorized={onUnauthorized}
            onImport={openImport}
            onIntent={setIntent}
          />
        </main>
      </SidebarInset>
      <DeferredView loading={null}>
        {importOpen && (
          <ConfigurationImportDialog
            onClose={() => setImportOpen(false)}
            onImported={onImported}
            onUnauthorized={onUnauthorized}
          />
        )}
        {intent && (
          <PublicationDialog
            key={intent.command.operationIdentifier}
            ownerIdentifier={identity.identifier}
            intent={intent}
            onClose={() => setIntent(undefined)}
            onChanged={onChanged}
            onUnauthorized={onUnauthorized}
          />
        )}
      </DeferredView>
    </SidebarProvider>
  );
}
