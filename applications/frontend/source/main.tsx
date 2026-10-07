import { Localization } from './localization/localization';
import { isNull } from 'es-toolkit/predicate';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './application/application';
import './styling/application.css';
import './styling/configuration-inspection.css';
import './styling/interactions.css';
import './styling/workspace-sidebar.css';
import { ApplicationPolicy } from './application/application-policy';
import { ApplicationMessages } from './application/application-messages';

const rootElement = document.getElementById(ApplicationPolicy.RootElementIdentifier);

if (isNull(rootElement)) {
  throw new Error(ApplicationMessages.RootMissing);
}

Localization.initialize();

createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
