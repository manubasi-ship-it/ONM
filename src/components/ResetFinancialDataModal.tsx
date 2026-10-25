import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Trash2,
  X,
  CheckCircle,
  ShieldAlert,
  Loader2,
  FileSpreadsheet,
  Wallet,
  ArrowRight,
} from 'lucide-react';

interface ResetFinancialDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void> | void;
  isLoading?: boolean;
}

export const ResetFinancialDataModal: React.FC<ResetFinancialDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  isLoading = false,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'RESET';

  const handleConfirm = async () => {
    if (!isConfirmed) {
      setError('Please type RESET in capital letters to confirm.');
      return;
    }
    setError('');
    try {
      await onConfirmReset();
      setConfirmText('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reset financial data. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-rose-200 overflow-hidden my-auto flex flex-col">
        {/* Modal Warning Header */}
        <div className="bg-linear-to-r from-red-950 via-rose-900 to-amber-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  Administrative Action
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white mt-0.5">
                Reset / Purge Financial Data
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-full hover:bg-white/10 text-rose-200 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 space-y-1">
              <p className="font-bold">
                Caution: This will permanently wipe all financial records and reset advance wallets back to zero.
              </p>
              <p className="text-rose-700">
                This operation is irreversible. All member advance wallets will return to ₹0.00.
              </p>
            </div>
          </div>

          {/* Action Impact Breakdown */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-2.5">
            <p className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
              What will be reset:
            </p>
            <ul className="space-y-2 text-stone-600">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">
                  ✕
                </span>
                <span>
                  Clear all records from <strong className="text-stone-900">advances</strong>,{' '}
                  <strong className="text-stone-900">top_ups</strong>, and{' '}
                  <strong className="text-stone-900">expenses</strong> collections & local storage
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">
                  ✕
                </span>
                <span>
                  Reset member advance balances (<code className="text-stone-800">available_advance</code>,{' '}
                  <code className="text-stone-800">top_ups</code>,{' '}
                  <code className="text-stone-800">expenses_paid</code>) to{' '}
                  <strong className="text-emerald-700">₹0.00</strong>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">
                  ✕
                </span>
                <span>
                  Reset overview metrics (<strong className="text-stone-900">Total Advance Float</strong>,{' '}
                  <strong className="text-stone-900">Total Expensed</strong>,{' '}
                  <strong className="text-stone-900">Net Balance</strong>) back to{' '}
                  <strong className="text-stone-900">₹0.00</strong>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px]">
                  ✕
                </span>
                <span>
                  Empty & refresh the <strong className="text-stone-900">Double-Entry Expense Audit Ledger</strong> table
                </span>
              </li>
              <li className="flex items-center gap-2 pt-1 border-t border-stone-200 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Committee Members & Settings preserved:</strong> Member directory, phone numbers, and designations remain intact.
                </span>
              </li>
            </ul>
          </div>

          {/* Confirmation Input Guard */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-stone-700">
              To proceed, please type <span className="font-mono text-rose-600 font-extrabold">RESET</span> below:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError('');
              }}
              placeholder="Type RESET"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-sm font-mono tracking-wider transition bg-white"
            />
            {error && (
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition cursor-pointer ${
              isConfirmed && !isLoading
                ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-950/20'
                : 'bg-stone-300 text-stone-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Resetting Financial Records...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Reset Financial Data</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
