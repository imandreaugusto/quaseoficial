import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import {LegalPage} from './components/LegalPage.tsx';
import './index.css';

const legal = new URLSearchParams(window.location.search).get('legal');
const initialView = legal === 'terms' || legal === 'privacy'
  ? <LegalPage kind={legal} />
  : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Erro ao carregar aplicativo">
      {initialView}
    </ErrorBoundary>
  </StrictMode>,
);

