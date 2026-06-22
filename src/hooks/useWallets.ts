import { useState, useEffect } from 'react';
import {
  getLocalWallets,
  saveLocalWallet,
  deleteLocalWalletSoft,
  saveBulkWallets,
  dbEvents,
  notifyDBUpdated,
  type Wallet
} from '../utils/db';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestore, auth } from '../utils/firebase';
import type { Transaction } from './useTransactions';

const ROOMS_COLLECTION = 'sync_rooms';
const USERS_COLLECTION = 'users';

const DEFAULT_WALLETS: Omit<Wallet, 'updatedAt'>[] = [
  { id: 'w-tunai', name: 'Tunai', type: 'tunai', initialBalance: 0, color: '#10b981', icon: '💵', deleted: false },
  { id: 'w-mandiri', name: 'Bank Mandiri', type: 'bank', initialBalance: 0, color: '#3b82f6', icon: '🏦', deleted: false },
  { id: 'w-gopay', name: 'Gopay', type: 'emoney', initialBalance: 0, color: '#06b6d4', icon: '📱', deleted: false },
  { id: 'w-shopeepay', name: 'ShopeePay', type: 'emoney', initialBalance: 0, color: '#f97316', icon: '🛍️', deleted: false }
];

export const useWallets = (transactions: Transaction[]) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const getDocRef = (walletId: string) => {
    const currentUser = auth.currentUser;
    const activeRoomId = localStorage.getItem('fv_syncRoomId');
    if (activeRoomId) {
      return doc(firestore, ROOMS_COLLECTION, activeRoomId, 'wallets', walletId);
    } else if (currentUser) {
      return doc(firestore, USERS_COLLECTION, currentUser.uid, 'wallets', walletId);
    }
    return null;
  };

  const syncToFirestore = async (w: Wallet) => {
    const docRef = getDocRef(w.id);
    if (!docRef) return;
    try {
      await setDoc(docRef, w);
    } catch (err) {
      console.error('Failed to sync wallet to Firestore:', err);
    }
  };

  const loadWallets = async () => {
    try {
      let data = await getLocalWallets();
      
      // If database is new/empty, seed the default wallets
      if (data.length === 0) {
        const nowStr = new Date().toISOString();
        const seeded: Wallet[] = DEFAULT_WALLETS.map(w => ({
          ...w,
          updatedAt: nowStr
        })) as Wallet[];

        for (const w of seeded) {
          await saveLocalWallet(w);
          syncToFirestore(w);
        }
        data = seeded;
      }
      setWallets(data);
    } catch (err) {
      console.error('Error loading wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();

    const handleDBUpdate = () => {
      loadWallets();
    };

    dbEvents.addEventListener('db-updated', handleDBUpdate);
    return () => {
      dbEvents.removeEventListener('db-updated', handleDBUpdate);
    };
  }, []);

  const addWallet = async (w: Omit<Wallet, 'id' | 'updatedAt' | 'deleted'>) => {
    const nowStr = new Date().toISOString();
    const id = `w-${Date.now()}`;
    const newWallet: Wallet = {
      ...w,
      id,
      updatedAt: nowStr,
      deleted: false
    };

    await saveLocalWallet(newWallet);
    notifyDBUpdated();
    syncToFirestore(newWallet);
  };

  const updateWallet = async (w: Wallet) => {
    const updated: Wallet = {
      ...w,
      updatedAt: new Date().toISOString()
    };
    await saveLocalWallet(updated);
    notifyDBUpdated();
    syncToFirestore(updated);
  };

  const deleteWallet = async (id: string) => {
    // Prevent deleting default wallets to maintain integrity
    if (id === 'w-tunai') {
      alert('Dompet Tunai utama tidak boleh dihapus!');
      return;
    }
    await deleteLocalWalletSoft(id);
    notifyDBUpdated();
    
    // Sync deletion status (deleted: true)
    const docRef = getDocRef(id);
    if (docRef) {
      try {
        await setDoc(docRef, { deleted: true, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.error('Failed to sync wallet delete status:', err);
      }
    }
  };

  // Dynamically compute the current balances of each wallet based on the transactions ledger
  const walletsWithBalances = wallets.map(w => {
    let balance = w.initialBalance;

    transactions.forEach(t => {
      const isThisWallet = t.walletId === w.id || (!t.walletId && w.id === 'w-tunai'); // fallback legacy transactions to Tunai
      if (isThisWallet) {
        if (t.type === 'pemasukan') {
          balance += t.amount;
        } else {
          balance -= t.amount;
        }
      }
    });

    return {
      ...w,
      balance
    };
  });

  const importWallets = async (imported: Wallet[]) => {
    const nowStr = new Date().toISOString();
    const syncableWallets = imported.map(w => ({
      ...w,
      updatedAt: nowStr
    }));
    await saveBulkWallets(syncableWallets);
    notifyDBUpdated();
    
    // Sync to Firestore if active
    for (const w of syncableWallets) {
      syncToFirestore(w);
    }
  };

  return {
    wallets: walletsWithBalances,
    loading,
    addWallet,
    updateWallet,
    deleteWallet,
    importWallets
  };
};
