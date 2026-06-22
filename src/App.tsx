import { useState, useEffect } from 'react';
import { useTransactions } from './hooks/useTransactions';
import type { Transaction } from './hooks/useTransactions';
import { useWallets } from './hooks/useWallets';
import { BottomNav } from './components/BottomNav';
import { Home, Calendar, Plus, BarChart3, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { AddTransaction } from './pages/AddTransaction';
import { History } from './pages/History';
import { Report } from './pages/Report';
import { WalletPage } from './pages/Wallet';
import { SettingsPage } from './pages/Settings';
import { AuthPage } from './pages/Auth';
import { useSync } from './hooks/useSync';
import { clearLocalDatabase, notifyDBUpdated } from './utils/db';
import { auth } from './utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('fv_userName') || 'Put';
  });
  
  // Custom navigation parameters (e.g. initialType when pressing Pemasukan/Pengeluaran quick action)
  const [navParams, setNavParams] = useState<any>(null);

  // Core business logic hooks
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions
  } = useTransactions();

  const {
    wallets,
    addWallet,
    deleteWallet,
    importWallets
  } = useWallets(transactions);

  // Sync hook
  const {
    currentUser,
    syncRoomId,
    syncStatus,
    syncError,
    createSyncRoom,
    joinSyncRoom,
    disconnectSync
  } = useSync(userName, setUserName);

  // Track Guest Mode to allow local offline usage without logging in
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    return localStorage.getItem('fv_guestMode') === 'true';
  });

  // Active editing transaction state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Listen to Auth State to coordinate guestMode flag
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem('fv_guestMode', 'false');
        setGuestMode(false);
      } else {
        // If not logged in, only force login if fv_guestMode is explicitly false
        const isGuest = localStorage.getItem('fv_guestMode') === 'true';
        setGuestMode(isGuest);
      }
    });
    return () => unsubscribe();
  }, []);

  // Check URL query parameters for auto-joining sync room (QR code scan direct access)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      // Clean URL search parameters to keep interface neat
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Auto bypass login screen by entering guest sync mode
      localStorage.setItem('fv_guestMode', 'true');
      setGuestMode(true);

      joinSyncRoom(joinCode)
        .then(() => {
          alert(`Berhasil tersambung ke ruang sinkronisasi: ${joinCode}`);
          setActiveTab('settings');
        })
        .catch((err: any) => {
          alert(`Gagal menyambung otomatis: ${err.message}`);
        });
    }
  }, []);

  // Persist username changes
  useEffect(() => {
    localStorage.setItem('fv_userName', userName);
  }, [userName]);

  // Smoothly remove splash screen after React mounts
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      const timer = setTimeout(() => {
        splash.remove();
      }, 400); // matches transition duration in CSS
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNavigate = (tab: string, params?: any) => {
    setActiveTab(tab);
    setNavParams(params || null);
  };

  const handleEditTransactionClick = (t: Transaction) => {
    setEditingTransaction(t);
    setActiveTab('add');
  };

  const handleImportAllData = (importedTransactions: Transaction[], importedWallets: any[], importedName: string) => {
    importTransactions(importedTransactions);
    importWallets(importedWallets);
    setUserName(importedName);
  };

  const handleResetAllData = async () => {
    await clearLocalDatabase();
    disconnectSync();
    setUserName('Put');
    notifyDBUpdated();
  };

  const handleSkipAuth = () => {
    localStorage.setItem('fv_guestMode', 'true');
    setGuestMode(true);
  };

  const handleLoginClick = () => {
    localStorage.setItem('fv_guestMode', 'false');
    setGuestMode(false);
  };

  // If user is not authenticated and not in guest mode, show the Login/Auth screen
  if (!currentUser && !guestMode) {
    return <AuthPage onAuthSuccess={() => setGuestMode(false)} onSkipAuth={handleSkipAuth} />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            transactions={transactions}
            wallets={wallets}
            userName={userName}
            onDeleteTransaction={deleteTransaction}
            onEditTransaction={handleEditTransactionClick}
            onNavigate={handleNavigate}
          />
        );
      case 'add':
        return (
          <AddTransaction
            onAddTransaction={addTransaction}
            onUpdateTransaction={updateTransaction}
            editingTransaction={editingTransaction}
            setEditingTransaction={setEditingTransaction}
            onNavigate={handleNavigate}
            initialType={navParams?.type || 'pengeluaran'}
            transactions={transactions}
            wallets={wallets}
            userName={userName}
          />
        );
      case 'history':
        return (
          <History
            transactions={transactions}
            onDeleteTransaction={deleteTransaction}
            onEditTransaction={handleEditTransactionClick}
          />
        );
      case 'report':
        return <Report transactions={transactions} />;
      case 'wallet':
        return (
          <WalletPage
            wallets={wallets}
            onAddWallet={addWallet}
            onDeleteWallet={deleteWallet}
            onAddTransaction={addTransaction}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            userName={userName}
            setUserName={setUserName}
            transactions={transactions}
            wallets={wallets}
            onImportData={handleImportAllData}
            onResetAllData={handleResetAllData}
            currentUser={currentUser}
            onLoginClick={handleLoginClick}
            syncRoomId={syncRoomId}
            syncStatus={syncStatus}
            syncError={syncError}
            createSyncRoom={createSyncRoom}
            joinSyncRoom={joinSyncRoom}
            disconnectSync={disconnectSync}
          />
        );
      default:
        return (
          <Dashboard
            transactions={transactions}
            wallets={wallets}
            userName={userName}
            onDeleteTransaction={deleteTransaction}
            onEditTransaction={handleEditTransactionClick}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fefb] dark:bg-[#03140b] text-slate-800 dark:text-emerald-100 font-sans flex flex-col">
      {/* Responsive Shell wrapper - Full Screen on Desktop */}
      <div className="w-full flex-1 flex flex-col md:flex-row pb-16 md:pb-0 min-h-screen">
        
        {/* Left Sidebar Navigation (Desktop only) */}
        <aside className="hidden md:flex flex-col w-[260px] bg-white dark:bg-[#041c0f]/50 border-r border-emerald-100/50 dark:border-emerald-950/30 p-6 justify-between flex-shrink-0">
          <div className="space-y-8">
            {/* Header / Logo */}
            <div className="flex items-center space-x-3 px-2">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20 font-black text-lg">
                $
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-800 dark:text-emerald-50 tracking-tight">
                  FinanceVoice
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-emerald-400/30">
                  Voice-First Ledger
                </p>
              </div>
            </div>

            {/* Nav Menu Links */}
            <nav className="space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Home },
                { id: 'history', label: 'Riwayat', icon: Calendar },
                { id: 'add', label: 'Tambah Baru', icon: Plus },
                { id: 'report', label: 'Laporan', icon: BarChart3 },
                { id: 'wallet', label: 'Kantong Uang', icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavigate(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'text-slate-500 dark:text-emerald-400/60 hover:bg-slate-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Settings Link */}
          <div>
            <button
              onClick={() => handleNavigate('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'text-slate-500 dark:text-emerald-400/60 hover:bg-slate-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-300'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Pengaturan</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto md:p-6 lg:p-8">
          {renderActivePage()}
        </main>

        {/* Global Bottom Navigation bar */}
        <BottomNav activeTab={activeTab} setActiveTab={handleNavigate} />
        
      </div>
    </div>
  );
}

export default App;
