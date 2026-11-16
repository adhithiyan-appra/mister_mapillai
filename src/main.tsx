import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { images } from './data/images';
import { startImageBootstrap } from './utils/imageLoading';
import './styles/utilities.css';
import './styles/original.css';
import './styles/accessibility.css';
import './styles/performance.css';
import './styles/pages.css';
import './styles/happy-grooms.css';

startImageBootstrap(Object.values(images), [
  images['veshti-wide'],
  images['threepiece-wide'],
  images['moodboard'],
]);
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
