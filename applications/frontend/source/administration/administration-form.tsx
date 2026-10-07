import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isError } from 'es-toolkit/predicate';
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { Button } from '../components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '../components/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../components/input-group';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { Separator } from '../components/separator';
import { AdministrationContent, AdministrationFormMessages } from './administration-content';
import type { AdministratorCredentials } from './administration-types';

interface AdministrationFormProperties {
  signIn: (credentials: AdministratorCredentials) => Promise<void>;
}

export function AdministrationForm({ signIn }: AdministrationFormProperties): UIElement {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<{
    username?: Optional<string>;
    password?: Optional<string>;
  }>({});
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

    const nextErrors = {
      username: username.trim() ? undefined : AdministrationFormMessages.UsernameRequired,
      password: password ? undefined : AdministrationFormMessages.PasswordRequired,
    };
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="auth-title">{AdministrationContent.SignInTitle}</h1>
        <p className="auth-description">{AdministrationContent.SignInDescription}</p>
      </div>
      <form
        onSubmit={submit}
        noValidate
        aria-label={AdministrationContent.SignIn}
        aria-busy={pending}
      >
        <FieldGroup>
          <Field data-invalid={!!errors.username} data-disabled={pending}>
            <FieldLabel htmlFor="username">{AdministrationContent.UsernameLabel}</FieldLabel>
            <InputGroup className="h-12">
              <InputGroupAddon>
                <UserRound aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                ref={usernameReference}
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={AdministrationContent.UsernamePlaceholder}
                required
                disabled={pending}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setErrors((previous) => ({ ...previous, username: undefined }));
                  setMessage('');
                }}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
            </InputGroup>
            {errors.username && <FieldError id="username-error">{errors.username}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.password} data-disabled={pending}>
            <FieldLabel htmlFor="password">{AdministrationContent.PasswordLabel}</FieldLabel>
            <InputGroup className="h-12">
              <InputGroupAddon>
                <LockKeyhole aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                ref={passwordReference}
                id="password"
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={AdministrationContent.PasswordPlaceholder}
                required
                disabled={pending}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((previous) => ({ ...previous, password: undefined }));
                  setMessage('');
                }}
                onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                onBlur={() => setCapsLock(false)}
                aria-invalid={!!errors.password}
                aria-describedby={
                  [errors.password && 'password-error', capsLock && 'caps-warning']
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  className="size-11"
                  aria-label={
                    visible
                      ? AdministrationContent.HidePassword
                      : AdministrationContent.ShowPassword
                  }
                  aria-pressed={visible}
                  disabled={pending}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {errors.password && <FieldError id="password-error">{errors.password}</FieldError>}
            {capsLock && (
              <p id="caps-warning" className="text-sm text-muted-foreground" role="status">
                {AdministrationContent.CapsLock}
              </p>
            )}
          </Field>
          {message && (
            <Alert variant="destructive">
              <AlertTitle>{AdministrationContent.SignInFailed}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <Field>
            <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
              {pending ? AdministrationContent.SigningIn : AdministrationContent.SignIn}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <div className="flex flex-col gap-5">
        <Separator />
        <p className="access-note">{AdministrationContent.AccessHelp}</p>
      </div>
    </div>
  );
}
