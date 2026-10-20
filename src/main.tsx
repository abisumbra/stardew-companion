import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ArtworkProvider } from './components/Artwork';
import { ErrorBoundary } from './components/ErrorBoundary';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ArtworkProvider>
        <App />
      </ArtworkProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
