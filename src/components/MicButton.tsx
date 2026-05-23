import React from 'react';
import { Mic } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({ isListening, onClick, disabled }) => {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative">
        {/* Ripples when listening */}
        {isListening && (
          <>
            <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-40"></div>
            <div className="absolute -inset-4 rounded-full border-2 border-rose-400 animate-pulse opacity-30"></div>
            <div className="absolute -inset-8 rounded-full border border-rose-300 animate-pulse opacity-10"></div>
          </>
        )}

        {/* Outer glowing border for branding */}
        {!isListening && (
          <div className="absolute -inset-2 rounded-full bg-emerald-400/20 dark:bg-emerald-500/10 blur-md animate-pulse"></div>
        )}

        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-xl border-4 transition-all duration-500 active:scale-90 ${
            isListening
              ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-100 hover:scale-105'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-100 dark:border-emerald-950 hover:scale-105'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={isListening ? 'Berhenti Merekam' : 'Mulai Merekam'}
        >
          {isListening ? (
            <Mic className="w-10 h-10 animate-bounce" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>
      </div>

      <p className={`text-xs font-semibold mt-4 transition-colors duration-300 ${
        isListening ? 'text-rose-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'
      }`}>
        {isListening ? 'Sedang mendengar... Bicara sekarang!' : 'Tekan Mic & Bicara Transaksi'}
      </p>
      
      {!isListening && (
        <span className="text-[10px] text-emerald-800/40 dark:text-emerald-100/30 mt-1">
          Contoh: "Beli bakso dua puluh lima ribu"
        </span>
      )}
    </div>
  );
};
