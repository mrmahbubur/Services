/**
 * MRS Core — Storage Adapter
 * Implements durable Firestore persistence when Admin credentials have IAM access,
 * with automatic fallback to durable atomic disk storage (.mrs-data/store.json)
 * and in-memory support for ephemeral unit tests.
 */

import fs from 'fs';
import path from 'path';

export interface IStore {
  isDurable(): boolean;
  isCloudConnected?(): boolean;
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, data: T): Promise<void>;
  update<T>(collection: string, id: string, partial: Partial<T>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  list<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]>;
  transaction<R>(fn: (txn: ITransaction) => Promise<R>): Promise<R>;
}

export interface ITransaction {
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, data: T): void;
  update<T>(collection: string, id: string, partial: Partial<T>): void;
}

export class MemoryStore implements IStore {
  protected data: Map<string, Map<string, any>> = new Map();

  isDurable(): boolean {
    return false;
  }

  isCloudConnected(): boolean {
    return false;
  }

  protected getCollection(collection: string): Map<string, any> {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map());
    }
    return this.data.get(collection)!;
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const col = this.getCollection(collection);
    return col.has(id) ? (JSON.parse(JSON.stringify(col.get(id))) as T) : null;
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    const col = this.getCollection(collection);
    col.set(id, JSON.parse(JSON.stringify(data)));
  }

  async update<T>(collection: string, id: string, partial: Partial<T>): Promise<void> {
    const col = this.getCollection(collection);
    const existing = col.get(id) || {};
    col.set(id, { ...existing, ...JSON.parse(JSON.stringify(partial)) });
  }

  async delete(collection: string, id: string): Promise<void> {
    const col = this.getCollection(collection);
    col.delete(id);
  }

  async list<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]> {
    const col = this.getCollection(collection);
    const items = Array.from(col.values()).map((v) => JSON.parse(JSON.stringify(v)));
    return filter ? items.filter(filter) : items;
  }

  async transaction<R>(fn: (txn: ITransaction) => Promise<R>): Promise<R> {
    const pendingWrites: Array<() => Promise<void> | void> = [];
    const txn: ITransaction = {
      get: async (collection, id) => this.get(collection, id),
      set: (collection, id, data) => {
        pendingWrites.push(() => this.set(collection, id, data));
      },
      update: (collection, id, partial) => {
        pendingWrites.push(() => this.update(collection, id, partial));
      },
    };

    const result = await fn(txn);
    for (const write of pendingWrites) {
      await write();
    }
    return result;
  }
}

export class FileStore extends MemoryStore {
  private filePath: string;

  constructor(filePath = path.join(process.env.MRS_DATA_DIR || path.join(process.cwd(), '.mrs-data'), 'store.json')) {
    super();
    this.filePath = filePath;
    this.loadFromDisk();
  }

  isDurable(): boolean {
    return true;
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw) as Record<string, Record<string, any>>;
      for (const [colName, docs] of Object.entries(parsed)) {
        const col = this.getCollection(colName);
        for (const [docId, docVal] of Object.entries(docs || {})) {
          col.set(docId, docVal);
        }
      }
    } catch (err) {
      console.warn('[M R S FileStore] Failed to load existing store file, starting fresh:', err);
    }
  }

  private persistToDisk() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serializable: Record<string, Record<string, any>> = {};
      for (const [colName, colMap] of this.data.entries()) {
        serializable[colName] = {};
        for (const [docId, docVal] of colMap.entries()) {
          serializable[colName][docId] = docVal;
        }
      }
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(serializable, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.warn('[M R S FileStore] Persist warning:', err);
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    await super.set(collection, id, data);
    this.persistToDisk();
  }

  async update<T>(collection: string, id: string, partial: Partial<T>): Promise<void> {
    await super.update(collection, id, partial);
    this.persistToDisk();
  }

  async delete(collection: string, id: string): Promise<void> {
    await super.delete(collection, id);
    this.persistToDisk();
  }

  async transaction<R>(fn: (txn: ITransaction) => Promise<R>): Promise<R> {
    const pendingWrites: Array<() => void> = [];
    const txn: ITransaction = {
      get: async (collection, id) => super.get(collection, id),
      set: (collection, id, data) => {
        pendingWrites.push(() => {
          const col = this.getCollection(collection);
          col.set(id, JSON.parse(JSON.stringify(data)));
        });
      },
      update: (collection, id, partial) => {
        pendingWrites.push(() => {
          const col = this.getCollection(collection);
          const existing = col.get(id) || {};
          col.set(id, { ...existing, ...JSON.parse(JSON.stringify(partial)) });
        });
      },
    };

    const result = await fn(txn);
    for (const write of pendingWrites) {
      write();
    }
    this.persistToDisk();
    return result;
  }
}

function isConnectivityOrAuthError(err: any): boolean {
  const code = err?.code;
  const msg = String(err?.message || err || '');
  return (
    code === 4 ||
    code === 7 ||
    code === 14 ||
    code === 16 ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENETUNREACH' ||
    code === 'EPIPE' ||
    /PERMISSION_DENIED|UNAUTHENTICATED|DEADLINE_EXCEEDED|UNAVAILABLE|Missing or insufficient permissions|Could not load the default credentials|Could not refresh access token|metadata\.google\.internal|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|socket hang up|fetch failed|init_timeout|firestore_timeout/i.test(
      msg
    )
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  // Prevent late unhandled rejection if the timeout wins Promise.race
  promise.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`firestore_timeout:${label} exceeded ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class FirestoreStore implements IStore {
  private db: any;
  private prefix = 'mrs_';
  private localStore = new FileStore();
  private cloudAvailable: boolean;
  private projectId?: string;
  private databaseId?: string;
  private initTimeoutMs: number;
  private opTimeoutMs: number;
  private loggedDegradedNotice = false;

  constructor(
    db: any,
    opts?: { projectId?: string; databaseId?: string; initTimeoutMs?: number; opTimeoutMs?: number }
  ) {
    this.db = db;
    this.cloudAvailable = Boolean(db);
    this.projectId = opts?.projectId;
    this.databaseId = opts?.databaseId;
    this.initTimeoutMs = opts?.initTimeoutMs ?? 5000;
    this.opTimeoutMs = opts?.opTimeoutMs ?? 8000;
  }

  async init(timeoutMs = this.initTimeoutMs): Promise<boolean> {
    if (!this.db) {
      this.cloudAvailable = false;
      return false;
    }
    try {
      await withTimeout(
        this.db.collection(this.colName('config')).doc('system_settings').get(),
        timeoutMs,
        'init'
      );
      this.cloudAvailable = true;
      return true;
    } catch (err) {
      if (isConnectivityOrAuthError(err)) {
        this.tripCloudFallback(err);
        return false;
      }
      // Transient error during startup check: remain enabled and retry on demand
      return this.cloudAvailable;
    }
  }

  private tripCloudFallback(err?: any) {
    this.cloudAvailable = false;
    if (!this.loggedDegradedNotice) {
      this.loggedDegradedNotice = true;
      const target = [this.projectId, this.databaseId].filter(Boolean).join('/');
      const msg = String(err?.message || err || '');
      const reason = /timeout|DEADLINE_EXCEEDED|ETIMEDOUT/i.test(msg)
        ? 'Cloud Firestore connection timed out'
        : /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|UNAVAILABLE|fetch failed|socket/i.test(
            msg
          )
        ? 'Cloud Firestore network unreachable'
        : 'Cloud Firestore Admin credentials lack access or are unavailable';
      console.info(
        `[M R S Store] ${reason} (${target || 'default'}); using durable local persistence (.mrs-data/store.json). Set FIREBASE_SERVICE_ACCOUNT in Secrets to enable Cloud Firestore sync.`
      );
    }
  }

  isDurable(): boolean {
    return this.cloudAvailable || this.localStore.isDurable();
  }

  isCloudConnected(): boolean {
    return Boolean(this.db) && this.cloudAvailable;
  }

  private colName(name: string): string {
    return name.startsWith(this.prefix) ? name : `${this.prefix}${name}`;
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    if (!this.db || !this.cloudAvailable) {
      return this.localStore.get<T>(collection, id);
    }
    try {
      const doc: any = await withTimeout(
        this.db.collection(this.colName(collection)).doc(id).get(),
        this.opTimeoutMs,
        `get:${collection}/${id}`
      );
      if (!doc.exists) return this.localStore.get<T>(collection, id);
      const val = doc.data() as T;
      await this.localStore.set(collection, id, val);
      return val;
    } catch (e) {
      if (isConnectivityOrAuthError(e)) {
        this.tripCloudFallback(e);
      } else {
        console.warn(`Firestore get error on ${collection}/${id}, using local durable store:`, e);
      }
      return this.localStore.get<T>(collection, id);
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    await this.localStore.set<T>(collection, id, data);
    if (!this.db || !this.cloudAvailable) return;
    try {
      await withTimeout(
        this.db.collection(this.colName(collection)).doc(id).set(data),
        this.opTimeoutMs,
        `set:${collection}/${id}`
      );
    } catch (e) {
      if (isConnectivityOrAuthError(e)) {
        this.tripCloudFallback(e);
      } else {
        console.warn(`Firestore set error on ${collection}/${id}:`, e);
      }
    }
  }

  async update<T>(collection: string, id: string, partial: Partial<T>): Promise<void> {
    await this.localStore.update<T>(collection, id, partial);
    if (!this.db || !this.cloudAvailable) return;
    try {
      await withTimeout(
        this.db.collection(this.colName(collection)).doc(id).update(partial),
        this.opTimeoutMs,
        `update:${collection}/${id}`
      );
    } catch (e) {
      if (isConnectivityOrAuthError(e)) {
        this.tripCloudFallback(e);
      } else {
        console.warn(`Firestore update error on ${collection}/${id}:`, e);
      }
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.localStore.delete(collection, id);
    if (!this.db || !this.cloudAvailable) return;
    try {
      await withTimeout(
        this.db.collection(this.colName(collection)).doc(id).delete(),
        this.opTimeoutMs,
        `delete:${collection}/${id}`
      );
    } catch (e) {
      if (isConnectivityOrAuthError(e)) {
        this.tripCloudFallback(e);
      } else {
        console.warn(`Firestore delete error on ${collection}/${id}:`, e);
      }
    }
  }

  async list<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]> {
    if (!this.db || !this.cloudAvailable) {
      return this.localStore.list<T>(collection, filter);
    }
    try {
      const snap: any = await withTimeout(
        this.db.collection(this.colName(collection)).get(),
        this.opTimeoutMs,
        `list:${collection}`
      );
      const items: T[] = snap.docs.map((d: any) => d.data() as T);
      for (const item of items) {
        const id = (item as any).id || (item as any).invoiceId || (item as any).clientId;
        if (id) await this.localStore.set(collection, id, item);
      }
      return filter ? items.filter(filter) : items;
    } catch (e) {
      if (isConnectivityOrAuthError(e)) {
        this.tripCloudFallback(e);
      } else {
        console.warn(`Firestore list error on ${collection}, using local durable store:`, e);
      }
      return this.localStore.list<T>(collection, filter);
    }
  }

  async transaction<R>(fn: (txn: ITransaction) => Promise<R>): Promise<R> {
    if (!this.db || !this.cloudAvailable) {
      return this.localStore.transaction(fn);
    }
    try {
      return await withTimeout<R>(
        this.db.runTransaction(async (fsTxn: any) => {
          const txn: ITransaction = {
            get: async (collection, id) => {
              const ref = this.db.collection(this.colName(collection)).doc(id);
              const doc = await fsTxn.get(ref);
              return doc.exists ? (doc.data() as any) : null;
            },
            set: (collection, id, data) => {
              const ref = this.db.collection(this.colName(collection)).doc(id);
              fsTxn.set(ref, data);
              void this.localStore.set(collection, id, data);
            },
            update: (collection, id, partial) => {
              const ref = this.db.collection(this.colName(collection)).doc(id);
              fsTxn.update(ref, partial);
              void this.localStore.update(collection, id, partial);
            },
          };
          return await fn(txn);
        }),
        this.opTimeoutMs,
        'transaction'
      );
    } catch (e) {
      if (isConnectivityOrAuthError(e)) {
        this.tripCloudFallback(e);
      } else {
        console.warn('Firestore transaction failed, falling back to local atomic transaction:', e);
      }
      return this.localStore.transaction(fn);
    }
  }
}
