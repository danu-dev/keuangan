import React, { useState, useEffect } from 'react';
import { User, Download, Upload, Trash2, Wifi, Info, Award, QrCode, RefreshCw, Copy, Check, Link, LogOut, Cloud } from 'lucide-react';
import type { Transaction } from '../hooks/useTransactions';
import QRCode from 'qrcode';
import { auth } from '../utils/firebase';
import { signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

import type { Wallet } from '../utils/db';

interface SettingsProps {
  userName: string;
  setUserName: (name: string) => void;
  transactions: Transaction[];
  wallets: Wallet[];
  onImportData: (transactions: Transaction[], wallets: Wallet[], name: string) => void;
  onResetAllData: () => void;
  
  // Auth Props
  currentUser: FirebaseUser | null;
  onLoginClick: () => void;

  // Sync Props
  syncRoomId: string | null;
  syncStatus: 'idle' | 'syncing' | 'connected' | 'error' | 'disconnected';
  syncError: string | null;
  createSyncRoom: () => Promise<string>;
  joinSyncRoom: (roomId: string) => Promise<void>;
  disconnectSync: () => void;
}

export const SettingsPage: React.FC<SettingsProps> = ({
  userName,
  setUserName,
  transactions,
  wallets,
  onImportData,
  onResetAllData,
  
  currentUser,
  onLoginClick,

  syncRoomId,
  syncStatus,
  syncError,
  createSyncRoom,
  joinSyncRoom,
  disconnectSync
}) => {
  const [nameInput, setNameInput] = useState(userName);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // PWA installation triggers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  // Sync Input Code
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

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

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Generate QR Code when room ID changes
  useEffect(() => {
    if (syncRoomId) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('join', syncRoomId);
      
      QRCode.toDataURL(currentUrl.toString(), {
        width: 250,
        margin: 3,
        color: {
          dark: '#042f1a', // Deep forest/emerald
          light: '#ffffff'  // Pure white bg for maximum scan reliability
        }
      }, (error, url) => {
        if (error) {
          console.error('Error generating QR Code:', error);
        } else if (url) {
          setQrCodeUrl(url);
        }
      });
    } else {
      setQrCodeUrl('');
    }
  }, [syncRoomId]);



  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      alert('Nama profil berhasil disimpan!');
    }
  };

  const handleExportJSON = () => {
    const dataToExport = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      userName,
      transactions,
      wallets
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
          onImportData(parsed.transactions, parsed.wallets || [], parsed.userName || userName);
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
      'Apakah Anda yakin ingin menghapus seluruh data transaksi, kantong dompet, dan pengaturan profil Anda dari database lokal? Tindakan ini tidak dapat dibatalkan.'
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

  const handleLogout = async () => {
    const confirmLogout = window.confirm(
      'Apakah Anda yakin ingin keluar dari akun Anda? Data lokal Anda tetap tersimpan di IndexedDB.'
    );
    if (confirmLogout) {
      try {
        await signOut(auth);
        alert('Berhasil keluar akun.');
      } catch (err: any) {
        alert(`Gagal keluar: ${err.message}`);
      }
    }
  };

  // Sync Handlers
  const handleCreateRoom = async () => {
    if (!isOnline) {
      alert('Anda harus online untuk membuat ruang sinkronisasi.');
      return;
    }
    try {
      await createSyncRoom();
    } catch (err: any) {
      alert(`Gagal membuat ruang: ${err.message}`);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      alert('Anda harus online untuk bergabung dengan ruang sinkronisasi.');
      return;
    }
    if (!joinCodeInput.trim()) return;

    try {
      await joinSyncRoom(joinCodeInput.trim());
      setJoinCodeInput('');
      alert('Berhasil terhubung!');
    } catch (err: any) {
      alert(err.message || 'Gagal terhubung.');
    }
  };

  const copyToClipboard = () => {
    if (!syncRoomId) return;
    navigator.clipboard.writeText(syncRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pb-24 pt-4 px-4 w-full max-w-full md:max-w-3xl md:mx-auto md:pb-6 space-y-6">
      {/* Title */}
      <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
        Pengaturan
      </h2>

      {/* User Session Profile Card */}
      {currentUser ? (
        <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-emerald-500" />
              <span>Profil Pengguna (Cloud)</span>
            </h3>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Cloud Aktif</span>
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="bg-slate-50 dark:bg-emerald-950/20 rounded-2xl p-4 space-y-2 border border-slate-100/50 dark:border-emerald-900/10">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ID Pengguna / Email / HP</span>
              <span className="text-xs font-bold text-slate-700 dark:text-emerald-200 block truncate">
                {currentUser.email || currentUser.phoneNumber || currentUser.uid}
              </span>
            </div>

            {/* Display Name Edit Form */}
            <form onSubmit={handleSaveName} className="space-y-1.5 pt-2">
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
                  className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>

            <button
              onClick={handleLogout}
              className="w-full mt-3 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 border border-rose-100 dark:border-rose-900/20 active:scale-95 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-emerald-500" />
              <span>Profil Pengguna (Lokal)</span>
            </h3>
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              <span className="text-[10px] text-slate-500 dark:text-emerald-400/45 font-bold uppercase tracking-wider">Mode Offline</span>
            </span>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-emerald-400/30 leading-relaxed">
            Data saat ini disimpan lokal di browser. Masuk dengan akun Firebase untuk mencadangkan data secara otomatis ke database cloud agar aman.
          </p>

          {/* Login Button */}
          <button
            onClick={onLoginClick}
            type="button"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 active:scale-95 transition-transform cursor-pointer border-none"
          >
            <Cloud className="w-4 h-4" />
            <span>Masuk ke Akun Cloud</span>
          </button>

          {/* Profile Name Edit Form */}
          <form onSubmit={handleSaveName} className="space-y-1.5 pt-2 border-t border-slate-100/50 dark:border-emerald-950/20">
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
                className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 font-bold text-xs rounded-2xl active:scale-95 transition-transform cursor-pointer border-none"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Real-time Multi-device Sync Section */}
      {currentUser && (
        // Sync configuration for logged-in user
        <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
            <Cloud className="w-4 h-4 text-emerald-500" />
            <span>Sinkronisasi Cloud</span>
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-emerald-300">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
              <span className="font-bold">Aktif ({currentUser.email || 'Akun Cloud'})</span>
            </div>
            <button
              onClick={() => {
                signOut(auth).then(() => onResetAllData());
              }}
              className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-950/30 dark:hover:bg-rose-950/20 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              Keluar Akun
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-emerald-400/30 leading-relaxed">
            Data transaksi Anda dicadangkan secara otomatis dan aman di cloud. Data Anda akan tetap tersimpan secara lokal dan sinkron otomatis saat online.
          </p>
        </div>
      )}

      {/* Guest Room Sync code / Multi-device Sharing (Always visible so logged-in users can share to mobile without login) */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
          <QrCode className="w-4 h-4 text-emerald-500" />
          <span>Sinkronisasi Multi-Perangkat (Tanpa Akun / Tamu)</span>
        </h3>
        
        <p className="text-[10px] text-slate-400 dark:text-emerald-400/30 leading-relaxed">
          Hubungkan Laptop dan HP Anda untuk menyinkronkan catatan transaksi secara realtime tanpa mengetik sandi. Data tetap disimpan lokal di IndexedDB agar bisa diakses fully offline.
        </p>

          {syncRoomId ? (
            <div className="space-y-4 pt-2 border-t border-slate-50 dark:border-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      syncStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      syncStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}></span>
                  </span>
                  <span className="text-xs font-black text-slate-600 dark:text-emerald-300">
                    {syncStatus === 'connected' ? 'Tersambung (Realtime)' : 'Menghubungkan...'}
                  </span>
                </div>
                <button
                  onClick={disconnectSync}
                  className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-950/30 dark:hover:bg-rose-950/20 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Putuskan Koneksi
                </button>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-3 flex justify-between items-center border border-emerald-100/50 dark:border-emerald-900/10">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Kode Sinkronisasi</span>
                  <span className="text-sm font-black tracking-widest text-emerald-800 dark:text-emerald-300 uppercase">{syncRoomId}</span>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 bg-white dark:bg-emerald-900/30 rounded-xl hover:bg-slate-50 border border-slate-100 dark:border-emerald-950/10 text-slate-500 dark:text-emerald-300 active:scale-95 transition-transform cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-emerald-950/10 rounded-2xl border border-slate-100 dark:border-emerald-950/10 space-y-3">
                {qrCodeUrl && (
                  <div className="p-2 bg-white rounded-2xl border border-slate-200/60 dark:border-emerald-900/10 shadow-sm flex items-center justify-center">
                    <img src={qrCodeUrl} alt="Scan QR HP" className="w-[180px] h-[180px] block rounded-xl select-none" />
                  </div>
                )}
                <div className="text-center space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-emerald-400">Scan QR Code dengan Kamera HP</p>
                  <p className="text-[9px] text-slate-400 dark:text-emerald-400/40">Kamera HP akan membuka URL aplikasi ini dan otomatis menyambung.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-50 dark:border-emerald-950/20">
              <button
                onClick={handleCreateRoom}
                disabled={syncStatus === 'syncing'}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform cursor-pointer"
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                <span>Buat Ruang Sinkronisasi Baru</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-100 dark:border-emerald-950/20"></div>
                <span className="flex-shrink mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atau</span>
                <div className="flex-grow border-t border-slate-100 dark:border-emerald-950/20"></div>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="syncCode" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">
                    Masukkan Kode dari Perangkat Lain
                  </label>
                  <div className="flex space-x-2">
                    <input
                      id="syncCode"
                      type="text"
                      placeholder="Contoh: FV-A8B9C2"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 uppercase tracking-wider focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!joinCodeInput.trim() || syncStatus === 'syncing'}
                      className="px-4 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 font-bold text-xs rounded-2xl active:scale-95 transition-all cursor-pointer border-none"
                    >
                      Hubungkan
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {syncError && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 rounded-2xl p-3 text-[10px] font-bold text-rose-600 dark:text-rose-400">
              {syncError}
            </div>
          )}
        </div>

      {/* Data Operations */}
      <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
          <Info className="w-4 h-4 text-emerald-500" />
          <span>Manajemen Data</span>
        </h3>

        <p className="text-[10px] text-slate-400 dark:text-emerald-400/30 leading-relaxed">
          Semua transaksi disimpan secara aman di database browser IndexedDB lokal Anda. Anda dapat mengekspor atau mengimpor data secara manual menggunakan format JSON di bawah ini.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Export button */}
          <button
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#052e1620] hover:bg-slate-100 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs text-slate-700 dark:text-emerald-200 font-bold active:scale-95 transition-all duration-200 cursor-pointer"
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
          className="w-full mt-2 py-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 border border-rose-100 dark:border-rose-900/20 active:scale-95 transition-all cursor-pointer"
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
