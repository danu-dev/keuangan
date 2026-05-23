import React, { useState, useRef } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import type { Transaction } from '../hooks/useTransactions';
import { formatRupiah, formatShortDate } from '../utils/formatter';
import { CATEGORIES } from '../utils/nlpParser';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onDelete,
  onEdit,
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef<number>(0);
  const currentOffsetRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  const catObj = CATEGORIES.find((c) => c.name === transaction.category);
  const emoji = catObj ? catObj.icon : '💰';

  const isIncome = transaction.type === 'pemasukan';

  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    setIsSwiping(true);
    hasMovedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSwiping) return;
    const diff = e.clientX - startXRef.current;
    
    if (Math.abs(diff) > 8) {
      hasMovedRef.current = true;
    }

    // Only allow swiping to the left (revealing the delete button on the right)
    if (diff < 0) {
      // Add rubber banding when pulling too far
      const offset = Math.max(diff, -100);
      setSwipeOffset(offset);
      currentOffsetRef.current = offset;
    } else if (diff > 0 && currentOffsetRef.current < 0) {
      // Allow swiping back to close
      const offset = Math.min(currentOffsetRef.current + diff, 0);
      setSwipeOffset(offset);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsSwiping(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    // If swiped more than 50px to the left, snap open to show delete action (80px width)
    if (swipeOffset < -40) {
      setSwipeOffset(-80);
      currentOffsetRef.current = -80;
    } else {
      setSwipeOffset(0);
      currentOffsetRef.current = 0;
    }
  };

  const closeSwipe = () => {
    setSwipeOffset(0);
    currentOffsetRef.current = 0;
  };

  const handleItemClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (swipeOffset !== 0) {
      closeSwipe();
    } else {
      onEdit(transaction);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl w-full select-none my-2 shadow-sm">
      {/* Background action - Delete button */}
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end pr-6">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(transaction.id);
            closeSwipe();
          }}
          className="h-full w-20 flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          aria-label="Hapus Transaksi"
        >
          <Trash2 className="w-5 h-5 mb-0.5" />
          <span className="text-[9px] font-bold">Hapus</span>
        </button>
      </div>

      {/* Foreground - Content Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative bg-white dark:bg-[#041a0e] dark:border dark:border-emerald-950/20 px-4 py-3 flex items-center justify-between transition-transform duration-200 ease-out border-b border-slate-100/50 cursor-pointer"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onClick={handleItemClick}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-xl flex-shrink-0">
            {emoji}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-emerald-50 truncate">
              {transaction.note}
            </h4>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                {transaction.category}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-emerald-400/40">
                {formatShortDate(transaction.date)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <span
            className={`text-sm font-extrabold ${
              isIncome ? 'text-emerald-500' : 'text-slate-700 dark:text-emerald-100'
            }`}
          >
            {isIncome ? '+' : '-'} {formatRupiah(transaction.amount)}
          </span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(transaction);
            }}
            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-100/30 transition-colors"
            aria-label="Edit Transaksi"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
