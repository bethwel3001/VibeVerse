import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; 
import { disableSentry } from './utils/sentry-blocker';

// COMPLETELY DISABLE SENTRY BEFORE ANYTHING ELSE
if (typeof window !== 'undefined') {
  // Block all Sentry initialization
  window.Sentry = {
    init: () => console.log('Sentry blocked'),
    captureException: () => {},
    captureMessage: () => {},
    configureScope: () => {},
    withScope: () => {},
  };
  
  // Block Sentry loader
  window.__SENTRY__ = {
    hub: undefined,
    logger: undefined,
    extensions: {},
    globalEventProcessors: [],
    integrations: [],
  };
  
  // Remove any existing Sentry iframes/scripts
  document.addEventListener('DOMContentLoaded', () => {
    const sentryElements = document.querySelectorAll('[class*="sentry"], [id*="sentry"], [src*="sentry"]');
    sentryElements.forEach(el => el.remove());
  });
}

disableSentry();

const root = createRoot(document.getElementById('root'));
root.render(<App />);