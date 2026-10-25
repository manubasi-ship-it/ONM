import React, { useState } from 'react';
import { User, Check, X, Shield, Plus, Sparkles } from 'lucide-react';

interface UserSwitchModalProps {
  isOpen: boolean;
  currentVolunteerName: string;
  onSelectVolunteer: (name: string) => void;
  onClose: () => void;
  onOpenLoginModal?: () => void;
}

const PRESET_VOLUNTEERS = [
  { name: 'Admin Volunteer', role: 'Chief Administrator' },
  { name: 'Harikrishnan (Desk)', role: 'Collection Desk Agent' },
  { name: 'Sujith Kumar', role: 'Door-to-Door Field Volunteer' },
  { name: 'Vishnu Prasad', role: 'Festival Committee Member' },
  { name: 'K. Radhakrishnan Nair', role: 'Treasurer & Auditor' },
];

export const UserSwitchModal: React.FC<UserSwitchModalProps> = ({
  isOpen,
  currentVolunteerName,
  onSelectVolunteer,
  onClose,
  onOpenLoginModal,
}) => {
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customName.trim();
    if (!trimmed) {
      setError('Please enter volunteer / user name');
      return;
    }
    onSelectVolunteer(trimmed);
    setCustomName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
        <div className="bg-linear-to-r from-stone-900 via-amber-950 to-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                Switch Logged-in Volunteer / User
              </h3>
              <p className="text-[11px] text-amber-200/80">
                Populates audit fields on commitments and receipts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Current Active User Banner */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                👤
              </div>
              <div>
                <div className="text-[10px] text-amber-800 uppercase font-bold tracking-wider">
                  Currently Active Volunteer
                </div>
                <div className="font-extrabold text-stone-900 text-sm">
                  {currentVolunteerName}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
              <Check className="w-3 h-3" /> Active
            </span>
          </div>

          {/* RBAC Login Portal Quick Link */}
          {onOpenLoginModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLoginModal();
              }}
              className="w-full p-3 rounded-xl bg-linear-to-r from-indigo-900 to-stone-900 text-white flex items-center justify-between hover:from-indigo-800 hover:to-stone-800 transition shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-300" />
                <div className="text-left">
                  <div className="font-bold text-xs text-indigo-100">Multi-User Auth & Password Login</div>
                  <div className="text-[10px] text-indigo-300/80">Log in with User ID and credentials (Admin / User)</div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-black bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/30">
                Sign In
              </span>
            </button>
          )}

          {/* Quick Select Presets */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              Select Preset Volunteer Profile:
            </label>
            <div className="space-y-1.5">
              {PRESET_VOLUNTEERS.map((v) => {
                const isSelected = currentVolunteerName.toLowerCase() === v.name.toLowerCase();
                return (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => {
                      onSelectVolunteer(v.name);
                      onClose();
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100/70 border-amber-400 text-amber-950 font-bold shadow-xs'
                        : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                        {v.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{v.name}</div>
                        <div className="text-[10px] text-stone-500">{v.role}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-800" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Name Entry */}
          <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-stone-200 space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              Or Type Custom Volunteer / Collector Name:
            </label>
            {error && (
              <div className="p-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 font-medium">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Unnikrishnan G."
                className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-600/30 font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Set User</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
