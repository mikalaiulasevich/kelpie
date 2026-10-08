import { useEffect, useRef, useState, type FormEvent } from 'react';
import { omit } from 'es-toolkit/object';
import { isError } from 'es-toolkit/predicate';
import { AdministrationFormMessages } from './administration-content';
import { AdministrationFormValidation } from './administration-form-validation';
import type { AdministrationFormErrors, AdministrationSignIn } from './administration-types';

export function useAdministrationForm(signIn: AdministrationSignIn) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<AdministrationFormErrors>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const requestPending = useRef(false);
  const usernameReference = useRef<HTMLInputElement>(null);
  const passwordReference = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (requestPending.current) {
      return;
    }

    const nextErrors = AdministrationFormValidation.errors({ username, password });
    setErrors(nextErrors);
    setMessage('');

    if (nextErrors.username || nextErrors.password) {
      if (nextErrors.username) {
        usernameReference.current?.focus();
      } else {
        passwordReference.current?.focus();
      }

      return;
    }

    requestPending.current = true;
    setPending(true);

    try {
      await signIn({ username: username.trim(), password });
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

  const updateUsername = (value: string): void => {
    setUsername(value);
    setErrors((previous) => omit(previous, ['username']));
    setMessage('');
  };

  const updatePassword = (value: string): void => {
    setPassword(value);
    setErrors((previous) => omit(previous, ['password']));
    setMessage('');
  };

  return {
    username,
    password,
    passwordVisible,
    capsLock,
    errors,
    message,
    pending,
    usernameReference,
    passwordReference,
    submit,
    updateUsername,
    updatePassword,
    setCapsLock,
    togglePassword: () => setPasswordVisible((previous) => !previous),
  };
}
