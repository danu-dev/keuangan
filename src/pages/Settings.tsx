import React, { useState, useEffect } from 'react';
import { User, Download, Upload, Trash2, Wifi, Info, Award } from 'lucide-react';
import type { Transaction } from '../hooks/useTransactions';
import type { Budget } from '../hooks/useBudget';

interface SettingsProps {
  userName: string;
  setUserName: (name: string) => void;
  transactions: Transaction[];
  budgets: Budget[];
  onImportData: (transactions: Transaction[], budgets: Budget[], name: string) => void;
  onResetAllData: () => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({
  userName,
  setUserName,
  transactions,
  budgets,
  onImportData,
  onResetAllData
}) => {
  const [nameInput, setNameInput] = useState(userName);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // PWA installation triggers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  useEffect(() => {
    setNameInput(userName);
  }, [userName]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to PWA installation events
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Detect if already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
    }
  };

  const handleExportJSON = () => {
    const dataToExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userName,
      transactions,
      budgets
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FinanceVoice_Export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.transactions && Array.isArray(parsed.transactions)) {
          onImportData(parsed.transactions, parsed.budgets || [], parsed.userName || userName);
          alert('Data berhasil diimpor!');
        } else {
          alert('Format berkas tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca berkas JSON.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  const handleResetData = () => {
    const confirmReset = window.confirm(
      'Apakah Anda yakin ingin menghapus seluruh data transaksi, anggaran, dan pengaturan profil Anda? Tindakan ini tidak dapat dibatalkan.'
    );
    if (confirmReset) {
      onResetAllData();
      setNameInput('Put');
      alert('Seluruh data berhasil dibersihkan.');
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsPWAInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-[430px] mx-auto space-y-6">
      {/* Title */}
      <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
        Pengaturan
      </h2>

      {/* Profil Name Form */}
      <form onSubmit={handleSaveName} className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
          <User className="w-4 h-4 text-emerald-500" />
          <span>Profil Pengguna</span>
        </h3>

        <div className="space-y-1.5">
          <label htmlFor="settingsName" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">
            Nama Panggilan
          </label>
          <div className="flex space-x-2">
            <input
              id="settingsName"
              type="text"
              placeholder="Masukkan nama..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl active:scale-95 transition-transform"
            >
              Simpan
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-emerald-950/20 flex justify-between items-center text-xs">
          <span className="text-slate-400 dark:text-emerald-400/40">Mata Uang Default</span>
          <span className="font-extrabold text-slate-700 dark:text-emerald-200">IDR (Rupiah)</span>
        </div>
      </form>

      {/* Data Operations */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
          <Info className="w-4 h-4 text-emerald-500" />
          <span>Manajemen Data</span>
        </h3>

        <p className="text-[10px] text-slate-400 dark:text-emerald-400/30">
          Aplikasi ini beroperasi sepenuhnya offline. Data Anda disimpan secara aman di perangkat lokal Anda.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Export button */}
          <button
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#052e1620] hover:bg-slate-100 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs text-slate-700 dark:text-emerald-200 font-bold active:scale-95 transition-all duration-200"
          >
            <Download className="w-5 h-5 text-emerald-500 mb-2" />
            <span>Ekspor JSON</span>
          </button>

          {/* Import button */}
          <label className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#052e1620] hover:bg-slate-100 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs text-slate-700 dark:text-emerald-200 font-bold active:scale-95 transition-all duration-200 cursor-pointer">
            <Upload className="w-5 h-5 text-emerald-500 mb-2" />
            <span>Impor JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>

        {/* Clear Data button */}
        <button
          onClick={handleResetData}
          className="w-full mt-2 py-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 border border-rose-100 dark:border-rose-900/20 active:scale-95 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Reset Semua Data Keuangan</span>
        </button>
      </div>

      {/* About Section & PWA Installation */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
          <Award className="w-4 h-4 text-emerald-500" />
          <span>Tentang FinanceVoice</span>
        </h3>

        <div className="space-y-3.5 pt-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 dark:text-emerald-400/40">Versi Aplikasi</span>
            <span className="font-extrabold text-slate-700 dark:text-emerald-200">v1.0 (PWA)</span>
          </div>

          <div className="flex justify-between items-center border-t border-slate-50 dark:border-emerald-950/20 pt-3">
            <span className="text-slate-400 dark:text-emerald-400/40">Konektivitas</span>
            <span className="font-extrabold flex items-center">
              <Wifi className={`w-3.5 h-3.5 mr-1 ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`} />
              <span className={isOnline ? 'text-emerald-600' : 'text-slate-500'}>
                {isOnline ? 'Online' : 'Offline Mode'}
              </span>
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-slate-50 dark:border-emerald-950/20 pt-3">
            <span className="text-slate-400 dark:text-emerald-400/40">PWA Terinstall</span>
            <span className={`font-extrabold ${isPWAInstalled ? 'text-emerald-600' : 'text-slate-500'}`}>
              {isPWAInstalled ? 'Aktif ✅' : 'Belum Terinstall ❌'}
            </span>
          </div>
        </div>

        {/* PWA Install Trigger button if installable */}
        {isInstallable && (
          <button
            onClick={handleInstallPWA}
            className="w-full mt-3 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer"
          >
            Pasang Aplikasi Ke HP
          </button>
        )}
      </div>
    </div>
  );
};
