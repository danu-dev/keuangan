import { useState, useEffect } from 'react';
import {
  getLocalTransactions,
  saveLocalTransaction,
  deleteLocalTransactionSoft,
  saveBulkTransactions,
  dbEvents,
  notifyDBUpdated,
  type SyncableTransaction
} from '../utils/db';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestore, auth } from '../utils/firebase';

export interface Transaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  walletId?: string; // Links transaction to a specific wallet/account
}

const ROOMS_COLLECTION = 'sync_rooms';
const USERS_COLLECTION = 'users';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadTransactions = async () => {
    try {
      const data = await getLocalTransactions();
      const sorted = [...data].sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTransactions(sorted);
    } catch (err) {
      console.error('Error loading transactions from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get firestore document reference depending on current auth or room status
  const getDocRef = (txId: string) => {
    const currentUser = auth.currentUser;
    const activeRoomId = localStorage.getItem('fv_syncRoomId');
    if (currentUser) {
      return doc(firestore, USERS_COLLECTION, currentUser.uid, 'transactions', txId);
    } else if (activeRoomId) {
      return doc(firestore, ROOMS_COLLECTION, activeRoomId, 'transactions', txId);
    }
    return null;
  };

  // Sync to Firestore helper
  const syncToFirestore = async (tx: SyncableTransaction) => {
    const docRef = getDocRef(tx.id);
    if (!docRef) return;

    try {
      await setDoc(docRef, tx);
    } catch (err) {
      console.error('Failed to sync transaction to Firestore:', err);
    }
  };

  useEffect(() => {
    loadTransactions();

    const handleDBUpdate = () => {
      loadTransactions();
    };

    dbEvents.addEventListener('db-updated', handleDBUpdate);
    return () => {
      dbEvents.removeEventListener('db-updated', handleDBUpdate);
    };
  }, []);

  const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const nowStr = new Date().toISOString();
    const id = `t-${Date.now()}`;
    const newTx: SyncableTransaction = {
      ...t,
      id,
      createdAt: nowStr,
      updatedAt: nowStr,
      deleted: false
    };

    await saveLocalTransaction(newTx);
    notifyDBUpdated();
    
    // Attempt background Firestore sync
    syncToFirestore(newTx);

    return newTx;
  };

  const updateTransaction = async (id: string, updatedFields: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;

    const nowStr = new Date().toISOString();
    const updatedTx: SyncableTransaction = {
      ...existing,
      ...updatedFields,
      updatedAt: nowStr,
      deleted: false
    };

    await saveLocalTransaction(updatedTx);
    notifyDBUpdated();

    // Attempt background Firestore sync
    syncToFirestore(updatedTx);
  };

  const deleteTransaction = async (id: string) => {
    await deleteLocalTransactionSoft(id);
    notifyDBUpdated();

    // Sync deletion to Firestore
    const docRef = getDocRef(id);
    if (docRef) {
      const nowStr = new Date().toISOString();
      const existing = transactions.find(t => t.id === id);
      if (existing) {
        const deletedTx: SyncableTransaction = {
          ...existing,
          updatedAt: nowStr,
          deleted: true
        };
        try {
          await setDoc(docRef, deletedTx);
        } catch (err) {
          console.error('Failed to sync deletion to Firestore:', err);
        }
      }
    }
  };

  const resetTransactions = async () => {
    const currentUser = auth.currentUser;
    const activeRoomId = localStorage.getItem('fv_syncRoomId');
    
    if (currentUser || activeRoomId) {
      // Soft-delete all locally and sync deletes
      const nowStr = new Date().toISOString();
      const updatedList = transactions.map(t => ({
        ...t,
        updatedAt: nowStr,
        deleted: true
      } as SyncableTransaction));

      await saveBulkTransactions(updatedList);
      notifyDBUpdated();

      try {
        for (const tx of updatedList) {
          const docRef = getDocRef(tx.id);
          if (docRef) {
            await setDoc(docRef, tx);
          }
        }
      } catch (err) {
        console.error('Failed to sync batch deletions to Firestore:', err);
      }
    } else {
      setTransactions([]);
    }
  };

  const importTransactions = async (imported: Transaction[]) => {
    const nowStr = new Date().toISOString();
    const syncableImported: SyncableTransaction[] = imported.map(t => ({
      ...t,
      updatedAt: nowStr,
      deleted: false
    }));

    await saveBulkTransactions(syncableImported);
    notifyDBUpdated();

    // Sync to Firestore if active
    try {
      for (const tx of syncableImported) {
        const docRef = getDocRef(tx.id);
        if (docRef) {
          await setDoc(docRef, tx);
        }
      }
    } catch (err) {
      console.error('Failed to sync imported transactions to Firestore:', err);
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    resetTransactions,
    importTransactions
  };
};
