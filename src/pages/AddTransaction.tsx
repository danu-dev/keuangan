import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, FileText, Check, AlertCircle, MessageSquare, Volume2, VolumeX, Play } from 'lucide-react';
import type { Transaction } from '../hooks/useTransactions';
import type { Budget } from '../hooks/useBudget';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { parseVoiceInput } from '../utils/nlpParser';
import { formatRupiah } from '../utils/formatter';
import { getCoachResponse, speakIndonesian, stopSpeaking } from '../utils/aiCoach';
import { MicButton } from '../components/MicButton';
import { CategoryGrid } from '../components/CategoryGrid';

interface AddTransactionProps {
  onAddTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onUpdateTransaction: (id: string, t: Partial<Transaction>) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  onNavigate: (tab: string) => void;
  initialType?: 'pemasukan' | 'pengeluaran';
  transactions: Transaction[];
  budgets: Budget[];
  userName: string;
}

export const AddTransaction: React.FC<AddTransactionProps> = ({
  onAddTransaction,
  onUpdateTransaction,
  editingTransaction,
  setEditingTransaction,
  onNavigate,
  initialType = 'pengeluaran',
  transactions,
  budgets,
  userName
}) => {
  // Dual Page Mode: 'record' (log manual/voice transactions) or 'coach' (Holographic Voice Coach)
  const [mode, setMode] = useState<'record' | 'coach'>('record');

  // FORM STATES (Mode: 'record')
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(type === 'pemasukan' ? 'Gaji' : 'Makan & Minum');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [liveTranscript, setLiveTranscript] = useState('');
  const [showVoiceSuccessAlert, setShowVoiceSuccessAlert] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // COACH STATES (Mode: 'coach')
  const [coachTranscript, setCoachTranscript] = useState('');
  const [coachAnswer, setCoachAnswer] = useState('Halo! Saya adalah **VoiceCoach AI**, pelatih keuangan suara pribadi Kakak.\n\nKetuk tombol mic di bawah, lalu ucapkan pertanyaan Kakak mengenai saldo, limit anggaran, atau rekomendasi tips hemat belanja!');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Prepopulate form if in edit mode
  useEffect(() => {
    if (editingTransaction) {
      setMode('record'); // Always open form when editing
      setType(editingTransaction.type);
      setAmountStr(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setNote(editingTransaction.note);
      setDate(editingTransaction.date);
    } else {
      setType(initialType);
      setCategory(initialType === 'pemasukan' ? 'Gaji' : 'Makan & Minum');
    }
  }, [editingTransaction, initialType]);

  // Prevent speech synth from running in background when component unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleTypeChange = (newType: 'pemasukan' | 'pengeluaran') => {
    setType(newType);
    setCategory(newType === 'pemasukan' ? 'Gaji' : 'Makan & Minum');
  };

  // 1. VOICE LOGIC FOR TRANSACTION RECORDING
  const handleVoiceResultTransaction = (finalTranscript: string) => {
    setLiveTranscript(finalTranscript);
    
    // Parse using our local Indonesian NLP engine
    const parsed = parseVoiceInput(finalTranscript);
    
    if (parsed.amount > 0) {
      setAmountStr(parsed.amount.toString());
    }
    
    setType(parsed.type);
    setCategory(parsed.category);
    setNote(parsed.note);
    setShowVoiceSuccessAlert(true);
    
    setTimeout(() => {
      setShowVoiceSuccessAlert(false);
    }, 5000);
  };

  const {
    isListening: isListeningForm,
    transcript: transcriptForm,
    error: voiceErrorForm,
    startListening: startListeningForm,
    stopListening: stopListeningForm
  } = useVoiceInput(handleVoiceResultTransaction);

  useEffect(() => {
    if (mode === 'record' && transcriptForm) {
      setLiveTranscript(transcriptForm);
    }
  }, [transcriptForm, mode]);

  // 2. VOICE LOGIC FOR HOLOGRAM COACH
  const handleVoiceResultCoach = (finalTranscript: string) => {
    setCoachTranscript(finalTranscript);
    
    // Query coach local reasoning engine
    const result = getCoachResponse(finalTranscript, transactions, budgets, userName);
    setCoachAnswer(result.answer);
    
    // Speak out loud!
    speakIndonesian(
      result.speechText,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const {
    isListening: isListeningCoach,
    transcript: transcriptCoach,
    error: voiceErrorCoach,
    startListening: startListeningCoach,
    stopListening: stopListeningCoach
  } = useVoiceInput(handleVoiceResultCoach);

  useEffect(() => {
    if (mode === 'coach' && transcriptCoach) {
      setCoachTranscript(transcriptCoach);
    }
  }, [transcriptCoach, mode]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Numbers only
    setAmountStr(value);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numericAmount = parseInt(amountStr, 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Nominal transaksi harus lebih dari Rp 0.');
      return;
    }

    if (!category) {
      setFormError('Pilih kategori transaksi.');
      return;
    }

    const transactionData = {
      type,
      amount: numericAmount,
      category,
      note: note.trim() || (type === 'pemasukan' ? `Pemasukan ${category}` : `Pengeluaran ${category}`),
      date
    };

    if (editingTransaction) {
      onUpdateTransaction(editingTransaction.id, transactionData);
      setEditingTransaction(null);
    } else {
      onAddTransaction(transactionData);
    }

    setAmountStr('');
    setNote('');
    onNavigate('dashboard');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    onNavigate('dashboard');
  };

  // Triggers one of the sample recommended chips
  const handleQuickQuestion = (questionText: string) => {
    setCoachTranscript(questionText);
    stopSpeaking();
    
    const result = getCoachResponse(questionText, transactions, budgets, userName);
    setCoachAnswer(result.answer);
    
    speakIndonesian(
      result.speechText,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleReplayCoach = () => {
    // Generate speech text and play again
    const result = getCoachResponse(coachTranscript || 'halo', transactions, budgets, userName);
    speakIndonesian(
      result.speechText,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleToggleMode = (targetMode: 'record' | 'coach') => {
    stopSpeaking();
    setIsSpeaking(false);
    setMode(targetMode);
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-[430px] mx-auto space-y-6">
      {/* Top Header & Cancel Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800 dark:text-emerald-50">
          {editingTransaction ? 'Edit Transaksi' : 'Menu Pencatatan & AI'}
        </h2>
        {editingTransaction && (
          <button
            onClick={handleCancelEdit}
            className="text-xs font-bold text-rose-500 cursor-pointer"
          >
            Batal
          </button>
        )}
      </div>

      {/* Mode Selector Tab Bar (Record Transaction vs Tanya AI Coach) */}
      {!editingTransaction && (
        <div className="flex bg-slate-50 dark:bg-emerald-950/30 p-1.5 rounded-2xl border border-slate-100 dark:border-emerald-900/10">
          <button
            type="button"
            onClick={() => handleToggleMode('record')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'record'
                ? 'bg-white dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Catat Transaksi</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode('coach')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'coach'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Tanya AI Coach 🎙️</span>
          </button>
        </div>
      )}

      {/* RENDER MODE: HOLOGRAM AI COACH */}
      {mode === 'coach' && !editingTransaction && (
        <div className="space-y-6 animate-fade-in">
          {/* Glowing Hologram Orb Box */}
          <div className="bg-[#021c0e] dark:bg-[#01140a] border border-emerald-950/50 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Background cyan/emerald glows */}
            <div className="absolute -left-12 -top-12 w-28 h-28 rounded-full bg-emerald-500/10 blur-xl"></div>
            <div className="absolute -right-12 -bottom-12 w-28 h-28 rounded-full bg-cyan-500/10 blur-xl"></div>

            {/* Glowing Hologram Orb representation */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className={`w-28 h-28 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-1 relative transition-all duration-500 flex items-center justify-center shadow-lg ${
                isListeningCoach ? 'animate-pulse scale-105 shadow-[0_0_35px_#10b98150]' : 
                isSpeaking ? 'animate-bounce shadow-[0_0_40px_#06b6d450]' : 'shadow-emerald-950/20'
              }`}>
                {/* Inside core */}
                <div className="absolute inset-1.5 bg-[#02130a] rounded-full flex flex-col items-center justify-center overflow-hidden border border-emerald-500/10">
                  {/* Dashed outer halo ring */}
                  <div className={`absolute inset-2 rounded-full border border-dashed border-emerald-400/25 ${
                    isListeningCoach ? 'animate-spin' : isSpeaking ? 'animate-pulse' : ''
                  }`} style={{ animationDuration: '8s' }}></div>
                  <MessageSquare className={`w-7 h-7 transition-colors duration-500 ${
                    isListeningCoach ? 'text-rose-400' : isSpeaking ? 'text-cyan-400' : 'text-emerald-400'
                  }`} />
                </div>
              </div>
            </div>

            {/* Voice controls and status indicators */}
            <MicButton
              isListening={isListeningCoach}
              onClick={isListeningCoach ? stopListeningCoach : startListeningCoach}
            />

            {voiceErrorCoach && (
              <div className="mt-1 p-2 bg-rose-950/40 border border-rose-900/30 rounded-xl text-[10px] text-rose-400 flex items-center justify-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{voiceErrorCoach}</span>
              </div>
            )}
          </div>

          {/* AI Response Panel */}
          <div className="bg-white dark:bg-[#052e1610] border border-slate-100 dark:border-emerald-950/20 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-emerald-950/20 pb-2">
              <h3 className="text-xs font-black text-slate-800 dark:text-emerald-100 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Jawaban Asisten AI</span>
              </h3>
              {coachTranscript && (
                <button
                  onClick={handleReplayCoach}
                  disabled={isListeningCoach}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    isSpeaking 
                      ? 'bg-cyan-50 dark:bg-cyan-950/20 text-cyan-500 animate-pulse' 
                      : 'bg-slate-50 dark:bg-emerald-950/20 text-slate-400 hover:text-emerald-500'
                  }`}
                  aria-label="Putar Suara Jawaban"
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            {/* Render query transcript bubble */}
            {coachTranscript && (
              <div className="p-3 bg-slate-50 dark:bg-emerald-950/20 border border-slate-100/60 dark:border-emerald-900/10 rounded-2xl">
                <span className="text-[9px] text-slate-400 font-bold block mb-0.5">Pertanyaan Anda:</span>
                <p className="text-xs font-bold text-slate-700 dark:text-emerald-200 italic">
                  "{coachTranscript}"
                </p>
              </div>
            )}

            {/* Answer Display supporting formatting markdown highlights */}
            <div className="text-xs text-slate-600 dark:text-emerald-100 leading-relaxed font-semibold whitespace-pre-wrap">
              {coachAnswer.split('\n').map((line, index) => {
                // Formatting helper for custom inline markdown bold **
                const parts = line.split('**');
                return (
                  <p key={index} className={line.startsWith('💡') || line.startsWith('⚠️') || line.startsWith('✅') || line.startsWith('❌') ? 'mt-2.5 pl-1 border-l-2 border-emerald-400' : 'mt-1'}>
                    {parts.map((part, partIndex) => (
                      partIndex % 2 === 1 
                        ? <strong key={partIndex} className="text-emerald-600 dark:text-emerald-300 font-black">{part}</strong> 
                        : part
                    ))}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Quick Command Suggestions Chips Grid */}
          <div className="space-y-2.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1 block">
              Saran Pertanyaan Suara (Ketuk Untuk Bertanya):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickQuestion('Berapa saldo saya')}
                className="p-3 bg-white dark:bg-[#052e1610] hover:bg-slate-50 dark:hover:bg-[#052e1630] border border-slate-100 dark:border-emerald-950/20 rounded-2xl text-[10px] text-left font-bold text-slate-600 dark:text-emerald-200 shadow-sm active:scale-95 transition-transform flex items-center space-x-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                <span>Berapa saldo saya?</span>
              </button>
              <button
                onClick={() => handleQuickQuestion('Beri tips hemat')}
                className="p-3 bg-white dark:bg-[#052e1610] hover:bg-slate-50 dark:hover:bg-[#052e1630] border border-slate-100 dark:border-emerald-950/20 rounded-2xl text-[10px] text-left font-bold text-slate-600 dark:text-emerald-200 shadow-sm active:scale-95 transition-transform flex items-center space-x-1.5 cursor-pointer"
              >
                <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                <span>Beri tips hemat</span>
              </button>
              <button
                onClick={() => handleQuickQuestion('Bagaimana status anggaran saya')}
                className="p-3 bg-white dark:bg-[#052e1610] hover:bg-slate-50 dark:hover:bg-[#052e1630] border border-slate-100 dark:border-emerald-950/20 rounded-2xl text-[10px] text-left font-bold text-slate-600 dark:text-emerald-200 shadow-sm active:scale-95 transition-transform flex items-center space-x-1.5 cursor-pointer col-span-2"
              >
                <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                <span>Bagaimana sisa limit anggaran saya?</span>
              </button>
              <button
                onClick={() => handleQuickQuestion('Bisa beli baju harga seratus lima puluh ribu')}
                className="p-3 bg-white dark:bg-[#052e1610] hover:bg-slate-50 dark:hover:bg-[#052e1630] border border-slate-100 dark:border-emerald-950/20 rounded-2xl text-[10px] text-left font-bold text-slate-600 dark:text-emerald-200 shadow-sm active:scale-95 transition-transform flex items-center space-x-1.5 cursor-pointer col-span-2"
              >
                <Play className="w-3 h-3 text-emerald-500 fill-emerald-500 animate-pulse" />
                <span>Bisa beli barang seharga 150rb?</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER MODE: STANDARD TRANSACTION RECORDING FORM */}
      {mode === 'record' && (
        <div className="space-y-6">
          {/* Voice Input Section (Only when creating new) */}
          {!editingTransaction && (
            <div className="bg-slate-50 dark:bg-emerald-950/20 border border-slate-100 dark:border-emerald-900/30 rounded-3xl p-5 shadow-sm text-center relative overflow-hidden">
              <div className="absolute right-3 top-3 text-emerald-500/20">
                <Sparkles className="w-8 h-8" />
              </div>

              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center space-x-1">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Pencatatan Instan dengan Suara</span>
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-emerald-400/40 mt-1 max-w-[280px] mx-auto">
                Cukup ucapkan transaksi Anda (misal: "beli kopi dua puluh ribu") dalam Bahasa Indonesia.
              </p>

              {/* Glowing Voice Button */}
              <MicButton
                isListening={isListeningForm}
                onClick={isListeningForm ? stopListeningForm : startListeningForm}
              />

              {voiceErrorForm && (
                <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-xl text-[10px] text-rose-500 flex items-center justify-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{voiceErrorForm}</span>
                </div>
              )}

              {/* Speech Transcription Viewer */}
              {liveTranscript && (
                <div className="mt-4 p-3 bg-white dark:bg-emerald-950/40 border border-slate-100 dark:border-emerald-900/30 rounded-2xl shadow-sm text-left">
                  <span className="text-[9px] text-slate-400 dark:text-emerald-400/40 block font-bold tracking-wider uppercase mb-1">
                    Hasil Transkripsi Suara:
                  </span>
                  <p className="text-xs font-medium text-slate-700 dark:text-emerald-100 italic">
                    "{liveTranscript}"
                  </p>
                </div>
              )}

              {/* Voice NLP parsed confirmation toast */}
              {showVoiceSuccessAlert && (
                <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/55 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center space-x-1.5 justify-center animate-bounce">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>NLP berhasil mengisi formulir di bawah secara otomatis!</span>
                </div>
              )}
            </div>
          )}

          {/* Manual Input form */}
          <form onSubmit={handleSave} className="bg-white dark:bg-[#052e1610] dark:border dark:border-emerald-950/20 border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5">
            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-xs text-rose-600 flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Pemasukan / Pengeluaran Type Selector */}
            <div className="flex bg-slate-50 dark:bg-emerald-950/30 p-1.5 rounded-2xl border border-slate-100 dark:border-emerald-900/10">
              <button
                type="button"
                onClick={() => handleTypeChange('pengeluaran')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
                  type === 'pengeluaran'
                    ? 'bg-white dark:bg-emerald-950 text-slate-800 dark:text-emerald-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('pemasukan')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer ${
                  type === 'pemasukan'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-500'
                }`}
              >
                Pemasukan
              </button>
            </div>

            {/* Nominal / Amount Input */}
            <div className="space-y-1.5">
              <label htmlFor="amount" className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">
                Nominal Transaksi (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-extrabold text-slate-400 dark:text-emerald-400/40">
                  Rp
                </span>
                <input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountStr ? parseInt(amountStr, 10).toLocaleString('id-ID') : ''}
                  onChange={handleAmountChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-base font-black text-slate-800 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              {amountStr && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold italic pl-1">
                  Terbaca: {formatRupiah(parseInt(amountStr, 10))}
                </span>
              )}
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">
                Kategori
              </label>
              <CategoryGrid
                selectedCategory={category}
                onSelectCategory={setCategory}
                typeFilter={type}
              />
            </div>

            {/* Note / Catatan Input */}
            <div className="space-y-1.5">
              <label htmlFor="note" className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">
                Catatan
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400 dark:text-emerald-400/30">
                  <FileText className="w-4 h-4" />
                </span>
                <input
                  id="note"
                  type="text"
                  placeholder="Deskripsi transaksi (opsional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-semibold text-slate-800 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Date picker */}
            <div className="space-y-1.5">
              <label htmlFor="date" className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider block">
                Tanggal
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400 dark:text-emerald-400/30">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-emerald-950/30 border border-slate-100 dark:border-emerald-900/20 rounded-2xl text-xs font-semibold text-slate-800 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-lg shadow-emerald-500/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
            >
              {editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
