import React from 'react';
import { UserProfile, ActiveSession } from '../types';
import {
  Lock,
  User,
  Shield,
  AlertTriangle,
  X,
  LogOut,
  CheckCircle,
  Clock,
  KeyRound,
} from 'lucide-react';

interface AuthModalProps {
  currentUser: UserProfile | null;
  activeSession?: ActiveSession | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  activeSession,
  isOpen,
  onClose,
  onLogout,
}) => {
  if (!isOpen || !currentUser) return null;

  const formattedLoginTime = activeSession?.loginTimestamp
    ? new Date(activeSession.loginTimestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Active now';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-amber-950 via-amber-900 to-red-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-amber-100">
                Active Session Locked
              </h3>
              <p className="text-[11px] text-amber-300/90 font-medium">
                Session Active for Current Window
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-amber-200 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Active Collector Details Card */}
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/90 space-y-3">
            <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider flex items-center justify-between">
              <span>Active Collector Profile</span>
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Session Active</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-950 flex items-center justify-center font-black text-lg shrink-0 border border-amber-300 shadow-xs">
                {currentUser.role === 'admin' ? (
                  <Shield className="w-6 h-6 text-amber-800" />
                ) : (
                  <User className="w-6 h-6 text-emerald-800" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-stone-900 text-base truncate">
                  {currentUser.displayName}
                </div>
                <div className="text-xs text-stone-600 flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold font-mono">
                    {currentUser.role}
                  </span>
                  {currentUser.phone && (
                    <span className="font-mono text-[11px] text-stone-500">
                      +91 {currentUser.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Session Metadata */}
            <div className="pt-2 border-t border-amber-200/60 grid grid-cols-2 gap-2 text-[11px] text-stone-600 font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Logged in: {formattedLoginTime}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <KeyRound className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate font-mono text-[10px] text-stone-500">
                  {activeSession?.sessionToken ? `${activeSession.sessionToken.substring(0, 14)}...` : 'Token Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Concurrency Enforcement Rule Banner */}
          <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-800 space-y-1">
              <div className="font-bold text-amber-950">
                Log out before switching accounts:
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Active session in progress for <strong>{currentUser.displayName}</strong>. To maintain collection integrity and strict voucher attribution, switching accounts in this window requires logging out first.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue Session as {currentUser.displayName}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-red-200" />
              <span>Log Out of this Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
