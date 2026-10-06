import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './application';
import './styling/application.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('The application root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
