import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#022c1070] dark:bg-[#000000a0] backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Sheet Container */}
      <div
        className="relative w-full max-w-[430px] bg-white dark:bg-[#031c0e] border-t border-emerald-100/50 dark:border-emerald-950/40 sm:border sm:rounded-3xl rounded-t-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-slide-up sm:animate-fade-in"
        role="dialog"
        aria-modal="true"
      >
        {/* Pull Handle (Mobile) */}
        <div className="flex justify-center py-2 sm:hidden">
          <div className="w-12 h-1 bg-slate-200 dark:bg-emerald-950 rounded-full"></div>
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-2 sm:pt-4 border-b border-slate-100 dark:border-emerald-950/20">
          <h3 className="text-base font-bold text-slate-800 dark:text-emerald-50">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-emerald-900/20 text-slate-400 dark:text-emerald-400 hover:text-slate-600 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
};
