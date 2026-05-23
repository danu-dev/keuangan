import React from 'react';
import { CATEGORIES } from '../utils/nlpParser';

interface CategoryGridProps {
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  typeFilter: 'pemasukan' | 'pengeluaran';
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
  typeFilter
}) => {
  const filteredCategories = CATEGORIES.filter(cat => cat.type === typeFilter);

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {filteredCategories.map((cat) => {
        const isSelected = selectedCategory === cat.name;
        
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.name)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 active:scale-95 cursor-pointer ${
              isSelected
                ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/15 scale-105'
                : 'bg-slate-50 dark:bg-emerald-950/20 border-slate-100 dark:border-emerald-900/10 hover:border-emerald-200 dark:hover:border-emerald-900/40 text-slate-600 dark:text-emerald-300'
            }`}
          >
            <span className={`text-2xl mb-1.5 transition-transform duration-300 ${isSelected ? 'scale-110 rotate-3' : ''}`}>
              {cat.icon}
            </span>
            <span className={`text-[10px] text-center font-bold leading-tight line-clamp-2 ${
              isSelected ? 'text-white font-extrabold' : 'text-slate-600 dark:text-emerald-300/80'
            }`}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
