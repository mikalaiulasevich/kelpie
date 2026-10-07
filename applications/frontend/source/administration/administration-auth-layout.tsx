import { useEffect, type ReactNode } from 'react';
import {
  JourneyIllustration,
  ExperimentIllustration,
  VersionIllustration,
} from '../flow-visuals/flow-illustrations';
import { KelpieMark } from '../components/kelpie-mark';
import { AdministrationContent } from './administration-content';

export function AdministrationAuthLayout({ children }: { children: ReactNode }): UIElement {
  useEffect(() => {
    document.title = AdministrationContent.PageTitle;
  }, []);

  return (
    <main className="auth-layout">
      <div className="auth-backdrop" aria-hidden="true">
        <img
          className="auth-backdrop-image"
          src="/images/administration-glass.webp"
          alt=""
          width="1086"
          height="1448"
          decoding="async"
        />
      </div>
      <aside className="auth-cover">
        <header className="auth-cover-header">
          <a href="/" className="brand" aria-label="Kelpie administration">
            <KelpieMark />
            <span>kelpie</span>
          </a>
          <span className="screen-eyebrow">{AdministrationContent.Eyebrow}</span>
        </header>
        <div className="auth-cover-caption">
          <span className="screen-eyebrow">Your workspace, in focus</span>
          <h2>{AdministrationContent.PanelTitle}</h2>
          <p>{AdministrationContent.PanelDescription}</p>
        </div>
        <div className="auth-flow-art" aria-label="Workspace capabilities">
          <div className="auth-feature">
            <div className="auth-feature-core">
              <img
                className="auth-feature-texture"
                src="/images/administration-glass.webp"
                alt=""
                width="1086"
                height="1448"
                decoding="async"
              />
              <span className="screen-eyebrow">01 / Understand</span>
              <h3>Follow the whole journey.</h3>
              <p>Session paths, drop-offs and conversion, together.</p>
              <JourneyIllustration />
            </div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-core">
              <span className="screen-eyebrow">02 / Compare</span>
              <h3>A different perspective.</h3>
              <p>Compare A and B within the same experiment.</p>
              <ExperimentIllustration />
            </div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-core">
              <span className="screen-eyebrow">03 / Trace</span>
              <h3>Every version accounted for.</h3>
              <p>Inspect configurations and their activation history.</p>
              <VersionIllustration />
            </div>
          </div>
        </div>
      </aside>
      <div className="auth-content">
        <header className="auth-header">
          <a href="/" className="brand auth-mobile-brand" aria-label="Kelpie administration">
            <KelpieMark />
            kelpie
          </a>
          <span className="workspace-label">{AdministrationContent.WorkspaceLabel}</span>
        </header>
        <section className="auth-main" aria-label="Administrator access">
          <div className="form-shell">
            <div className="form-container">{children}</div>
          </div>
        </section>
        <footer className="auth-footer">
          © {new Date().getFullYear()} Kelpie · Flow analytics
        </footer>
      </div>
    </main>
  );
}
