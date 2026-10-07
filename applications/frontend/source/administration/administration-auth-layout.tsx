import { useEffect, type ReactNode } from 'react';
import { KelpieMark } from '../components/kelpie-mark';
import { AdministrationContent } from './administration-content';

export function AdministrationAuthLayout({ children }: { children: ReactNode }): UIElement {
  useEffect(() => {
    document.title = AdministrationContent.PageTitle;
  }, []);

  return (
    <main className="auth-layout">
      <section className="auth-main" aria-label="Administrator access">
        <a href="/" className="brand auth-brand" aria-label="Kelpie administration">
          <KelpieMark />
          <span>kelpie</span>
        </a>
        <div className="form-container">{children}</div>
        <p className="access-note">{AdministrationContent.AccessHelp}</p>
      </section>
      <footer className="auth-footer">
        <span>Kelpie</span>
        <span aria-hidden="true">·</span>
        <span>{AdministrationContent.WorkspaceLabel}</span>
      </footer>
    </main>
  );
}
