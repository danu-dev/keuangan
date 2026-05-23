import { useState, useEffect } from 'react';
import { useTransactions } from './hooks/useTransactions';
import type { Transaction } from './hooks/useTransactions';
import { useBudget } from './hooks/useBudget';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { AddTransaction } from './pages/AddTransaction';
import { History } from './pages/History';
import { Report } from './pages/Report';
import { BudgetPage } from './pages/Budget';
import { SettingsPage } from './pages/Settings';

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
    resetTransactions,
    importTransactions
  } = useTransactions();

  const {
    budgets,
    setCategoryBudget,
    resetBudgets,
    importBudgets
  } = useBudget();

  // Active editing transaction state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  

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



  const handleImportAllData = (importedTransactions: Transaction[], importedBudgets: any[], importedName: string) => {
    importTransactions(importedTransactions);
    importBudgets(importedBudgets);
    setUserName(importedName);
  };

  const handleResetAllData = () => {
    resetTransactions();
    resetBudgets();
    setUserName('Put');
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            transactions={transactions}
            budgets={budgets}
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
            budgets={budgets}
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
      case 'budget':
        return (
          <BudgetPage
            budgets={budgets}
            transactions={transactions}
            onSetBudget={setCategoryBudget}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            userName={userName}
            setUserName={setUserName}
            transactions={transactions}
            budgets={budgets}
            onImportData={handleImportAllData}
            onResetAllData={handleResetAllData}
          />
        );
      default:
        return (
          <Dashboard
            transactions={transactions}
            budgets={budgets}
            userName={userName}
            onDeleteTransaction={deleteTransaction}
            onEditTransaction={handleEditTransactionClick}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f0fdf4] text-slate-800 dark:bg-[#02130a] dark:text-emerald-100 font-sans flex flex-col items-center">
      {/* PWA Mobile Shell frame wrapper */}
      <div className="w-full max-w-[430px] min-h-screen bg-[#f9fefb] dark:bg-[#03140b] shadow-2xl relative flex flex-col pb-16">
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden">
          {renderActivePage()}
        </main>

        {/* Global Bottom Navigation bar */}
        <BottomNav activeTab={activeTab} setActiveTab={handleNavigate} />
        

      </div>
    </div>
  );
}

export default App;
