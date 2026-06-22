import { useState, useEffect } from 'react';
import {
  getLocalBudgets,
  saveLocalBudget,
  saveBulkBudgets,
  dbEvents,
  notifyDBUpdated,
  type SyncableBudget
} from '../utils/db';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestore, auth } from '../utils/firebase';

export interface Budget {
  category: string;
  amount: number;
}

const ROOMS_COLLECTION = 'sync_rooms';
const USERS_COLLECTION = 'users';

const DEFAULT_BUDGETS: Budget[] = [
  { category: 'Makan & Minum', amount: 1500000 },
  { category: 'Transport', amount: 500000 },
  { category: 'Belanja', amount: 1200000 },
  { category: 'Digital & Langganan', amount: 300000 },
  { category: 'Hiburan', amount: 800000 },
  { category: 'Kesehatan', amount: 400000 }
];

export const useBudget = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Get active budget docRef based on login status or guest sync room ID
  const getDocRef = (category: string) => {
    const currentUser = auth.currentUser;
    const activeRoomId = localStorage.getItem('fv_syncRoomId');
    if (currentUser) {
      return doc(firestore, USERS_COLLECTION, currentUser.uid, 'budgets', category);
    } else if (activeRoomId) {
      return doc(firestore, ROOMS_COLLECTION, activeRoomId, 'budgets', category);
    }
    return null;
  };

  const loadBudgets = async () => {
    try {
      const data = await getLocalBudgets();
      if (data.length === 0) {
        // Initial setup
        const nowStr = new Date().toISOString();
        const syncableDefaults: SyncableBudget[] = DEFAULT_BUDGETS.map(b => ({
          ...b,
          updatedAt: nowStr
        }));
        await saveBulkBudgets(syncableDefaults);
        setBudgets(DEFAULT_BUDGETS);
        
        // Sync defaults to Firestore if connected
        syncBulkToFirestore(syncableDefaults);
      } else {
        setBudgets(data);
      }
    } catch (err) {
      console.error('Error loading budgets from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncToFirestore = async (b: SyncableBudget) => {
    const docRef = getDocRef(b.category);
    if (!docRef) return;

    try {
      await setDoc(docRef, b);
    } catch (err) {
      console.error('Failed to sync budget to Firestore:', err);
    }
  };

  const syncBulkToFirestore = async (list: SyncableBudget[]) => {
    try {
      for (const b of list) {
        const docRef = getDocRef(b.category);
        if (docRef) {
          await setDoc(docRef, b);
        }
      }
    } catch (err) {
      console.error('Failed to sync bulk budgets to Firestore:', err);
    }
  };

  useEffect(() => {
    loadBudgets();

    const handleDBUpdate = () => {
      loadBudgets();
    };

    dbEvents.addEventListener('db-updated', handleDBUpdate);
    return () => {
      dbEvents.removeEventListener('db-updated', handleDBUpdate);
    };
  }, []);

  const setCategoryBudget = async (category: string, amount: number) => {
    const nowStr = new Date().toISOString();
    const newBudget: SyncableBudget = {
      category,
      amount,
      updatedAt: nowStr
    };

    await saveLocalBudget(newBudget);
    notifyDBUpdated();

    // Async sync to Firestore
    syncToFirestore(newBudget);
  };

  const getCategoryBudget = (category: string): number => {
    const budget = budgets.find(b => b.category === category);
    return budget ? budget.amount : 0;
  };

  const resetBudgets = async () => {
    const nowStr = new Date().toISOString();
    const resetList = budgets.map(b => ({
      ...b,
      amount: 0,
      updatedAt: nowStr
    } as SyncableBudget));

    await saveBulkBudgets(resetList);
    notifyDBUpdated();

    // Sync to Firestore if active
    syncBulkToFirestore(resetList);
  };

  const importBudgets = async (imported: Budget[]) => {
    const nowStr = new Date().toISOString();
    const syncableImported: SyncableBudget[] = imported.map(b => ({
      ...b,
      updatedAt: nowStr
    }));

    await saveBulkBudgets(syncableImported);
    notifyDBUpdated();

    // Sync to Firestore if active
    syncBulkToFirestore(syncableImported);
  };

  return {
    budgets,
    loading,
    setCategoryBudget,
    getCategoryBudget,
    resetBudgets,
    importBudgets
  };
};
