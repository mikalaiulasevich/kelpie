import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './application';
import './styling/application.css';
import { ApplicationPolicy, ApplicationMessages } from './application-policy';

const rootElement = document.getElementById(ApplicationPolicy.rootElementIdentifier);

if (rootElement === null) {
  throw new Error(ApplicationMessages.RootMissing);
}

createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
