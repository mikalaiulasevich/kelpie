import { useEffect, type ReactNode } from 'react';
import { Command } from 'lucide-react';
import { AdministrationContent } from './administration-content';

export function AdministrationAuthLayout({ children }: { children: ReactNode }): UIElement {
  useEffect(() => {
    document.title = AdministrationContent.PageTitle;
  }, []);

  return (
    <main className="auth-layout">
      <header className="auth-header">
        <a href="/" className="brand" aria-label="Kelpie administration">
          <span className="brand-icon">
            <Command aria-hidden="true" />
          </span>
          <span>{AdministrationContent.Brand}</span>
        </a>
        <span className="workspace-label">{AdministrationContent.WorkspaceLabel}</span>
      </header>
      <section className="auth-main" aria-label="Administrator access">
        <div className="form-container">{children}</div>
      </section>
      <footer className="auth-footer">© {new Date().getFullYear()} Kelpie</footer>
    </main>
  );
}
