import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { preload } from 'react-dom';
import App from './App';
import { images } from './data/images';
import './styles/utilities.css';
import './styles/original.css';
import './styles/accessibility.css';
import './styles/performance.css';

preload(images['veshti-wide'], { as: 'image', fetchPriority: 'high' });
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
