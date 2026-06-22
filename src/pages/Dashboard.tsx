import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Cell, Tooltip } from 'recharts';
import type { Transaction } from '../hooks/useTransactions';
import type { Wallet } from '../utils/db';
import { formatRupiah, formatMonthYear } from '../utils/formatter';
import { TransactionItem } from '../components/TransactionItem';

interface DashboardProps {
  transactions: Transaction[];
  wallets: Wallet[];
  userName: string;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onNavigate: (tab: string, additionalState?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  wallets,
  userName,
  onDeleteTransaction,
  onEditTransaction,
  onNavigate
}) => {
  const currentMonthYear = useMemo(() => formatMonthYear(new Date()), []);

  // Compute stats for current month
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        if (t.type === 'pemasukan') {
          income += t.amount;
        } else {
          expense += t.amount;
        }
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [transactions]);

  // Last 5 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Aggregate weekly expenses (last 7 days)
  const chartData = useMemo(() => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const result = [];
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Calculate expense for this specific day
      const dailyExpense = transactions
        .filter(t => t.type === 'pengeluaran' && t.date === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      result.push({
        dayName: days[d.getDay()],
        amount: dailyExpense,
        dateStr
      });
    }
    return result;
  }, [transactions]);

  return (
    <div className="pb-24 pt-4 px-4 w-full max-w-full md:max-w-none md:pb-6 space-y-6">
      {/* Header greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
            Halo, {userName || 'Put'} 👋
          </h2>
          <p className="text-xs text-slate-400 dark:text-emerald-400/50">{currentMonthYear}</p>
        </div>
        <button
          onClick={() => onNavigate('settings')}
          className="p-2 rounded-xl bg-slate-50 dark:bg-emerald-950/30 text-slate-500 dark:text-emerald-400 border border-slate-100/50 dark:border-emerald-900/20 active:scale-95 transition-all md:hidden"
          aria-label="Pengaturan"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Grid wrapper for balance card and quick actions on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prominent Net Balance Card (Spans 2 columns on desktop) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#052e16] to-[#16a34a] p-6 text-white shadow-xl shadow-emerald-900/10 md:col-span-2 flex flex-col justify-between min-h-[140px]">
          {/* Background bubbles */}
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/5 blur-xl"></div>
          <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-lg"></div>
          
          <div>
            <span className="text-xs text-emerald-200 font-semibold tracking-wider uppercase opacity-80">Saldo Bersih</span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-6">
              {formatRupiah(stats.balance)}
            </h1>
          </div>

          {/* Mini stats grid */}
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-emerald-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-200 block font-medium uppercase opacity-75">Pemasukan</span>
                <span className="text-xs font-bold">{formatRupiah(stats.income)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 border-l border-white/10 pl-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-rose-300">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-emerald-200 block font-medium uppercase opacity-75">Pengeluaran</span>
                <span className="text-xs font-bold">{formatRupiah(stats.expense)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons (Column on desktop) */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 h-full">
          <button
            onClick={() => onNavigate('add', { type: 'pemasukan' })}
            className="flex items-center justify-center md:flex-col md:justify-center md:space-y-2 space-x-2 py-3 md:py-6 bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors active:scale-95 duration-200 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold text-base">
              +
            </span>
            <span>Tambah Pemasukan</span>
          </button>
          <button
            onClick={() => onNavigate('add', { type: 'pengeluaran' })}
            className="flex items-center justify-center md:flex-col md:justify-center md:space-y-2 space-x-2 py-3 md:py-6 bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors active:scale-95 duration-200 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 font-bold text-base">
              -
            </span>
            <span>Tambah Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Wallets Summary List */}
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100">Kantong Keuangan</h3>
          <button
            onClick={() => onNavigate('wallet')}
            className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer border-none bg-transparent"
          >
            Kelola Dompet
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {wallets.slice(0, 4).map((w) => (
            <div
              key={w.id}
              onClick={() => onNavigate('wallet')}
              className="p-4 bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-2xl shadow-sm hover:scale-[1.01] transition-transform flex items-center space-x-2.5 cursor-pointer"
            >
              <span className="text-xl p-2 bg-slate-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center">
                {w.icon || '💳'}
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase block truncate">{w.name}</span>
                <span className="text-xs font-black text-slate-700 dark:text-emerald-50 block truncate">
                  {formatRupiah(w.balance || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid layout for analytics and history on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Expense Chart */}
        <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100">Grafik Pengeluaran Mingguan</h3>
            <span className="text-[10px] text-slate-400 dark:text-emerald-400/50 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              7 Hari Terakhir
            </span>
          </div>
          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis
                  dataKey="dayName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  formatter={(value: any) => [formatRupiah(value), 'Pengeluaran']}
                  labelFormatter={(label, items) => {
                    if (items && items[0]) {
                      return `Hari: ${items[0].payload.dayName}`;
                    }
                    return label;
                  }}
                  contentStyle={{
                    fontSize: '11px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    backgroundColor: '#052e16f0',
                    backdropFilter: 'blur(4px)',
                    padding: '8px 12px'
                  }}
                  itemStyle={{ color: '#4ade80', fontWeight: 'bold' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '2px' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.amount > 100000 ? '#e11d48' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100">Transaksi Terbaru</h3>
            <button
              onClick={() => onNavigate('history')}
              className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-0.5 flex-1 mt-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onDelete={onDeleteTransaction}
                  onEdit={onEditTransaction}
                />
              ))
            ) : (
              <div className="h-44 bg-white dark:bg-emerald-950/20 border border-dashed border-slate-200 dark:border-emerald-900/30 rounded-2xl p-6 flex items-center justify-center text-xs text-slate-400 dark:text-emerald-400/50">
                Belum ada transaksi. Tambah transaksi sekarang!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
