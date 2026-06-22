// IndexedDB utility helper for local-first FinanceVoice database
import type { Transaction } from '../hooks/useTransactions';
import type { Budget } from '../hooks/useBudget';

const DB_NAME = 'FinanceVoiceDB';
const DB_VERSION = 2; // Bumped database version to include wallets

export const dbEvents = new EventTarget();
export const notifyDBUpdated = () => {
  dbEvents.dispatchEvent(new Event('db-updated'));
};

export interface SyncableTransaction extends Transaction {
  updatedAt: string;
  deleted: boolean;
}

export interface SyncableBudget extends Budget {
  updatedAt: string;
}

export interface Wallet {
  id: string;
  name: string;
  type: 'tunai' | 'bank' | 'emoney';
  initialBalance: number;
  color: string;
  icon: string;
  updatedAt: string;
  deleted: boolean;
  balance?: number;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      
      // Store for transactions
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        txStore.createIndex('deleted', 'deleted', { unique: false });
      }

      // Store for budgets (Retained for backwards compatibility)
      if (!db.objectStoreNames.contains('budgets')) {
        db.createObjectStore('budgets', { keyPath: 'category' });
      }

      // Store for wallets
      if (!db.objectStoreNames.contains('wallets')) {
        const walletStore = db.createObjectStore('wallets', { keyPath: 'id' });
        walletStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
};

export const getLocalTransactions = async (): Promise<SyncableTransaction[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.getAll();

    request.onsuccess = () => {
      // Return only active (non-deleted) transactions
      const all = (request.result || []) as SyncableTransaction[];
      resolve(all.filter(t => !t.deleted));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const getAllTransactionsRaw = async (): Promise<SyncableTransaction[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readonly');
    const store = transaction.objectStore('transactions');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as SyncableTransaction[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const saveLocalTransaction = async (t: SyncableTransaction): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readwrite');
    const store = transaction.objectStore('transactions');
    const request = store.put(t);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteLocalTransactionSoft = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readwrite');
    const store = transaction.objectStore('transactions');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as SyncableTransaction | undefined;
      if (existing) {
        existing.deleted = true;
        existing.updatedAt = new Date().toISOString();
        const putRequest = store.put(existing);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(); // Not found, nothing to delete
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const getLocalBudgets = async (): Promise<SyncableBudget[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('budgets', 'readonly');
    const store = transaction.objectStore('budgets');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as SyncableBudget[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const saveLocalBudget = async (b: SyncableBudget): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('budgets', 'readwrite');
    const store = transaction.objectStore('budgets');
    const request = store.put(b);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getLocalWallets = async (): Promise<Wallet[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('wallets', 'readonly');
    const store = transaction.objectStore('wallets');
    const request = store.getAll();

    request.onsuccess = () => {
      const all = (request.result || []) as Wallet[];
      resolve(all.filter(w => !w.deleted));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const getAllWalletsRaw = async (): Promise<Wallet[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('wallets', 'readonly');
    const store = transaction.objectStore('wallets');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as Wallet[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const saveLocalWallet = async (w: Wallet): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('wallets', 'readwrite');
    const store = transaction.objectStore('wallets');
    const request = store.put(w);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteLocalWalletSoft = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('wallets', 'readwrite');
    const store = transaction.objectStore('wallets');
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as Wallet | undefined;
      if (existing) {
        existing.deleted = true;
        existing.updatedAt = new Date().toISOString();
        const putRequest = store.put(existing);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
};

export const saveBulkTransactions = async (list: SyncableTransaction[]): Promise<void> => {
  if (list.length === 0) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('transactions', 'readwrite');
    const store = transaction.objectStore('transactions');
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    list.forEach(t => store.put(t));
  });
};

export const saveBulkBudgets = async (list: SyncableBudget[]): Promise<void> => {
  if (list.length === 0) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('budgets', 'readwrite');
    const store = transaction.objectStore('budgets');
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    list.forEach(b => store.put(b));
  });
};

export const saveBulkWallets = async (list: Wallet[]): Promise<void> => {
  if (list.length === 0) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('wallets', 'readwrite');
    const store = transaction.objectStore('wallets');
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    list.forEach(w => store.put(w));
  });
};

export const clearLocalDatabase = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions', 'budgets', 'wallets'], 'readwrite');
    const txStore = transaction.objectStore('transactions');
    const bStore = transaction.objectStore('budgets');
    const wStore = transaction.objectStore('wallets');

    txStore.clear();
    bStore.clear();
    wStore.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
