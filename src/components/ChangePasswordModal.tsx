import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { handleUserPasswordChange, getActiveSession } from '../modules/auth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const session = getActiveSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPass) {
      setError('Current password is required.');
      return;
    }
    if (!newPass || newPass.trim().length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    const res = await handleUserPasswordChange(currentPass, newPass, confirmPass);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to update password.');
      return;
    }

    setSuccess('Password updated successfully.');
    setTimeout(() => {
      onSuccess?.();
      onClose();
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setSuccess('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-linear-to-r from-stone-900 via-amber-950 to-stone-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-amber-100">
                Change My Password
              </h3>
              <p className="text-[11px] text-amber-300/80 font-medium">
                Self-Service Credential Security
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-amber-200 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Account Info Banner */}
        {session && (
          <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-200/60 flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                Logged-In Member Handle
              </span>
              <span className="font-extrabold text-stone-900">
                {session.name} <span className="text-amber-800 font-mono">(@{session.userId})</span>
              </span>
            </div>
            <span
              className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black border ${
                session.role === 'ADMIN'
                  ? 'bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {session.role}
            </span>
          </div>
        )}

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter your existing password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                New Password / PIN <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="At least 4 characters or digits"
                  minLength={4}
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={4}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>
              {newPass && confirmPass && newPass === confirmPass && (
                <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
