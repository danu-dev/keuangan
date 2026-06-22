import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, Check, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { parseNotificationText } from '../utils/notificationParser';
import type { Wallet } from '../utils/db';
import { formatRupiah } from '../utils/formatter';

interface WalletPageProps {
  wallets: Wallet[];
  onAddWallet: (w: Omit<Wallet, 'id' | 'updatedAt' | 'deleted'>) => Promise<void>;
  onDeleteWallet: (id: string) => Promise<void>;
  onAddTransaction: (t: {
    type: 'pemasukan' | 'pengeluaran';
    amount: number;
    category: string;
    note: string;
    date: string;
    walletId: string;
  }) => Promise<any>;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  wallets,
  onAddWallet,
  onDeleteWallet,
  onAddTransaction
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'tunai' | 'bank' | 'emoney'>('tunai');
  const [initialBalance, setInitialBalance] = useState(0);
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon] = useState('💵');

  // Notification simulation state
  const [notificationText, setNotificationText] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const colors = [
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Purple', hex: '#8b5cf6' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Cyan', hex: '#06b6d4' }
  ];

  const icons = ['💵', '🏦', '📱', '🛍️', '💳', '💰', '💼', '🛒'];

  const handleSubmitWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await onAddWallet({
        name: name.trim(),
        type,
        initialBalance: Number(initialBalance) || 0,
        color,
        icon
      });
      setName('');
      setInitialBalance(0);
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleParseNotification = () => {
    setParseError(null);
    setParseResult(null);

    if (!notificationText.trim()) {
      setParseError('Silakan masukkan atau tempel teks notifikasi transaksi terlebih dahulu.');
      return;
    }

    const result = parseNotificationText(notificationText, wallets);
    if (!result) {
      setParseError('Format notifikasi tidak dikenali. Pastikan teks berisi nominal uang (Rp).');
      return;
    }

    setParseResult(result);
  };

  const handleConfirmAutoRecord = async () => {
    if (!parseResult) return;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await onAddTransaction({
        type: parseResult.type,
        amount: parseResult.amount,
        category: parseResult.category,
        note: parseResult.note,
        date: todayStr,
        walletId: parseResult.walletId
      });

      setShowSuccessToast(true);
      setNotificationText('');
      setParseResult(null);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } catch (err) {
      console.error('Failed to auto-record transaction:', err);
      setParseError('Gagal menyimpan transaksi otomatis.');
    }
  };

  // Mock template notifications for easy one-click testing
  const mockTemplates = [
    {
      label: 'Gopay Pembayaran',
      text: 'GOPAY: Pembayaran Rp 15.000 ke Kopi Kenangan berhasil.'
    },
    {
      label: 'Mandiri Masuk',
      text: 'M-banking Mandiri: Transfer masuk Rp 150.000 dr BUDI UTOMO.'
    },
    {
      label: 'ShopeePay Keluar',
      text: 'ShopeePay: Rp32.000 telah dibayarkan ke ALFAMART.'
    }
  ];

  return (
    <div className="pb-24 pt-4 px-4 w-full max-w-full md:max-w-none md:pb-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
            Kantong Keuangan & Dompet
          </h2>
          <p className="text-xs text-slate-400 dark:text-emerald-400/30">
            Kelola dana terpisah secara offline dan sinkronisasi realtime
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-xl shadow-sm transition-all active:scale-95 duration-200 cursor-pointer border-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Dompet</span>
        </button>
      </div>

      {/* Main Grid: Wallets List (Left) and Notification Receiver (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Wallets Grid (Spans 2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-emerald-400 pl-1 uppercase tracking-wider">
            Daftar Kantong Aktif
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wallets.map((w) => (
              <div
                key={w.id}
                className="relative overflow-hidden rounded-3xl p-5 text-white shadow-md flex flex-col justify-between min-h-[140px] transition-transform hover:scale-[1.01] duration-300"
                style={{
                  background: `linear-gradient(135deg, ${w.color}, ${w.color}dd)`,
                  boxShadow: `0 10px 20px -10px ${w.color}80`
                }}
              >
                {/* Visual Glow Bubbles */}
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
                <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-white/10 blur-lg"></div>

                <div className="flex justify-between items-start z-10">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl p-2 bg-white/20 rounded-2xl flex items-center justify-center">
                      {w.icon || '💳'}
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold opacity-95 tracking-wide">{w.name}</h4>
                      <span className="text-[8px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full block w-max mt-0.5">
                        {w.type === 'tunai' ? 'Tunai' : w.type === 'bank' ? 'Bank' : 'E-Wallet'}
                      </span>
                    </div>
                  </div>
                  {w.id !== 'w-tunai' && (
                    <button
                      onClick={() => onDeleteWallet(w.id)}
                      className="p-1.5 bg-white/10 hover:bg-rose-600/40 rounded-xl transition-all cursor-pointer border-none text-white/80 hover:text-white"
                      aria-label="Hapus Dompet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-4 z-10">
                  <span className="text-[10px] opacity-75 font-semibold block uppercase">Saldo Sekarang</span>
                  <span className="text-xl font-black tracking-tight block">
                    {formatRupiah(w.balance || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Auto-Notification Receiver Simulator */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-emerald-400 pl-1 uppercase tracking-wider">
            Simulasi Receiver Notifikasi (Auto-Record)
          </h3>

          <div className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-emerald-950/25 pb-2.5">
              <h4 className="text-xs font-black text-slate-700 dark:text-emerald-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>Tangkap Teks SMS / Notifikasi</span>
              </h4>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-emerald-400/30 leading-relaxed">
              Tempel teks pemberitahuan transaksi bank/SMS di sini. Sistem akan otomatis mendeteksi kantong, nominal, catatan, dan mencatatnya ke buku kas.
            </p>

            {/* Template Buttons */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Template Uji Coba:</span>
              <div className="flex flex-wrap gap-1.5">
                {mockTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNotificationText(t.text);
                      setParseResult(null);
                      setParseError(null);
                    }}
                    className="px-2 py-1.5 bg-slate-50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-slate-100 dark:border-emerald-900/10 rounded-xl text-[9px] font-bold text-slate-600 dark:text-emerald-300 transition-all cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Textarea input */}
            <div className="space-y-1.5">
              <textarea
                placeholder="Tempel SMS, misal: GOPAY: Pembayaran Rp 15.000 ke Tokopedia berhasil..."
                value={notificationText}
                onChange={(e) => setNotificationText(e.target.value)}
                rows={3}
                className="w-full p-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-semibold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {parseError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 rounded-xl text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-start space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            <button
              onClick={handleParseNotification}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95 transition-transform"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Analisis Notifikasi</span>
            </button>

            {/* Visual Parser Analysis Result card */}
            {parseResult && (
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/10 rounded-2xl space-y-3.5 animate-fade-in">
                <h5 className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest border-b border-emerald-100 dark:border-emerald-900/10 pb-1.5">
                  Hasil Deteksi AI Notifikasi
                </h5>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600 dark:text-emerald-300">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Tipe</span>
                    <span className={`font-extrabold ${parseResult.type === 'pemasukan' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {parseResult.type === 'pemasukan' ? 'Masuk (+)' : 'Keluar (-)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Nominal</span>
                    <span className="font-extrabold text-slate-800 dark:text-emerald-50">{formatRupiah(parseResult.amount)}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Dompet</span>
                    <span className="font-extrabold text-slate-800 dark:text-emerald-50">
                      {wallets.find(w => w.id === parseResult.walletId)?.name || 'Tunai'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Kategori</span>
                    <span className="font-extrabold text-slate-800 dark:text-emerald-50">{parseResult.category}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Catatan</span>
                    <span className="font-extrabold text-slate-800 dark:text-emerald-50 italic">"{parseResult.note}"</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmAutoRecord}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan & Catat Otomatis</span>
                </button>
              </div>
            )}

            {showSuccessToast && (
              <div className="p-3 bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 animate-pulse">
                <Check className="w-4 h-4" />
                <span>Transaksi otomatis berhasil dicatat!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Slide-up form to add new Wallet */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#03140b] rounded-3xl p-6 shadow-2xl border border-emerald-100/50 dark:border-emerald-950/20 space-y-4 animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-50 dark:border-emerald-950/10 pb-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>Tambah Kantong Baru</span>
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-xs font-bold text-rose-500 cursor-pointer border-none bg-transparent"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleSubmitWallet} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Nama Dompet / Rekening
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bank BCA, OVO, Dompet Harian..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Jenis Kantong
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 focus:outline-none"
                  >
                    <option value="tunai">Tunai / Cash</option>
                    <option value="bank">Rekening Bank</option>
                    <option value="emoney">E-Money / Dompet Digital</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Saldo Awal (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={initialBalance || ''}
                    onChange={(e) => setInitialBalance(Number(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">
                  Pilih Warna Aksen
                </label>
                <div className="flex space-x-2">
                  {colors.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className={`w-8 h-8 rounded-xl border-none cursor-pointer flex items-center justify-center transition-all ${
                        color === c.hex ? 'ring-2 ring-emerald-500 scale-110 shadow' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {color === c.hex && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">
                  Pilih Ikon Representatif
                </label>
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-thin">
                  {icons.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-9 h-9 rounded-xl border-none bg-slate-50 dark:bg-emerald-950/40 text-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all hover:scale-105 ${
                        icon === ic ? 'bg-emerald-100 dark:bg-emerald-900/60 ring-2 ring-emerald-500' : ''
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center space-x-1.5 shadow"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Dompet</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
