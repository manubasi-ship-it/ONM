import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemName?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  itemName,
  description = 'Are you sure you want to permanently delete this master record? This action cannot be undone and changes are instantly updated in Cloud Firestore.',
  confirmLabel = 'Permanently Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-red-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-red-900/80 border border-red-700/60 text-red-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-red-100">
                {title}
              </h3>
              <p className="text-[11px] text-red-300 font-medium">
                Administrator Action • Irreversible Record Modification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-red-300 hover:text-white hover:bg-red-900/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {itemName && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-red-700 shrink-0" />
              <div className="text-xs text-red-950 font-bold truncate">
                {itemName}
              </div>
            </div>
          )}

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            {description}
          </p>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <span className="font-bold shrink-0">⚠️ Security Notice:</span>
            <span>
              This record will be permanently deleted from local cache and Cloud Firestore.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-5 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
