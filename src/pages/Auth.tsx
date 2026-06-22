import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, ShieldAlert, Wallet, ExternalLink } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../utils/firebase';

interface AuthPageProps {
  onAuthSuccess: () => void;
  onSkipAuth?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onSkipAuth }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Terjadi kesalahan saat otentikasi.';
      if (err.code === 'auth/email-already-in-use') errMsg = 'Email sudah digunakan.';
      else if (err.code === 'auth/weak-password') errMsg = 'Password terlalu lemah (min. 6 karakter).';
      else if (err.code === 'auth/invalid-credential') errMsg = 'Email atau password salah.';
      else if (err.code === 'auth/invalid-email') errMsg = 'Format email tidak valid.';
      else if (err.code === 'auth/unauthorized-domain') errMsg = 'auth/unauthorized-domain';
      else errMsg = err.message || errMsg;
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Gagal masuk dengan Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Proses masuk Google dibatalkan.';
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        errMsg = 'auth/unauthorized-domain';
      } else {
        errMsg = err.message || errMsg;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const isUnauthorizedDomainError = error === 'auth/unauthorized-domain';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#f8faf9] via-[#f0f9f4] to-[#e6f4ed] dark:from-[#010905] dark:via-[#02130a] dark:to-[#031d0f] p-4 relative overflow-hidden font-sans">
      
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none"
           style={{
             backgroundImage: `radial-gradient(circle at 1px 1px, #10b981 1.5px, transparent 0)`,
             backgroundSize: '32px 32px'
           }}>
      </div>

      {/* Decorative Abstract Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 filter blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/10 dark:bg-teal-500/5 filter blur-[90px] pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-[460px] bg-white/80 dark:bg-[#03160c]/90 backdrop-blur-xl border border-slate-200/50 dark:border-emerald-950/40 rounded-3xl p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 relative z-10">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-3">
            <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-emerald-50">
            FinanceVoice
          </h1>
          <p className="text-xs text-slate-500 dark:text-emerald-400/50 mt-1 max-w-[280px]">
            Pencatatan Keuangan Cepat dengan Suara & Pengelolaan Multi-Kantong Keuangan
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 dark:bg-emerald-950/30 p-1 rounded-2xl border border-slate-200/10 dark:border-emerald-900/10 mb-6">
          <button
            onClick={() => {
              setActiveTab('signin');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-white dark:bg-emerald-900 text-emerald-600 dark:text-emerald-100 shadow-sm'
                : 'text-slate-500 dark:text-emerald-400/50 hover:text-slate-700 dark:hover:text-emerald-300'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'signup'
                ? 'bg-white dark:bg-emerald-900 text-emerald-600 dark:text-emerald-100 shadow-sm'
                : 'text-slate-500 dark:text-emerald-400/50 hover:text-slate-700 dark:hover:text-emerald-300'
            }`}
          >
            Daftar
          </button>
        </div>

        {/* Error Notice Display */}
        {error && !isUnauthorizedDomainError && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/10 rounded-2xl p-4 flex items-start space-x-2 text-xs font-bold text-rose-600 dark:text-rose-400 mb-6">
            <ShieldAlert className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Firebase Unauthorized Domain Troubleshooting Card */}
        {isUnauthorizedDomainError && (
          <div className="bg-[#fffbeb] dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-5 mb-6 text-xs text-amber-800 dark:text-amber-300 space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <span>Domain Belum Diizinkan (OAuth)</span>
            </div>
            
            <p className="leading-relaxed">
              Domain <strong className="underline decoration-amber-500/50">fin-vox-kohl.vercel.app</strong> belum didaftarkan di setelan autentikasi Firebase Anda.
            </p>

            <div className="bg-white/60 dark:bg-black/30 rounded-xl p-3 space-y-2 text-[11px] border border-amber-100 dark:border-amber-950/30">
              <p className="font-bold mb-1">Langkah Penyelesaian:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Firebase Console <ExternalLink className="w-3 h-3 ml-0.5 inline" /></a></li>
                <li>Pilih proyek Anda, buka menu <span className="font-semibold text-slate-700 dark:text-slate-200">Authentication</span></li>
                <li>Pilih tab <span className="font-semibold text-slate-700 dark:text-slate-200">Settings</span> di bagian atas</li>
                <li>Klik <span className="font-semibold text-slate-700 dark:text-slate-200">Authorized domains</span> (Domain yang diizinkan)</li>
                <li>Pilih <span className="font-semibold text-slate-700 dark:text-slate-200">Add domain</span> dan ketik: <code>fin-vox-kohl.vercel.app</code></li>
                <li>Klik simpan, lalu muat ulang halaman ini untuk mencoba masuk kembali.</li>
              </ol>
            </div>

            <button 
              type="button"
              onClick={() => setError(null)} 
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 block text-right w-full transition-colors cursor-pointer"
            >
              Tutup Petunjuk
            </button>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider pl-1">
              Alamat Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-4 h-4 text-slate-400 dark:text-emerald-500/40" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/60 dark:bg-[#021f0f]/40 border border-slate-200/50 dark:border-emerald-900/30 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-[#021f0f]/60 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-emerald-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/40 uppercase tracking-wider pl-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-4 h-4 text-slate-400 dark:text-emerald-500/40" />
              <input
                type="password"
                required
                placeholder="Min. 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50/60 dark:bg-[#021f0f]/40 border border-slate-200/50 dark:border-emerald-900/30 rounded-2xl text-xs font-bold text-slate-700 dark:text-emerald-100 focus:outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-[#021f0f]/60 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400 dark:placeholder:text-emerald-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-emerald-950/40 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-500/10 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all cursor-pointer border-none"
          >
            {activeTab === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'Memproses...' : activeTab === 'signup' ? 'Daftar Sekarang' : 'Masuk Aplikasi'}</span>
          </button>
        </form>

        {/* Social Sign-in divider */}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-200/50 dark:border-emerald-900/10"></div>
          <span className="flex-shrink mx-3 text-[9px] font-black text-slate-400 dark:text-emerald-400/20 uppercase tracking-widest">
            Atau masuk dengan
          </span>
          <div className="flex-grow border-t border-slate-200/50 dark:border-emerald-900/10"></div>
        </div>

        {/* Google Sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 border border-slate-200 dark:border-emerald-900/20 bg-white dark:bg-emerald-950/10 text-slate-600 dark:text-emerald-100 hover:bg-slate-50 dark:hover:bg-emerald-950/20 hover:border-slate-300 dark:hover:border-emerald-900/30 font-bold text-xs rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
        >
          <svg className="w-4.5 h-4.5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Masuk dengan Google</span>
        </button>

        {onSkipAuth && (
          <button
            onClick={onSkipAuth}
            disabled={loading}
            className="w-full text-center text-xs font-bold text-slate-400 dark:text-emerald-400/40 py-2 hover:text-emerald-600 dark:hover:text-emerald-200 transition-colors cursor-pointer mt-4"
          >
            Masuk Tanpa Akun (Mode Lokal/Offline)
          </button>
        )}
      </div>
    </div>
  );
};
