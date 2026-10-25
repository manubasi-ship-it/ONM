import React, { useState } from 'react';
import { AuthUser, loginWithCredentials } from '../modules/auth';
import {
  Lock,
  User,
  KeyRound,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  currentUser: AuthUser | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
}) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanId = userId.trim();
    if (!cleanId) {
      setError('Please enter your User ID or Username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const res = await loginWithCredentials(cleanId, password);
    setLoading(false);

    if (!res.success || !res.user) {
      setError(res.error || 'Authentication failed. Please verify credentials.');
      return;
    }

    setSuccessMsg(`Authenticated as ${res.user.name} (${res.user.role})`);
    setTimeout(() => {
      onLoginSuccess(res.user!);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-stone-900 text-stone-100 rounded-3xl max-w-md w-full shadow-2xl border border-amber-500/30 overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-linear-to-r from-amber-950 via-stone-900 to-amber-950 px-6 py-5 text-white flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-amber-100">
                Sign In / Authenticate
              </h3>
              <p className="text-[11px] text-amber-300/80 font-medium">
                Enter your credentials to continue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Banner if logged in */}
        {currentUser && (
          <div className="px-6 py-2.5 bg-stone-800/80 border-b border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-400 font-medium">Current session:</span>
              <span className="font-bold text-stone-200">{currentUser.name}</span>
            </div>
            <span
              className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-extrabold ${
                currentUser.role === 'ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        )}

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-950/70 text-rose-200 text-xs rounded-xl border border-rose-800/80 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/70 text-emerald-200 text-xs rounded-xl border border-emerald-800/80 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Clean Credentials Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                User ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4 text-amber-400/80" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter your User ID or Username"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-800/90 border border-stone-700 focus:border-amber-500 rounded-xl text-stone-100 placeholder-stone-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4 text-amber-400/80" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-800/90 border border-stone-700 focus:border-amber-500 rounded-xl text-stone-100 placeholder-stone-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-amber-300 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-stone-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-stone-950" />
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </button>

            {/* Quick RBAC Role Selectors */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-2 text-center">
                Demo Accounts & Role Access
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserId('admin');
                    setPassword('admin');
                  }}
                  className="py-1.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-500/30 text-amber-300 font-extrabold text-[10px] transition text-center cursor-pointer"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserId('treasurer');
                    setPassword('treasurer123');
                  }}
                  className="py-1.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-emerald-500/30 text-emerald-300 font-extrabold text-[10px] transition text-center cursor-pointer"
                >
                  Treasurer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserId('volunteer1');
                    setPassword('user123');
                  }}
                  className="py-1.5 px-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-blue-500/30 text-blue-300 font-extrabold text-[10px] transition text-center cursor-pointer"
                >
                  Volunteer
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
