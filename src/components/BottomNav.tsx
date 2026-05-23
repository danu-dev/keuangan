import React from 'react';
import { Home, Calendar, Plus, BarChart3, Wallet } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'history', label: 'Riwayat', icon: Calendar },
    { id: 'add', label: 'Tambah', icon: Plus, isCenter: true },
    { id: 'report', label: 'Laporan', icon: BarChart3 },
    { id: 'budget', label: 'Anggaran', icon: Wallet },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent px-4 pb-4 pointer-events-none">
      <div className="w-full max-w-[400px] h-16 bg-[#ffffffcc] dark:bg-[#052e16cc] backdrop-blur-xl border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl shadow-xl flex items-center justify-between px-4 pointer-events-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-950/50 ring-4 ring-[#f0fdf4] dark:ring-[#052e16]'
                    : 'bg-emerald-600 text-white shadow-emerald-700/20'
                }`}
                aria-label="Tambah Transaksi"
              >
                <Plus className={`w-7 h-7 transition-transform duration-300 ${isActive ? 'rotate-45' : ''}`} />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 text-emerald-800 dark:text-emerald-100 hover:text-emerald-500 transition-colors relative"
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 scale-105'
                    : 'bg-transparent text-emerald-700/70 dark:text-emerald-200/60'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-medium mt-0.5 transition-all duration-300 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-300 font-bold scale-105'
                    : 'text-emerald-700/60 dark:text-emerald-200/50'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
