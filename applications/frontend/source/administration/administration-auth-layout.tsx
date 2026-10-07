import { useEffect, type ReactNode } from 'react';
import { Command } from 'lucide-react';
import { AdministrationContent } from './administration-content';

export function AdministrationAuthLayout({ children }: { children: ReactNode }): UIElement {
  useEffect(() => {
    document.title = AdministrationContent.PageTitle;
  }, []);

  return (
    <main className="auth-layout">
      <aside className="auth-cover">
        <img className="auth-cover-image" src="/images/administration-glass.webp" alt="" />
        <header className="auth-cover-header">
          <a href="/" className="brand" aria-label="Kelpie administration">
            <span className="brand-icon">
              <Command aria-hidden="true" />
            </span>
            <span>{AdministrationContent.Brand}</span>
          </a>
        </header>
        <div className="auth-cover-caption">
          <h2>{AdministrationContent.PanelTitle}</h2>
          <p>{AdministrationContent.PanelDescription}</p>
        </div>
      </aside>
      <div className="auth-content">
        <header className="auth-header">
          <a href="/" className="brand auth-mobile-brand" aria-label="Kelpie administration">
            <Command aria-hidden="true" />
            {AdministrationContent.Brand}
          </a>
          <span className="workspace-label">{AdministrationContent.WorkspaceLabel}</span>
        </header>
        <section className="auth-main" aria-label="Administrator access">
          <div className="form-container">{children}</div>
        </section>
        <footer className="auth-footer">© {new Date().getFullYear()} Kelpie</footer>
      </div>
    </main>
  );
}
