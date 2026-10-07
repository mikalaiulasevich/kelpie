import { useAdministrationForm } from './use-administration-form';
import { useLocalization } from '../localization/use-localization';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Button } from '../components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '../components/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../components/input-group';
import { Alert, AlertDescription, AlertTitle } from '../components/alert';
import { AdministrationContent } from './administration-content';
import type { AdministrationSignIn } from './administration-types';

interface AdministrationFormProperties {
  readonly signIn: AdministrationSignIn;
}

export function AdministrationForm({ signIn }: AdministrationFormProperties): UIElement {
  const { t } = useLocalization();

  const {
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
    togglePassword,
  } = useAdministrationForm(signIn);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="auth-title">{t(AdministrationContent.SignInTitle)}</h1>
        <p className="auth-description">{t(AdministrationContent.SignInDescription)}</p>
      </div>
      <form
        onSubmit={submit}
        noValidate
        aria-label={t(AdministrationContent.SignIn)}
        aria-busy={pending}
      >
        <FieldGroup>
          <Field data-invalid={!!errors.username} data-disabled={pending}>
            <FieldLabel htmlFor="username">{t(AdministrationContent.UsernameLabel)}</FieldLabel>
            <InputGroup className="h-12">
              <InputGroupInput
                ref={usernameReference}
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t(AdministrationContent.UsernamePlaceholder)}
                required
                disabled={pending}
                value={username}
                onChange={(event) => updateUsername(event.target.value)}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'username-error' : undefined}
              />
            </InputGroup>
            {errors.username && <FieldError id="username-error">{t(errors.username)}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.password} data-disabled={pending}>
            <FieldLabel htmlFor="password">{t(AdministrationContent.PasswordLabel)}</FieldLabel>
            <InputGroup className="h-12">
              <InputGroupInput
                ref={passwordReference}
                id="password"
                name="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t(AdministrationContent.PasswordPlaceholder)}
                required
                disabled={pending}
                value={password}
                onChange={(event) => updatePassword(event.target.value)}
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
                    passwordVisible
                      ? t(AdministrationContent.HidePassword)
                      : t(AdministrationContent.ShowPassword)
                  }
                  aria-pressed={passwordVisible}
                  disabled={pending}
                  onClick={togglePassword}
                >
                  {passwordVisible ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {errors.password && <FieldError id="password-error">{t(errors.password)}</FieldError>}
            {capsLock && (
              <p id="caps-warning" className="text-sm text-muted-foreground" role="status">
                {t(AdministrationContent.CapsLock)}
              </p>
            )}
          </Field>
          {message && (
            <Alert variant="destructive" className="form-feedback">
              <AlertTitle>{t(AdministrationContent.SignInFailed)}</AlertTitle>
              <AlertDescription>{t(message)}</AlertDescription>
            </Alert>
          )}
          <Field>
            <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
              <span aria-live="polite" aria-atomic="true">
                {pending ? t(AdministrationContent.SigningIn) : t(AdministrationContent.SignIn)}
              </span>
              {pending && <LoaderCircle className="form-pending-icon" aria-hidden="true" />}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
