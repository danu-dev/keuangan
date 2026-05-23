import { useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';

export interface Budget {
  category: string;
  amount: number;
}

const STORAGE_KEY = 'fv_budgets';

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

  useEffect(() => {
    const saved = getStorageItem<Budget[]>(STORAGE_KEY, []);
    if (saved.length === 0) {
      setStorageItem(STORAGE_KEY, DEFAULT_BUDGETS);
      setBudgets(DEFAULT_BUDGETS);
    } else {
      setBudgets(saved);
    }
  }, []);

  const setCategoryBudget = (category: string, amount: number) => {
    const existingIndex = budgets.findIndex(b => b.category === category);
    let updated: Budget[];
    
    if (existingIndex >= 0) {
      updated = [...budgets];
      updated[existingIndex] = { category, amount };
    } else {
      updated = [...budgets, { category, amount }];
    }
    
    setBudgets(updated);
    setStorageItem(STORAGE_KEY, updated);
  };

  const getCategoryBudget = (category: string): number => {
    const budget = budgets.find(b => b.category === category);
    return budget ? budget.amount : 0;
  };

  const resetBudgets = () => {
    setBudgets([]);
    setStorageItem(STORAGE_KEY, []);
  };

  const importBudgets = (imported: Budget[]) => {
    setBudgets(imported);
    setStorageItem(STORAGE_KEY, imported);
  };

  return {
    budgets,
    setCategoryBudget,
    getCategoryBudget,
    resetBudgets,
    importBudgets
  };
};
