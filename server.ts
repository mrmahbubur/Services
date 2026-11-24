import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, applicationDefault, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { installMrsCore, FirestoreStore, FileStore } from './server/mrs-core/index.js';
import { createGeminiClient } from './server/mrs-core/ai/client.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai: GoogleGenAI | null = createGeminiClient(process.env.GEMINI_API_KEY);

function parseServiceAccountJson(raw: string): Record<string, any> {
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.startsWith('data:application/json;base64,')) {
    cleaned = cleaned.slice('data:application/json;base64,'.length).trim();
  }

  let parsed: Record<string, any>;
  if (cleaned.startsWith('{')) {
    parsed = JSON.parse(cleaned);
  } else {
    const normalizedB64 = cleaned.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalizedB64, 'base64').toString('utf8').trim();
    if (!decoded.startsWith('{')) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is neither valid JSON nor base64-encoded JSON.');
    }
    parsed = JSON.parse(decoded);
  }

  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

function getOrInitializeFirebaseApp(credential: any, projectId: string) {
  return getApps().length
    ? getApp()
    : initializeApp({
        credential,
        projectId,
      });
}

let db: any = null;
let firebaseProjectId = '';
let firebaseDbId = '';
try {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firebaseProjectId = firebaseConfig.projectId || '';
    firebaseDbId = firebaseConfig.firestoreDatabaseId || '';
  }

  const hasValidProject =
    Boolean(firebaseProjectId) && firebaseProjectId !== 'remixed-project-id';
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const isGcpRuntime = Boolean(
    process.env.K_SERVICE ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.FUNCTION_TARGET ||
      process.env.CLOUD_RUN_JOB
  );

  if (serviceAccount) {
    const parsedAccount = parseServiceAccountJson(serviceAccount);
    const projectId =
      parsedAccount.project_id || (hasValidProject ? firebaseProjectId : '');
    if (projectId && projectId !== 'remixed-project-id') {
      const firebaseApp = getOrInitializeFirebaseApp(cert(parsedAccount), projectId);
      db =
        firebaseDbId && firebaseDbId !== '(default)'
          ? getFirestore(firebaseApp, firebaseDbId)
          : getFirestore(firebaseApp);
      firebaseProjectId = projectId;
    }
  } else if (isGcpRuntime && hasValidProject) {
    const firebaseApp = getOrInitializeFirebaseApp(applicationDefault(), firebaseProjectId);
    db =
      firebaseDbId && firebaseDbId !== '(default)'
        ? getFirestore(firebaseApp, firebaseDbId)
        : getFirestore(firebaseApp);
  } else {
    console.info(
      '[M R S Store] FIREBASE_SERVICE_ACCOUNT not set on external host; starting with durable local store (.mrs-data/store.json).'
    );
  }
} catch (e) {
  console.warn('Firebase admin initialization notice (using durable local store):', e);
}

const app = express();

const store = db
  ? new FirestoreStore(db, { projectId: firebaseProjectId, databaseId: firebaseDbId })
  : new FileStore();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.PORT) {
    const envPort = Number(process.env.PORT);
    if (!isNaN(envPort) && envPort > 0) return envPort;
  }
  return 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

async function startServer() {
  if (store instanceof FirestoreStore) {
    await store.init();
  }
  installMrsCore(app, {
    store,
    ai,
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.all('/api/*', (_req, res) => {
      res.status(404).json({ error: 'API route not found' });
    });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`M R S platform server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
