import { useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';

export interface Transaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

const STORAGE_KEY = 'fv_transactions';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const saved = getStorageItem<Transaction[]>(STORAGE_KEY, []);
    setTransactions(saved);
  }, []);

  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: `t-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newTransaction, ...transactions];
    setTransactions(updated);
    setStorageItem(STORAGE_KEY, updated);
    return newTransaction;
  };

  const updateTransaction = (id: string, updatedFields: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    const updated = transactions.map(t => {
      if (t.id === id) {
        return { ...t, ...updatedFields };
      }
      return t;
    });
    setTransactions(updated);
    setStorageItem(STORAGE_KEY, updated);
  };

  const deleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    setStorageItem(STORAGE_KEY, updated);
  };

  const resetTransactions = () => {
    setTransactions([]);
    setStorageItem(STORAGE_KEY, []);
  };

  const importTransactions = (imported: Transaction[]) => {
    setTransactions(imported);
    setStorageItem(STORAGE_KEY, imported);
  };

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    resetTransactions,
    importTransactions
  };
};
