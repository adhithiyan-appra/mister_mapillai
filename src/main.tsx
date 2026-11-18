import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { images } from './data/images';
import { startImageBootstrap } from './utils/imageLoading';
import { onHeroReady } from './utils/heroReady';
import './styles/utilities.css';
import './styles/original.css';
import './styles/accessibility.css';
import './styles/performance.css';
import './styles/pages.css';
import './styles/template.css';

// On a first home visit the hero's opening frames come first: the site-wide image
// preload starts once they are decoded (or after 6 s at the latest); elsewhere at once.
onHeroReady(() => startImageBootstrap(Object.values(images)));
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
