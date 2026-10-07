import { useLocalization } from '../localization/use-localization';
import { LanguageSettings } from '../localization/language-settings';
import { useEffect, type ReactNode } from 'react';
import { KelpieMark } from '../components/kelpie-mark';
import { AdministrationContent } from './administration-content';

export function AdministrationAuthLayout({ children }: { children: ReactNode }): UIElement {
  const { t } = useLocalization();

  useEffect(() => {
    document.title = AdministrationContent.PageTitle;
  }, []);

  return (
    <main className="auth-layout">
      <div className="absolute right-4 top-4"><LanguageSettings /></div>
      <section className="auth-main" aria-label={t("Administrator access")}>
        <a href="/" className="brand auth-brand" aria-label={t("Kelpie administration")}>
          <KelpieMark />
          <span>{t("kelpie")}</span>
        </a>
        <div className="form-container">{children}</div>
        <p className="access-note">{t(AdministrationContent.AccessHelp)}</p>
      </section>
      <footer className="auth-footer">
        <span>{t("Kelpie")}</span>
        <span aria-hidden="true">·</span>
        <span>{t(AdministrationContent.WorkspaceLabel)}</span>
      </footer>
    </main>
  );
}
