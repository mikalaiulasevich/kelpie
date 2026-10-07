export const AdministrationContent = {
  Brand: 'Kelpie',
  WorkspaceLabel: 'Administration',
  SignInTitle: 'Sign in to Kelpie',
  SignInDescription: 'Use your administrator credentials to continue.',
  UsernameLabel: 'Username',
  UsernamePlaceholder: 'Username',
  PasswordLabel: 'Password',
  PasswordPlaceholder: 'Enter your password',
  ShowPassword: 'Show password',
  HidePassword: 'Hide password',
  CapsLock: 'Caps Lock is on',
  SignIn: 'Sign in',
  SigningIn: 'Signing in…',
  SignInFailed: 'Unable to sign in',
  AccessHelp: 'Contact your administrator if you need access.',
  CheckingTitle: 'Opening your workspace',
  CheckingDescription: 'Checking your administrator session…',
  UnavailableTitle: 'Unable to connect',
  Retry: 'Try again',
  SignOut: 'Sign out',
  SigningOut: 'Signing out…',
  SignOutFailed: 'Unable to sign out',
  PageTitle: 'Administration · Kelpie',
} as const;

export const AdministrationFormMessages = {
  UsernameRequired: 'Enter your administrator username.',
  PasswordRequired: 'Enter your password.',
  RequestFailed: 'Unable to complete the request. Please try again.',
} as const;

export const AdministrationConnectionContent = {
  Status: 'Connection unavailable',
  Title: 'Your workspace is out of reach',
  Description:
    'Kelpie could not check your administrator session. The service may be temporarily unavailable, or the connection may have been interrupted.',
  NextTitle: 'Let’s reconnect',
  NextDescription:
    'Check your internet connection, then try again. You do not need to reset your password for this connection error.',
  Retry: 'Retry connection',
  Help: 'Still unable to connect? Contact your administrator and share the details below.',
  Details: 'Connection details',
} as const;
