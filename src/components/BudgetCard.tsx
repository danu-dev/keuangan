import React from 'react';
import { Edit2, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '../utils/formatter';
import { CATEGORIES } from '../utils/nlpParser';

interface BudgetCardProps {
  category: string;
  limit: number;
  spent: number;
  onEdit: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ category, limit, spent, onEdit }) => {
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const rawPercentage = limit > 0 ? (spent / limit) * 100 : 0;
  
  const getStatusColor = () => {
    if (rawPercentage >= 100) return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30';
    if (rawPercentage >= 70) return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30';
    return 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30';
  };

  const getProgressColor = () => {
    if (rawPercentage >= 100) return 'bg-rose-500';
    if (rawPercentage >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusLabel = () => {
    if (rawPercentage >= 100) return 'Melebihi Budget';
    if (rawPercentage >= 70) return 'Hampir Habis';
    return 'Aman';
  };

  const getStatusIcon = () => {
    if (rawPercentage >= 100) return <AlertCircle className="w-3.5 h-3.5 mr-1" />;
    if (rawPercentage >= 70) return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
    return <CheckCircle className="w-3.5 h-3.5 mr-1" />;
  };

  // Find category emoji
  const catObj = CATEGORIES.find(c => c.name === category);
  const emoji = catObj ? catObj.icon : '💰';

  return (
    <div className="bg-white dark:bg-[#052e1620] dark:border dark:border-emerald-900/20 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-xl">
            {emoji}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-emerald-100">{category}</h4>
            <span className="text-xs text-slate-400 dark:text-emerald-400/50">Anggaran Bulanan</span>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-emerald-900/20 text-slate-400 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
          aria-label={`Edit anggaran ${category}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div className="text-xs font-semibold text-slate-700 dark:text-emerald-200">
            {formatRupiah(spent)} <span className="text-[10px] text-slate-400 dark:text-emerald-400/40 font-normal">terpakai</span>
          </div>
          <div className="text-xs text-slate-400 dark:text-emerald-400/40 font-medium">
            dari {formatRupiah(limit)}
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-emerald-950/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center border ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusLabel()}
          </span>
          <span className={`text-xs font-semibold ${rawPercentage >= 90 ? 'text-rose-500' : 'text-slate-500'}`}>
            {Math.round(rawPercentage)}%
          </span>
        </div>
      </div>
    </div>
  );
};
