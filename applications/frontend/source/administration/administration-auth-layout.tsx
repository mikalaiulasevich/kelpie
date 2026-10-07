import { useLocalization } from '../localization/use-localization';
import { LanguageSettings } from '../localization/language-settings';
import { useEffect, type ReactNode } from 'react';
import { KelpieMark } from '../components/kelpie-mark';
import { AdministrationContent } from './administration-content';

export function AdministrationAuthLayout({
  children,
  connectionUnavailable = false,
}: {
  children: ReactNode;
  connectionUnavailable?: boolean;
}): UIElement {
  const { t, locale } = useLocalization();

  useEffect(() => {
    document.title = t(AdministrationContent.PageTitle);
  }, [t, locale]);

  return (
    <main className="auth-layout">
      <div className="absolute right-4 top-4">
        <LanguageSettings />
      </div>
      <section
        className={connectionUnavailable ? 'auth-main auth-main-connection' : 'auth-main'}
        aria-label={t('Administrator access')}
      >
        <a href="/" className="brand auth-brand" aria-label={t('Kelpie administration')}>
          <KelpieMark />
          <span>{t('Kelpie')}</span>
        </a>
        <div className="form-container">{children}</div>
        {!connectionUnavailable && (
          <p className="access-note">{t(AdministrationContent.AccessHelp)}</p>
        )}
      </section>
      <footer className="auth-footer">
        <span>{t('Kelpie')}</span>
        <span aria-hidden="true">·</span>
        <span>{t(AdministrationContent.WorkspaceLabel)}</span>
      </footer>
    </main>
  );
}
