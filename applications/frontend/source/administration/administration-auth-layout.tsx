import { useEffect } from 'react';
import { Command, Layers3, ScanLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { AdministrationContent } from '../administration/administration-content';

function Brand(): UIElement {
  return (
    <a href="/" className="brand" aria-label="Kelpie administration">
      <span className="brand-icon">
        <Command aria-hidden="true" />
      </span>
      <span>
        {AdministrationContent.Brand}
        <span className="brand-dot">.</span>
      </span>
    </a>
  );
}

export function AdministrationAuthLayout({ children }: { children: ReactNode }): UIElement {
  useEffect(() => {
    document.title = AdministrationContent.PageTitle;
  }, []);

  return (
    <main className="auth-layout">
      <section className="auth-main" aria-label="Administrator access">
        <header className="auth-header">
          <Brand />
          <span className="workspace-label">{AdministrationContent.WorkspaceLabel}</span>
        </header>
        <div className="form-container">{children}</div>
        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Kelpie</span>
          <span>{AdministrationContent.CookieNote}</span>
        </footer>
      </section>
      <aside className="brand-panel" aria-label="About your workspace">
        <div className="panel-top">
          <span className="panel-kicker">
            <span className="status-dot" />
            {AdministrationContent.PanelKicker}
          </span>
          <ScanLine aria-hidden="true" />
        </div>
        <div className="orbital-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="orbit-cross cross-horizontal" />
          <div className="orbit-cross cross-vertical" />
          <div className="orbit-core">
            <Command />
          </div>
          <span className="orbit-point point-one" />
          <span className="orbit-point point-two" />
          <span className="orbit-point point-three" />
          <span className="orbit-coordinate coordinate-top">01 / WORKSPACE</span>
          <span className="orbit-coordinate coordinate-bottom">CONNECTED BY DESIGN</span>
          <div className="art-label">
            <Layers3 />
            <span>{AdministrationContent.PanelArtLabel}</span>
          </div>
        </div>
        <div className="panel-copy">
          <p className="panel-eyebrow">{AdministrationContent.PanelEyebrow}</p>
          <h2>
            {AdministrationContent.PanelHeading}
            <br />
            <span>{AdministrationContent.PanelHeadingAccent}</span>
          </h2>
          <p>
            {AdministrationContent.PanelDescription}
            <br />
            {AdministrationContent.PanelDescriptionSecond}
          </p>
        </div>
        <div className="panel-footer">
          <span>{AdministrationContent.PanelFooter}</span>
          <span>{AdministrationContent.PanelStep}</span>
        </div>
      </aside>
    </main>
  );
}
