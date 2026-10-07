import { useEffect, useRef, useState } from 'react';
import { isError } from 'es-toolkit/predicate';
import { Check, LoaderCircle, LogOut, RefreshCw } from 'lucide-react';
import { match } from 'ts-pattern';
import { Button } from '../components/button';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { AdministrationForm } from './administration-form';
import { useAdministrationSession } from './use-administration-session';
import { AdministrationContent, AdministrationFormMessages } from './administration-content';
import type { AdministratorIdentity } from './administration-types';
import { AdministrationSessionStatus } from './administration-session';

interface AdministrationSignedInProperties {
  identity: AdministratorIdentity;
  signOut: () => Promise<void>;
}

function AdministrationSignedIn({
  identity,
  signOut,
}: AdministrationSignedInProperties): UIElement {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  const requestPending = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async () => {
    if (requestPending.current) {
      return;
    }

    requestPending.current = true;
    setPending(true);
    setMessage('');

    try {
      await signOut();
    } catch (error) {
      if (mounted.current) {
        setMessage(isError(error) ? error.message : AdministrationFormMessages.RequestFailed);
      }
    } finally {
      requestPending.current = false;

      if (mounted.current) {
        setPending(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="form-emblem" aria-hidden="true">
        <Check />
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="auth-title">{AdministrationContent.SignedInTitle}</h1>
        <p className="auth-description">{AdministrationContent.SignedInDescription}</p>
      </div>
      <Alert>
        <Check />
        <AlertTitle>{AdministrationContent.SignedInNotice}</AlertTitle>
        <AlertDescription>{identity.username}</AlertDescription>
      </Alert>
      {message && (
        <Alert variant="destructive">
          <AlertTitle>{AdministrationContent.SignOutFailed}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <Button variant="outline" className="h-12" onClick={submit} disabled={pending}>
        <LogOut data-icon="inline-start" />
        {pending ? AdministrationContent.SigningOut : AdministrationContent.SignOut}
      </Button>
    </div>
  );
}

export function AdministrationAccess(): UIElement {
  const { session, checkSession, signIn, signOut } = useAdministrationSession();

  return match(session)
    .with({ status: AdministrationSessionStatus.Checking }, () => (
      <div className="flex flex-col gap-4" role="status">
        <div className="form-emblem">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        </div>
        <h1 className="auth-title">{AdministrationContent.CheckingTitle}</h1>
        <p className="auth-description">{AdministrationContent.CheckingDescription}</p>
      </div>
    ))
    .with({ status: AdministrationSessionStatus.SignedOut }, () => (
      <AdministrationForm signIn={signIn} />
    ))
    .with({ status: AdministrationSessionStatus.SignedIn }, ({ identity }) => (
      <AdministrationSignedIn identity={identity} signOut={signOut} />
    ))
    .with({ status: AdministrationSessionStatus.Unavailable }, ({ message }) => (
      <div className="flex flex-col gap-6">
        <h1 className="auth-title">{AdministrationContent.UnavailableTitle}</h1>
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="h-12"
          onClick={() => {
            void checkSession();
          }}
        >
          <RefreshCw data-icon="inline-start" />
          {AdministrationContent.Retry}
        </Button>
      </div>
    ))
    .exhaustive();
}
