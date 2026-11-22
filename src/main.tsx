import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testFirebaseConnection } from './firebase/config.ts';

// Test database connection on app boot per guidelines
testFirebaseConnection().catch(() => {});

createRoot(document.getElementById('root')!).render(<App />);
