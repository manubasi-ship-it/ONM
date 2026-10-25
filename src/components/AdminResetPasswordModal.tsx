import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Lock, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { CommitteeMember } from '../types';
import { handleAdminResetPassword } from '../modules/auth';

interface AdminResetPasswordModalProps {
  isOpen: boolean;
  member: CommitteeMember | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminResetPasswordModal: React.FC<AdminResetPasswordModalProps> = ({
  isOpen,
  member,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !member) return null;

  const handleQuickDefault = (val: string) => {
    setNewPassword(val);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.trim().length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    const res = await handleAdminResetPassword(member.id, newPassword.trim());
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to reset password.');
      return;
    }

    setSuccess(`Password for ${member.name} reset successfully.`);
    setTimeout(() => {
      onSuccess?.();
      onClose();
      setNewPassword('');
      setSuccess('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-linear-to-r from-red-950 via-stone-900 to-stone-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-red-100">
                Admin Password Reset
              </h3>
              <p className="text-[11px] text-red-300/80 font-medium">
                Reset Credentials for Committee Member
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-red-200 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Member Banner */}
        <div className="px-6 py-3.5 bg-stone-50 border-b border-stone-200 flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-black text-stone-900 text-sm">{member.name}</span>
            <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
              {member.designation}
            </span>
          </div>
          <div className="flex items-center justify-between text-stone-500 text-[11px]">
            <span>
              Login Handle:{' '}
              <strong className="text-stone-800 font-mono">
                {member.userId || member.phone || member.id}
              </strong>
            </span>
            <span>Mobile: +91 {member.phone}</span>
          </div>
        </div>

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
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                New Temporary Password / PIN <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. 9946809341 or tempPass123"
                  minLength={4}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-bold focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
              </div>
            </div>

            {/* Quick Fill Helpers */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Quick Assign Defaults:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDefault(member.phone)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-semibold transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Use Mobile No ({member.phone})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDefault('welcome123')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-semibold transition cursor-pointer"
                >
                  <KeyRound className="w-3 h-3 text-amber-600" />
                  <span>Use 'welcome123'</span>
                </button>
              </div>
            </div>

            {/* Warning Note */}
            <p className="text-[11px] text-stone-500 bg-stone-50 p-3 rounded-xl border border-stone-200">
              ℹ️ The member will be able to log in with this new password immediately and update it
              anytime via their profile.
            </p>

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
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Confirm Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
