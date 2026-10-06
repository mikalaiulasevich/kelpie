import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './application/application';
import './styling/application.css';
import { ApplicationPolicy } from './application/application-policy';
import { ApplicationMessages } from './application/application-messages';

const rootElement = document.getElementById(ApplicationPolicy.RootElementIdentifier);

if (rootElement === null) {
  throw new Error(ApplicationMessages.RootMissing);
}

createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
