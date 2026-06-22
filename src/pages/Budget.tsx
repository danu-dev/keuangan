import React, { useState, useMemo } from 'react';
import { Plus, Wallet, AlertCircle } from 'lucide-react';
import type { Transaction } from '../hooks/useTransactions';
import type { Budget } from '../hooks/useBudget';
import { formatRupiah } from '../utils/formatter';
import { CATEGORIES } from '../utils/nlpParser';
import { BudgetCard } from '../components/BudgetCard';
import { Modal } from '../components/Modal';

interface BudgetProps {
  budgets: Budget[];
  transactions: Transaction[];
  onSetBudget: (category: string, amount: number) => void;
}

export const BudgetPage: React.FC<BudgetProps> = ({
  budgets,
  transactions,
  onSetBudget
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Makan & Minum');
  const [budgetAmountStr, setBudgetAmountStr] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Filter only 'pengeluaran' categories for budgeting
  const expenseCategories = useMemo(() => {
    return CATEGORIES.filter(cat => cat.type === 'pengeluaran');
  }, []);

  // Compute total spent per category in the current month
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (
        t.type === 'pengeluaran' &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      ) {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    });

    return map;
  }, [transactions]);

  // Aggregate stats: Total budget limit vs total spent
  const summaryStats = useMemo(() => {
    const totalLimit = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = Object.entries(categorySpentMap).reduce((sum, [cat, spent]) => {
      // Only count spent for categories that actually have a set budget
      const hasBudget = budgets.some(b => b.category === cat);
      if (hasBudget) {
        return sum + spent;
      }
      return sum;
    }, 0);

    return {
      totalLimit,
      totalSpent,
      percentage: totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0,
      rawPercentage: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0
    };
  }, [budgets, categorySpentMap]);

  const handleOpenAddBudget = () => {
    setSelectedCategory(expenseCategories[0]?.name || 'Makan & Minum');
    setBudgetAmountStr('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditBudget = (budget: Budget) => {
    setSelectedCategory(budget.category);
    setBudgetAmountStr(budget.amount.toString());
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const amount = parseInt(budgetAmountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      setModalError('Anggaran limit harus lebih besar dari Rp 0.');
      return;
    }

    onSetBudget(selectedCategory, amount);
    setIsModalOpen(false);
  };

  return (
    <div className="pb-24 pt-4 px-4 w-full max-w-full md:max-w-none md:pb-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
          Anggaran Kategori
        </h2>
        <button
          onClick={handleOpenAddBudget}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-xl shadow-sm transition-all active:scale-95 duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Atur Anggaran</span>
        </button>
      </div>

      {/* Global Limit Stats Dashboard Card */}
      {budgets.length > 0 && (
        <div className="bg-gradient-to-tr from-[#052e16] to-[#14532d] p-5 rounded-3xl text-white shadow-lg space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-emerald-300">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider block">Total Anggaran Bulanan</span>
              <span className="text-lg font-black">{formatRupiah(summaryStats.totalLimit)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-200">
                Terpakai: <span className="font-bold text-white">{formatRupiah(summaryStats.totalSpent)}</span>
              </span>
              <span className="font-bold">
                {Math.round(summaryStats.rawPercentage)}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summaryStats.rawPercentage >= 90 ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${summaryStats.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Category Budget Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.length > 0 ? (
          budgets.map((b) => {
            const spent = categorySpentMap[b.category] || 0;
            return (
              <BudgetCard
                key={b.category}
                category={b.category}
                limit={b.amount}
                spent={spent}
                onEdit={() => handleOpenEditBudget(b)}
              />
            );
          })
        ) : (
          <div className="bg-white dark:bg-emerald-950/20 border border-dashed border-slate-200 dark:border-emerald-900/30 rounded-3xl p-10 text-center space-y-3">
            <p className="text-xs text-slate-400 dark:text-emerald-400/40">
              Anda belum menetapkan batas anggaran belanja bulanan.
            </p>
            <button
              onClick={handleOpenAddBudget}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-xl shadow transition-transform active:scale-95"
            >
              Atur Anggaran Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Bottom Sheet modal for setting budgets */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Atur Limit Anggaran"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-xs text-rose-600 flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Select Category */}
          <div className="space-y-1.5">
            <label htmlFor="modalCategory" className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">
              Pilih Kategori Belanja
            </label>
            <select
              id="modalCategory"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-3.5 px-4 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {expenseCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Limit Input */}
          <div className="space-y-1.5">
            <label htmlFor="budgetAmount" className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">
              Batas Anggaran Bulanan (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                id="budgetAmount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={budgetAmountStr ? parseInt(budgetAmountStr, 10).toLocaleString('id-ID') : ''}
                onChange={(e) => setBudgetAmountStr(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-sm font-bold text-slate-800 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {budgetAmountStr && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold italic pl-1">
                Format: {formatRupiah(parseInt(budgetAmountStr, 10))}
              </span>
            )}
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow transition-transform active:scale-95 cursor-pointer"
          >
            Simpan Anggaran
          </button>
        </form>
      </Modal>
    </div>
  );
};
