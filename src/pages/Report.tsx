import React, { useState, useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { Transaction } from '../hooks/useTransactions';
import { formatRupiah, INDONESIAN_MONTHS } from '../utils/formatter';
import { CATEGORIES } from '../utils/nlpParser';

interface ReportProps {
  transactions: Transaction[];
}

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', 
  '#f97316', '#64748b', '#a855f7', '#6366f1'
];

export const Report: React.FC<ReportProps> = ({ transactions }) => {
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${d.getMonth()}-${d.getFullYear()}`;
  });

  // Unique list of month-years available in transactions
  const availableMonths = useMemo(() => {
    const months = new Map<string, { label: string; month: number; year: number }>();
    
    // Add current month in case it has no transactions yet
    const cur = new Date();
    const curKey = `${cur.getMonth()}-${cur.getFullYear()}`;
    const curLabel = cur.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    months.set(curKey, { label: curLabel, month: cur.getMonth(), year: cur.getFullYear() });

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getMonth()}-${d.getFullYear()}`;
        const label = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        months.set(key, { label, month: d.getMonth(), year: d.getFullYear() });
      }
    });

    return Array.from(months.entries()).sort((a, b) => {
      return b[1].year - a[1].year || b[1].month - a[1].month;
    });
  }, [transactions]);

  const activeMonthData = useMemo(() => {
    const [month, year] = selectedMonthYear.split('-').map(Number);
    return { month, year };
  }, [selectedMonthYear]);

  // Compute total Income, Expense, Savings for selected month
  const monthlyStats = useMemo(() => {
    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getMonth() === activeMonthData.month && d.getFullYear() === activeMonthData.year) {
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
      savings: income - expense
    };
  }, [transactions, activeMonthData]);

  // Compute previous month's total expense for automatic comparisons
  const previousMonthStats = useMemo(() => {
    let prevMonth = activeMonthData.month - 1;
    let prevYear = activeMonthData.year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) {
        if (t.type === 'pemasukan') {
          income += t.amount;
        } else {
          expense += t.amount;
        }
      }
    });

    return { income, expense };
  }, [transactions, activeMonthData]);

  // Aggregated category data for selected month (Expenses only)
  const categoryExpenses = useMemo(() => {
    const data: Record<string, number> = {};
    
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (
        t.type === 'pengeluaran' &&
        d.getMonth() === activeMonthData.month &&
        d.getFullYear() === activeMonthData.year
      ) {
        data[t.category] = (data[t.category] || 0) + t.amount;
      }
    });

    const list = Object.entries(data).map(([name, value]) => ({
      name,
      value
    }));

    // Sort descending by value
    return list.sort((a, b) => b.value - a.value);
  }, [transactions, activeMonthData]);

  // Calculate percentages
  const pieChartData = useMemo(() => {
    if (categoryExpenses.length === 0) return [];
    return categoryExpenses.map((c) => ({
      name: c.name,
      value: c.value
    }));
  }, [categoryExpenses]);

  // 6-Month historical trends (income vs expense)
  const trendData = useMemo(() => {
    const data = [];
    const daysName = INDONESIAN_MONTHS;
    
    // Last 6 calendar months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();

      let income = 0;
      let expense = 0;

      transactions.forEach((t) => {
        const tDate = new Date(t.date);
        if (tDate.getMonth() === m && tDate.getFullYear() === y) {
          if (t.type === 'pemasukan') {
            income += t.amount;
          } else {
            expense += t.amount;
          }
        }
      });

      data.push({
        monthName: daysName[m].slice(0, 3) + ' ' + String(y).slice(-2),
        Pemasukan: income,
        Pengeluaran: expense
      });
    }

    return data;
  }, [transactions]);

  // Generate automated financial insights
  const insights = useMemo(() => {
    const list = [];
    const { income, expense, savings } = monthlyStats;
    const { expense: prevExpense } = previousMonthStats;

    if (income === 0 && expense === 0) {
      return ['Belum ada data keuangan tercatat untuk bulan ini.'];
    }

    // Savings insight
    if (savings < 0) {
      list.push('⚠️ Pengeluaran Anda melebihi pemasukan bulan ini! Cobalah kurangi budget hiburan atau jajan.');
    } else if (income > 0 && savings / income >= 0.3) {
      list.push('🎉 Luar biasa! Anda berhasil menabung lebih dari 30% pendapatan bulan ini. Pertahankan!');
    } else {
      list.push('💡 Tabungan Anda berada dalam batas aman. Tingkatkan lagi di bulan berikutnya.');
    }

    // Expense comparisons (this month vs last month)
    if (prevExpense > 0) {
      const percentChange = ((expense - prevExpense) / prevExpense) * 100;
      if (percentChange > 0) {
        list.push(`📈 Pengeluaran belanja bulan ini naik ${Math.round(percentChange)}% dibanding bulan lalu.`);
      } else if (percentChange < 0) {
        list.push(`📉 Bagus! Pengeluaran Anda berhasil ditekan ${Math.round(Math.abs(percentChange))}% lebih rendah dari bulan lalu.`);
      }
    }

    // Largest category insight
    if (categoryExpenses.length > 0) {
      const largest = categoryExpenses[0];
      const largestPercent = expense > 0 ? Math.round((largest.value / expense) * 100) : 0;
      list.push(`🔥 Alokasi dana terbesar dialokasikan untuk "${largest.name}" (${largestPercent}% dari total pengeluaran).`);
    }

    return list;
  }, [monthlyStats, previousMonthStats, categoryExpenses]);

  return (
    <div className="pb-28 pt-4 px-4 max-w-[430px] mx-auto space-y-6">
      {/* Header Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
          Analisis Laporan
        </h2>
        <select
          value={selectedMonthYear}
          onChange={(e) => setSelectedMonthYear(e.target.value)}
          className="py-2 px-3 bg-white dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-900/20 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none"
        >
          {availableMonths.map(([key, data]) => (
            <option key={key} value={key}>
              {data.label}
            </option>
          ))}
        </select>
      </div>

      {/* Monthly Net Summary Grid (3 columns: in, out, net) */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-4 shadow-sm grid grid-cols-3 gap-2 text-center">
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">Pemasukan</span>
          <span className="text-xs font-extrabold text-emerald-500 block truncate">
            {formatRupiah(monthlyStats.income)}
          </span>
        </div>
        <div className="space-y-1 border-l border-slate-100 dark:border-emerald-950/20 px-1">
          <span className="text-[9px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">Pengeluaran</span>
          <span className="text-xs font-extrabold text-rose-500 block truncate">
            {formatRupiah(monthlyStats.expense)}
          </span>
        </div>
        <div className="space-y-1 border-l border-slate-100 dark:border-emerald-950/20 pl-1">
          <span className="text-[9px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">Tabungan</span>
          <span className={`text-xs font-extrabold block truncate ${monthlyStats.savings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatRupiah(monthlyStats.savings)}
          </span>
        </div>
      </div>

      {/* Expense Allocation Donut Chart */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-4 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100">Alokasi Pengeluaran</h3>
        
        {pieChartData.length > 0 ? (
          <div className="flex flex-col items-center justify-center">
            {/* Chart Area */}
            <div className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => formatRupiah(value)}
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
                    labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend Layout */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-2">
              {pieChartData.slice(0, 6).map((item, index) => {
                const total = monthlyStats.expense;
                const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                
                return (
                  <div key={item.name} className="flex items-center space-x-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></span>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-emerald-300 truncate">
                      {item.name} ({percentage}%)
                    </span>
                  </div>
                );
              })}
              {pieChartData.length > 6 && (
                <div className="text-[9px] text-slate-400 dark:text-emerald-400/40 italic flex items-center col-span-2 justify-center mt-1">
                  *Menampilkan 6 kategori pengeluaran terbesar
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center border border-dashed border-slate-200 dark:border-emerald-900/30 rounded-2xl text-xs text-slate-400 dark:text-emerald-400/40">
            Belum ada data pengeluaran di bulan ini.
          </div>
        )}
      </div>

      {/* 6-Month Income vs Expense Trend Line Chart */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-4 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100">Tren Pemasukan vs Pengeluaran</h3>
        
        <div className="w-full h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="monthName" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : `${v / 1000}rb`)}
                tick={{ fontSize: 9, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
               <Tooltip
                formatter={(v: any) => formatRupiah(v)}
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
                labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              <Line type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking of Categories */}
      {categoryExpenses.length > 0 && (
        <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100">Ranking Pengeluaran</h3>
          
          <div className="space-y-3.5">
            {categoryExpenses.map((cat, index) => {
              const total = monthlyStats.expense;
              const percent = total > 0 ? (cat.value / total) * 100 : 0;
              
              const catObj = CATEGORIES.find(c => c.name === cat.name);
              const emoji = catObj ? catObj.icon : '🍔';

              return (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="text-xs font-bold text-slate-400 dark:text-emerald-400/40 w-4">
                      #{index + 1}
                    </span>
                    <span className="text-lg flex-shrink-0">{emoji}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-emerald-100 block truncate">
                        {cat.name}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-emerald-400/40 block">
                        {Math.round(percent)}% dari total pengeluaran
                      </span>
                    </div>
                  </div>
                  
                  <span className="text-xs font-black text-slate-800 dark:text-emerald-50 pl-2">
                    {formatRupiah(cat.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Automated Financial Insights Card */}
      <div className="bg-[#f0fdf4] dark:bg-[#052e1620] border border-emerald-100 dark:border-emerald-950/50 rounded-3xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center space-x-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Rekomendasi & Analisis Keuangan</span>
        </h3>
        
        <div className="space-y-2">
          {insights.map((insight, index) => (
            <p key={index} className="text-xs text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed font-semibold">
              {insight}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
