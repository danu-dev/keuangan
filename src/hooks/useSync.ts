import { useState, useEffect, useRef } from 'react';
import { db as firestore, auth } from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  CollectionReference
} from 'firebase/firestore';
import {
  getAllTransactionsRaw,
  getLocalBudgets,
  saveBulkTransactions,
  saveBulkBudgets,
  saveBulkWallets,
  getAllWalletsRaw,
  notifyDBUpdated,
  type SyncableTransaction,
  type SyncableBudget,
  type Wallet
} from '../utils/db';

const ROOMS_COLLECTION = 'sync_rooms';
const USERS_COLLECTION = 'users';

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FV-${result}`;
};

export const useSync = (userName: string, setUserName?: (name: string) => void) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncRoomId, setSyncRoomId] = useState<string | null>(() => {
    return localStorage.getItem('fv_syncRoomId');
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error' | 'disconnected'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const listenersRef = useRef<{ unsubTx: (() => void) | null; unsubBudget: (() => void) | null; unsubWallet: (() => void) | null }>({
    unsubTx: null,
    unsubBudget: null,
    unsubWallet: null
  });

  const isSyncingRef = useRef(false);

  const saveSyncSettings = (roomId: string | null) => {
    if (roomId) {
      localStorage.setItem('fv_syncRoomId', roomId);
    } else {
      localStorage.removeItem('fv_syncRoomId');
    }
    setSyncRoomId(roomId);
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user && setUserName) {
        const name = user.displayName || user.email?.split('@')[0] || user.phoneNumber || 'User';
        if (localStorage.getItem('fv_userName') === 'Put' || !localStorage.getItem('fv_userName')) {
          setUserName(name);
        }
      }
    });
    return () => unsubscribe();
  }, [setUserName]);

  // Get active firestore collections depending on login or room sync
  const getCollections = (): { txCol: CollectionReference; budgetCol: CollectionReference; walletCol: CollectionReference } | null => {
    if (syncRoomId) {
      return {
        txCol: collection(firestore, ROOMS_COLLECTION, syncRoomId, 'transactions'),
        budgetCol: collection(firestore, ROOMS_COLLECTION, syncRoomId, 'budgets'),
        walletCol: collection(firestore, ROOMS_COLLECTION, syncRoomId, 'wallets')
      };
    } else if (currentUser) {
      return {
        txCol: collection(firestore, USERS_COLLECTION, currentUser.uid, 'transactions'),
        budgetCol: collection(firestore, USERS_COLLECTION, currentUser.uid, 'budgets'),
        walletCol: collection(firestore, USERS_COLLECTION, currentUser.uid, 'wallets')
      };
    }
    return null;
  };

  // Perform full initial synchronization between IndexedDB and Firestore
  const performInitialSync = async () => {
    const cols = getCollections();
    if (!cols) {
      setSyncStatus('idle');
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // 1. Fetch all local data
      const localTxs = await getAllTransactionsRaw();
      const localBudgets = await getLocalBudgets();
      const localWallets = await getAllWalletsRaw();

      // 2. Fetch all Firestore data
      const [remoteTxSnap, remoteBudgetSnap, remoteWalletSnap] = await Promise.all([
        getDocs(cols.txCol),
        getDocs(cols.budgetCol),
        getDocs(cols.walletCol)
      ]);

      const remoteTxsMap = new Map<string, SyncableTransaction>();
      remoteTxSnap.forEach((docSnap: any) => {
        remoteTxsMap.set(docSnap.id, docSnap.data() as SyncableTransaction);
      });

      const remoteBudgetsMap = new Map<string, SyncableBudget>();
      remoteBudgetSnap.forEach((docSnap: any) => {
        remoteBudgetsMap.set(docSnap.id, docSnap.data() as SyncableBudget);
      });

      const remoteWalletsMap = new Map<string, Wallet>();
      remoteWalletSnap.forEach((docSnap: any) => {
        remoteWalletsMap.set(docSnap.id, docSnap.data() as Wallet);
      });

      const txsToSaveLocal: SyncableTransaction[] = [];
      const txsToSaveRemote: SyncableTransaction[] = [];

      const budgetsToSaveLocal: SyncableBudget[] = [];
      const budgetsToSaveRemote: SyncableBudget[] = [];

      const walletsToSaveLocal: Wallet[] = [];
      const walletsToSaveRemote: Wallet[] = [];

      // --- MERGE TRANSACTIONS (LWW) ---
      const localTxsMap = new Map(localTxs.map(t => [t.id, t]));
      const allTxIds = new Set([...localTxsMap.keys(), ...remoteTxsMap.keys()]);

      for (const id of allTxIds) {
        const local = localTxsMap.get(id);
        const remote = remoteTxsMap.get(id);

        if (local && remote) {
          const localTime = new Date(local.updatedAt).getTime();
          const remoteTime = new Date(remote.updatedAt).getTime();

          if (remoteTime > localTime) {
            txsToSaveLocal.push(remote);
          } else if (localTime > remoteTime) {
            txsToSaveRemote.push(local);
          }
        } else if (local) {
          txsToSaveRemote.push(local);
        } else if (remote) {
          txsToSaveLocal.push(remote);
        }
      }

      // --- MERGE BUDGETS (LWW) ---
      const localBudgetsMap = new Map(localBudgets.map(b => [b.category, b]));
      const allBudgetIds = new Set([...localBudgetsMap.keys(), ...remoteBudgetsMap.keys()]);

      for (const cat of allBudgetIds) {
        const local = localBudgetsMap.get(cat);
        const remote = remoteBudgetsMap.get(cat);

        if (local && remote) {
          const localTime = new Date(local.updatedAt || 0).getTime();
          const remoteTime = new Date(remote.updatedAt || 0).getTime();

          if (remoteTime > localTime) {
            budgetsToSaveLocal.push(remote);
          } else if (localTime > remoteTime) {
            budgetsToSaveRemote.push(local);
          }
        } else if (local) {
          budgetsToSaveRemote.push(local);
        } else if (remote) {
          budgetsToSaveLocal.push(remote);
        }
      }

      // --- MERGE WALLETS (LWW) ---
      const localWalletsMap = new Map(localWallets.map(w => [w.id, w]));
      const allWalletIds = new Set([...localWalletsMap.keys(), ...remoteWalletsMap.keys()]);

      for (const id of allWalletIds) {
        const local = localWalletsMap.get(id);
        const remote = remoteWalletsMap.get(id);

        if (local && remote) {
          const localTime = new Date(local.updatedAt || 0).getTime();
          const remoteTime = new Date(remote.updatedAt || 0).getTime();

          if (remoteTime > localTime) {
            walletsToSaveLocal.push(remote);
          } else if (localTime > remoteTime) {
            walletsToSaveRemote.push(local);
          }
        } else if (local) {
          walletsToSaveRemote.push(local);
        } else if (remote) {
          walletsToSaveLocal.push(remote);
        }
      }

      // 3. Write updates back to IndexedDB
      if (txsToSaveLocal.length > 0) {
        await saveBulkTransactions(txsToSaveLocal);
      }
      if (budgetsToSaveLocal.length > 0) {
        await saveBulkBudgets(budgetsToSaveLocal);
      }
      if (walletsToSaveLocal.length > 0) {
        await saveBulkWallets(walletsToSaveLocal);
      }

      // 4. Write updates back to Firestore in batches
      if (txsToSaveRemote.length > 0) {
        const batch = writeBatch(firestore);
        txsToSaveRemote.forEach(tx => {
          const docRef = doc(cols.txCol, tx.id);
          batch.set(docRef, tx);
        });
        await batch.commit();
      }

      if (budgetsToSaveRemote.length > 0) {
        const batch = writeBatch(firestore);
        budgetsToSaveRemote.forEach(b => {
          const docRef = doc(cols.budgetCol, b.category);
          batch.set(docRef, b);
        });
        await batch.commit();
      }

      if (walletsToSaveRemote.length > 0) {
        const batch = writeBatch(firestore);
        walletsToSaveRemote.forEach(w => {
          const docRef = doc(cols.walletCol, w.id);
          batch.set(docRef, w);
        });
        await batch.commit();
      }

      if (txsToSaveLocal.length > 0 || budgetsToSaveLocal.length > 0 || walletsToSaveLocal.length > 0) {
        notifyDBUpdated();
      }

      setSyncStatus('connected');
    } catch (err: any) {
      console.error('Error during initial sync:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal melakukan sinkronisasi awal');
    } finally {
      isSyncingRef.current = false;
    }
  };

  // Start real-time Firestore listeners
  const startRealtimeListeners = () => {
    const cols = getCollections();
    if (!cols) return;

    stopListeners();

    // 1. Transaction Listener
    listenersRef.current.unsubTx = onSnapshot(cols.txCol, async (snapshot: any) => {
      if (isSyncingRef.current) return;
      
      const localTxs = await getAllTransactionsRaw();
      const localTxsMap = new Map(localTxs.map(t => [t.id, t]));
      const toSaveLocal: SyncableTransaction[] = [];
      let hasUpdates = false;

      snapshot.docChanges().forEach((change: any) => {
        const remoteTx = change.doc.data() as SyncableTransaction;
        const localTx = localTxsMap.get(remoteTx.id);

        if (!localTx) {
          toSaveLocal.push(remoteTx);
          hasUpdates = true;
        } else {
          const localTime = new Date(localTx.updatedAt).getTime();
          const remoteTime = new Date(remoteTx.updatedAt).getTime();
          if (remoteTime > localTime) {
            toSaveLocal.push(remoteTx);
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates && toSaveLocal.length > 0) {
        await saveBulkTransactions(toSaveLocal);
        notifyDBUpdated();
      }
    }, (err: any) => {
      console.error('Transaction listener error:', err);
      setSyncStatus('disconnected');
    });

    // 2. Budget Listener
    listenersRef.current.unsubBudget = onSnapshot(cols.budgetCol, async (snapshot: any) => {
      if (isSyncingRef.current) return;

      const localBudgets = await getLocalBudgets();
      const localBudgetsMap = new Map(localBudgets.map(b => [b.category, b]));
      const toSaveLocal: SyncableBudget[] = [];
      let hasUpdates = false;

      snapshot.docChanges().forEach((change: any) => {
        const remoteBudget = change.doc.data() as SyncableBudget;
        const localBudget = localBudgetsMap.get(remoteBudget.category);

        if (!localBudget) {
          toSaveLocal.push(remoteBudget);
          hasUpdates = true;
        } else {
          const localTime = new Date(localBudget.updatedAt || 0).getTime();
          const remoteTime = new Date(remoteBudget.updatedAt || 0).getTime();
          if (remoteTime > localTime) {
            toSaveLocal.push(remoteBudget);
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates && toSaveLocal.length > 0) {
        await saveBulkBudgets(toSaveLocal);
        notifyDBUpdated();
      }
    }, (err: any) => {
      console.error('Budget listener error:', err);
      setSyncStatus('disconnected');
    });

    // 3. Wallet Listener
    listenersRef.current.unsubWallet = onSnapshot(cols.walletCol, async (snapshot: any) => {
      if (isSyncingRef.current) return;

      const localWallets = await getAllWalletsRaw();
      const localWalletsMap = new Map(localWallets.map(w => [w.id, w]));
      const toSaveLocal: Wallet[] = [];
      let hasUpdates = false;

      snapshot.docChanges().forEach((change: any) => {
        const remoteWallet = change.doc.data() as Wallet;
        const localWallet = localWalletsMap.get(remoteWallet.id);

        if (!localWallet) {
          toSaveLocal.push(remoteWallet);
          hasUpdates = true;
        } else {
          const localTime = new Date(localWallet.updatedAt || 0).getTime();
          const remoteTime = new Date(remoteWallet.updatedAt || 0).getTime();
          if (remoteTime > localTime) {
            toSaveLocal.push(remoteWallet);
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates && toSaveLocal.length > 0) {
        await saveBulkWallets(toSaveLocal);
        notifyDBUpdated();
      }
    }, (err: any) => {
      console.error('Wallet listener error:', err);
      setSyncStatus('disconnected');
    });
  };

  const stopListeners = () => {
    if (listenersRef.current.unsubTx) {
      listenersRef.current.unsubTx();
      listenersRef.current.unsubTx = null;
    }
    if (listenersRef.current.unsubBudget) {
      listenersRef.current.unsubBudget();
      listenersRef.current.unsubBudget = null;
    }
    if (listenersRef.current.unsubWallet) {
      listenersRef.current.unsubWallet();
      listenersRef.current.unsubWallet = null;
    }
  };

  // Create a new sync room (for guest sharing)
  const createSyncRoom = async (): Promise<string> => {
    setSyncStatus('syncing');
    setSyncError(null);
    const newRoomId = generateRoomCode();

    try {
      const roomDocRef = doc(firestore, ROOMS_COLLECTION, newRoomId);
      await setDoc(roomDocRef, {
        id: newRoomId,
        creator: userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      stopListeners();

      const localTxs = await getAllTransactionsRaw();
      const localBudgets = await getLocalBudgets();
      const localWallets = await getAllWalletsRaw();

      // Upload transactions
      if (localTxs.length > 0) {
        const batch = writeBatch(firestore);
        localTxs.forEach(tx => {
          const docRef = doc(firestore, ROOMS_COLLECTION, newRoomId, 'transactions', tx.id);
          batch.set(docRef, tx);
        });
        await batch.commit();
      }

      // Upload budgets
      if (localBudgets.length > 0) {
        const batch = writeBatch(firestore);
        localBudgets.forEach(b => {
          const docRef = doc(firestore, ROOMS_COLLECTION, newRoomId, 'budgets', b.category);
          batch.set(docRef, b);
        });
        await batch.commit();
      }

      // Upload wallets
      if (localWallets.length > 0) {
        const batch = writeBatch(firestore);
        localWallets.forEach(w => {
          const docRef = doc(firestore, ROOMS_COLLECTION, newRoomId, 'wallets', w.id);
          batch.set(docRef, w);
        });
        await batch.commit();
      }

      saveSyncSettings(newRoomId);
      setSyncStatus('connected');
      startRealtimeListeners();

      return newRoomId;
    } catch (err: any) {
      console.error('Failed to create sync room:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal membuat ruang sinkronisasi');
      throw err;
    }
  };

  // Join an existing sync room (for guest sharing)
  const joinSyncRoom = async (roomId: string): Promise<void> => {
    const cleanRoomId = roomId.trim().toUpperCase();
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const roomDocRef = doc(firestore, ROOMS_COLLECTION, cleanRoomId);
      const roomSnap = await getDoc(roomDocRef);

      if (!roomSnap.exists()) {
        throw new Error('Kode sinkronisasi tidak ditemukan. Periksa kembali kodenya.');
      }

      stopListeners();
      saveSyncSettings(cleanRoomId);
      await performInitialSync();
      startRealtimeListeners();
    } catch (err: any) {
      console.error('Failed to join sync room:', err);
      setSyncStatus('error');
      setSyncError(err.message || 'Gagal bergabung dengan ruang sinkronisasi');
      throw err;
    }
  };

  // Disconnect from the current sync room
  const disconnectSync = () => {
    stopListeners();
    saveSyncSettings(null);
    setSyncStatus('idle');
    setSyncError(null);
  };

  // Trigger sync on auth status change, syncRoomId update, or device coming online
  useEffect(() => {
    performInitialSync().then(() => {
      startRealtimeListeners();
    });

    const handleOnline = () => {
      console.log('Network connected. Starting automatic synchronization...');
      performInitialSync().then(() => {
        startRealtimeListeners();
      });
    };

    window.addEventListener('online', handleOnline);

    return () => {
      stopListeners();
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser, syncRoomId]);

  return {
    currentUser,
    authLoading,
    syncRoomId,
    syncStatus,
    syncError,
    createSyncRoom,
    joinSyncRoom,
    disconnectSync,
    reSync: performInitialSync
  };
};
