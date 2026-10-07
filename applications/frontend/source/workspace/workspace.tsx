import { DeferredView } from '../application/deferred-view';
import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import { match } from 'ts-pattern';
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
  const [importSequence, setImportSequence] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [intent, setIntent] = useState<Optional<PublicationIntent>>(() =>
    PublicationIntents.read(identity.identifier),
  );
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const signOutPending = useRef(false);
  const dialogReturnTarget = useRef<Optional<HTMLElement>>(undefined);
  const pageContainer = useRef<HTMLElement>(null);
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

  const captureDialogTarget = useCallback(() => {
    dialogReturnTarget.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  }, []);
  const restoreDialogFocus = useCallback(() => {
    const target = dialogReturnTarget.current;

    if (target?.isConnected) {
      target.focus({ preventScroll: true });
    } else {
      pageContainer.current?.focus({ preventScroll: true });
    }
  }, []);
  const openImport = useCallback(() => {
    captureDialogTarget();
    setImportOpen(true);
  }, [captureDialogTarget]);
  const openIntent = useCallback(
    (nextIntent: PublicationIntent, returnFocusTarget?: HTMLElement) => {
      captureDialogTarget();
      if (returnFocusTarget) {
        dialogReturnTarget.current = returnFocusTarget;
      }

      setIntent(nextIntent);
    },
    [captureDialogTarget],
  );
  const onImported = useCallback((identifier: string) => {
    setRevision((value) => value + 1);
    // Imports appear at the start of the library, outside a previously selected page or filter.
    setImportSequence((value) => value + 1);
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
    <div className="workspace-shell">
      <WorkspaceSidebar
        page={page}
        funnelIdentifier={funnelIdentifier}
        identity={identity}
        pending={signingOut}
        signOut={() => {
          void logout();
        }}
      />
      <div className="workspace-page">
        <header className="workspace-header flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {page === WorkspacePage.Analytics ? (
              <h1 className="page-title">{title}</h1>
            ) : (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
          <FunnelSelector key={funnelIdentifier} funnelIdentifier={funnelIdentifier} page={page} />
        </header>
        <main ref={pageContainer} tabIndex={-1} className="workspace-content-area min-w-0 flex-1">
          {message && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <div
            className="workspace-route"
            key={`${page}:${funnelIdentifier}:${versionIdentifier ?? ''}:${importSequence}`}
          >
            <WorkspacePageContent
              page={page}
              funnelIdentifier={funnelIdentifier}
              versionIdentifier={versionIdentifier}
              revision={revision}
              onUnauthorized={onUnauthorized}
              onImport={openImport}
              onIntent={openIntent}
            />
          </div>
        </main>
      </div>
      <DeferredView loading={null}>
        {importOpen && (
          <ConfigurationImportDialog
            onClose={() => setImportOpen(false)}
            onReturnFocus={restoreDialogFocus}
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
            onReturnFocus={restoreDialogFocus}
            onChanged={onChanged}
            onUnauthorized={onUnauthorized}
          />
        )}
      </DeferredView>
    </div>
  );
}
