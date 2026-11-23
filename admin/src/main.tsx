import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { colors } from '../../src/theme/colors';
import { App } from './App';
import { AuthProvider } from './lib/auth';

// Share the app's design tokens: every color in src/theme/colors.ts becomes a CSS variable
// (e.g. colors.teal → var(--teal), colors.studyPlan.button → var(--studyPlan-button)).
function setTokens(obj: object, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') document.documentElement.style.setProperty(`--${prefix}${key}`, value);
    else if (Array.isArray(value))
      value.forEach((v, i) => typeof v === 'string' && document.documentElement.style.setProperty(`--${prefix}${key}-${i}`, v));
    else if (value && !Array.isArray(value) && typeof value === 'object') setTokens(value, `${prefix}${key}-`);
  }
}
setTokens(colors);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
