import { useLocalization } from '../localization/use-localization';
import { DeferredView } from '../application/deferred-view';
import { LoaderCircle } from 'lucide-react';
import { match } from 'ts-pattern';
import { AdministrationConnectionState } from './administration-connection-state';
import { AdministrationForm } from './administration-form';
import { useAdministrationSession } from './use-administration-session';
import { AdministrationContent } from './administration-content';
import { lazy } from 'react';
import { SkeletonSummary, SkeletonRows } from '../components/skeleton';
import { AdministrationAuthLayout } from './administration-auth-layout';
import { AdministrationSessionStatus } from './administration-session';

const Workspace = lazy(async () => {
  const module = await import('../workspace/workspace');

  return { default: module.Workspace };
});

export function AdministrationAccess(): UIElement {
  const { t } = useLocalization();

  const { session, checkSession, signIn, signOut, invalidateSession } = useAdministrationSession();

  const content = match(session)
    .with({ status: AdministrationSessionStatus.Checking }, () => (
      <div className="flex flex-col gap-4" role="status">
        <div className="form-emblem">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        </div>
        <h1 className="auth-title">{t(AdministrationContent.CheckingTitle)}</h1>
        <p className="auth-description">{t(AdministrationContent.CheckingDescription)}</p>
      </div>
    ))
    .with({ status: AdministrationSessionStatus.SignedOut }, () => (
      <AdministrationForm signIn={signIn} />
    ))
    .with({ status: AdministrationSessionStatus.SignedIn }, ({ identity }) => (
      <DeferredView
        loading={
          <div
            role="status"
            aria-label={t('Opening workspace')}
            className="flex min-h-svh flex-col gap-6 p-8"
          >
            <SkeletonSummary />
            <SkeletonRows />
          </div>
        }
      >
        <Workspace
          key={identity.identifier}
          identity={identity}
          signOut={signOut}
          onUnauthorized={invalidateSession}
        />
      </DeferredView>
    ))
    .with({ status: AdministrationSessionStatus.Unavailable }, ({ message }) => (
      <AdministrationConnectionState
        message={message}
        onRetry={() => {
          void checkSession();
        }}
      />
    ))
    .exhaustive();

  return session.status === AdministrationSessionStatus.SignedIn ? (
    content
  ) : (
    <AdministrationAuthLayout
      connectionUnavailable={session.status === AdministrationSessionStatus.Unavailable}
    >
      {content}
    </AdministrationAuthLayout>
  );
}
