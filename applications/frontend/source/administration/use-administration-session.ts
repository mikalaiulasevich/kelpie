import { useCallback, useEffect, useRef, useState } from 'react';
import { isError, isNull } from 'es-toolkit/predicate';
import { AdministrationClient } from './administration-client';
import { AdministrationFormMessages } from './administration-content';
import { AdministrationSessionStatus, type AdministrationSession } from './administration-session';
import type { AdministratorCredentials } from './administration-types';

export function useAdministrationSession() {
  const [session, setSession] = useState<AdministrationSession>({
    status: AdministrationSessionStatus.Checking,
  });
  const activeRequest = useRef<Optional<AbortController>>(undefined);

  const checkSession = useCallback(async () => {
    activeRequest.current?.abort();
    const cancellation = new AbortController();
    activeRequest.current = cancellation;
    setSession({ status: AdministrationSessionStatus.Checking });

    try {
      const identity = await AdministrationClient.session(cancellation.signal);

      if (!cancellation.signal.aborted) {
        setSession(
          isNull(identity)
            ? { status: AdministrationSessionStatus.SignedOut }
            : { status: AdministrationSessionStatus.SignedIn, identity },
        );
      }
    } catch (error) {
      if (!cancellation.signal.aborted) {
        setSession({
          status: AdministrationSessionStatus.Unavailable,
          message: isError(error) ? error.message : AdministrationFormMessages.RequestFailed,
        });
      }
    }
  }, []);

  useEffect(() => {
    // A deferred start avoids updates during the effect and is cancelled on teardown.
    let disposed = false;
    void Promise.resolve().then(() => {
      if (!disposed) {
        void checkSession();
      }
    });

    return () => {
      disposed = true;
      activeRequest.current?.abort();
    };
  }, [checkSession]);

  const signIn = useCallback(async (credentials: AdministratorCredentials): Promise<void> => {
    activeRequest.current?.abort();
    const cancellation = new AbortController();
    activeRequest.current = cancellation;
    const identity = await AdministrationClient.signIn(credentials, cancellation.signal);

    if (!cancellation.signal.aborted) {
      setSession({ status: AdministrationSessionStatus.SignedIn, identity });
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    activeRequest.current?.abort();
    const cancellation = new AbortController();
    activeRequest.current = cancellation;
    await AdministrationClient.signOut(cancellation.signal);

    if (!cancellation.signal.aborted) {
      setSession({ status: AdministrationSessionStatus.SignedOut });
    }
  }, []);

  return { session, checkSession, signIn, signOut };
}
