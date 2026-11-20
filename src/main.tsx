import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initScrollRestoration } from './utils/scrollRestore';
import './styles/fonts.css';
import './styles/utilities.css';
import './styles/original.css';
import './styles/accessibility.css';
import './styles/performance.css';
import './styles/pages.css';
import './styles/template.css';

// Images are loaded by the page that shows them (components/animations/ImageLoading.tsx), nearest first.
// There is no site-wide preload of every image: a visit to /contact no longer downloads the looks, the
// orbit and the gallery it never shows.

// Before anything renders: take scroll restoration over from the browser (reload and back/forward put the visitor
// back where they were; see utils/scrollRestore.ts).
initScrollRestoration();
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
