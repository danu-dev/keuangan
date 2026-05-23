import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Transaction } from '../hooks/useTransactions';
import { formatDate } from '../utils/formatter';
import { TransactionItem } from '../components/TransactionItem';
import { CATEGORIES } from '../utils/nlpParser';

interface HistoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
}

export const History: React.FC<HistoryProps> = ({
  transactions,
  onDeleteTransaction,
  onEditTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'semua' | 'pemasukan' | 'pengeluaran'>('semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [monthFilter, setMonthFilter] = useState('Semua');
  
  const [visibleCount, setVisibleCount] = useState(15);

  // Available unique months in the transactions list for filter dropdown
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      const date = new Date(t.date);
      if (!isNaN(date.getTime())) {
        const monthName = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        months.add(monthName);
      }
    });
    return ['Semua', ...Array.from(months)];
  }, [transactions]);

  // Unique categories list
  const categoriesList = useMemo(() => {
    return ['Semua', ...CATEGORIES.map(c => c.name)];
  }, []);

  // Filter transactions based on searches and dropdown criteria
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search text
        const matchesSearch =
          t.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.amount.toString().includes(searchQuery);

        // Type filter
        const matchesType = typeFilter === 'semua' ? true : t.type === typeFilter;

        // Category filter
        const matchesCategory = categoryFilter === 'Semua' ? true : t.category === categoryFilter;

        // Month filter
        let matchesMonth = true;
        if (monthFilter !== 'Semua') {
          const tMonthName = new Date(t.date).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
          matchesMonth = tMonthName === monthFilter;
        }

        return matchesSearch && matchesType && matchesCategory && matchesMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, typeFilter, categoryFilter, monthFilter]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const sliced = filteredTransactions.slice(0, visibleCount);
    const groups: Record<string, Transaction[]> = {};

    sliced.forEach((t) => {
      const formattedDate = formatDate(t.date);
      if (!groups[formattedDate]) {
        groups[formattedDate] = [];
      }
      groups[formattedDate].push(t);
    });

    return groups;
  }, [filteredTransactions, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 15);
  };

  const hasMore = filteredTransactions.length > visibleCount;

  return (
    <div className="pb-28 pt-4 px-4 max-w-[430px] mx-auto space-y-5">
      {/* Title */}
      <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
        Riwayat Transaksi
      </h2>

      {/* Search & Filters Card */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-4 shadow-sm space-y-3.5">
        {/* Full-text Search Bar */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari deskripsi, kategori, nominal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-semibold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Type Filter */}
          <div className="flex flex-col space-y-1">
            <span className="text-[8px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider pl-1">
              Tipe
            </span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="py-2.5 px-3 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-900/20 rounded-xl text-[10px] font-bold text-slate-600 dark:text-emerald-200 focus:outline-none"
            >
              <option value="semua">Semua</option>
              <option value="pemasukan">Masuk</option>
              <option value="pengeluaran">Keluar</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col space-y-1">
            <span className="text-[8px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider pl-1">
              Kategori
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-2.5 px-2 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-900/20 rounded-xl text-[10px] font-bold text-slate-600 dark:text-emerald-200 focus:outline-none truncate"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex flex-col space-y-1">
            <span className="text-[8px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider pl-1">
              Bulan
            </span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="py-2.5 px-2 bg-slate-50 dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-900/20 rounded-xl text-[10px] font-bold text-slate-600 dark:text-emerald-200 focus:outline-none truncate"
            >
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Ledger Entries */}
      <div className="space-y-4">
        {Object.keys(groupedTransactions).length > 0 ? (
          Object.entries(groupedTransactions).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-1.5">
              {/* Date Header Separator */}
              <div className="flex items-center space-x-2 px-1">
                <span className="text-[10px] font-extrabold text-emerald-600/70 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                  {dateLabel}
                </span>
                <div className="flex-1 h-[1px] bg-slate-100 dark:bg-emerald-950/20"></div>
              </div>

              {/* Transactions in Date Group */}
              <div className="space-y-0.5">
                {items.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    onDelete={onDeleteTransaction}
                    onEdit={onEditTransaction}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-emerald-950/20 border border-dashed border-slate-200 dark:border-emerald-900/30 rounded-3xl p-10 text-center space-y-2">
            <p className="text-xs text-slate-400 dark:text-emerald-400/50">
              Tidak ada transaksi yang cocok dengan pencarian Anda.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('semua');
                setCategoryFilter('Semua');
                setMonthFilter('Semua');
              }}
              className="text-[10px] font-bold text-emerald-500 underline"
            >
              Reset Semua Filter
            </button>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <button
            onClick={handleLoadMore}
            className="w-full py-3 bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-slate-100 hover:bg-slate-50 font-bold text-xs rounded-2xl shadow-sm transition-all active:scale-95 duration-200"
          >
            Muat Lebih Banyak ({filteredTransactions.length - visibleCount} lagi)
          </button>
        )}
      </div>
    </div>
  );
};
