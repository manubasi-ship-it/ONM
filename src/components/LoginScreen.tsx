import React, { useState } from 'react';
import { UserProfile, AppUser, Setting } from '../types';
import { auth } from '../firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  Lock,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';

interface LoginScreenProps {
  appUsers: AppUser[];
  setting: Setting;
  isOnline: boolean;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  appUsers,
  setting,
  isOnline,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('M9495233833');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMsg('Please enter username or mobile number');
      return;
    }
    if (!trimmedPass) {
      setErrorMsg('Please enter password or PIN');
      return;
    }

    // 1. Check default admin credentials mandated by requirements
    if (trimmedUser.toLowerCase() === 'admin' && trimmedPass === 'M9495233833') {
      const adminProfile: UserProfile = {
        uid: 'usr_admin',
        username: 'admin',
        displayName: 'Chief Administrator',
        role: 'admin',
        phone: '9495233833',
      };
      onLoginSuccess(adminProfile);
      return;
    }

    // 2. Check against persistent appUsers master list
    const matchedUser = appUsers.find(
      (u) =>
        (u.username.toLowerCase() === trimmedUser.toLowerCase() ||
          (u.phone && u.phone === trimmedUser)) &&
        u.password === trimmedPass
    );

    if (matchedUser) {
      if (!matchedUser.active) {
        setErrorMsg('This user account is deactivated. Please contact an administrator.');
        return;
      }

      const userProfile: UserProfile = {
        uid: matchedUser.id,
        username: matchedUser.username,
        displayName: matchedUser.fullName,
        role: matchedUser.role,
        phone: matchedUser.phone || undefined,
        memberId: matchedUser.id,
      };
      onLoginSuccess(userProfile);
      return;
    }

    setErrorMsg('Invalid username or password');
  };

  const handleQuickDemoLogin = (demoUser: { user: string; pass: string }) => {
    setUsername(demoUser.user);
    setPassword(demoUser.pass);
    setErrorMsg('');
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const isSangamAdmin = user.email === 'manu.basi@gmail.com';
      const userProfile: UserProfile = {
        uid: user.uid,
        username: user.email?.split('@')[0] || 'volunteer',
        displayName: user.displayName || user.email || 'Devotee Volunteer',
        role: isSangamAdmin ? 'admin' : 'volunteer',
        phone: user.phoneNumber || undefined,
      };

      onLoginSuccess(userProfile);
    } catch (err) {
      console.error('Google Sign In Error:', err);
      setErrorMsg('Google Sign-In failed or popup was closed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#fcf9f2] flex flex-col justify-between items-center p-4 sm:p-6 select-none overflow-y-auto">
      {/* Top Header Branding */}
      <div className="w-full max-w-md pt-4 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/80 text-amber-950 text-xs font-bold shadow-xs">
          <span className="text-sm">🔱</span>
          <span>Thaipooya Festival {setting.festivalYear}</span>
          <span className="text-amber-400">•</span>
          <span>Official Portal</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md my-auto bg-white rounded-3xl shadow-xl border border-amber-200/90 overflow-hidden">
        {/* Card Header */}
        <div className="bg-linear-to-r from-amber-900 via-amber-800 to-red-900 px-6 py-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 text-8xl opacity-10 select-none pointer-events-none">
            🔱
          </div>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/60 border border-amber-400/40 flex items-center justify-center text-3xl shadow-md mb-2.5">
            🔱
          </div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-amber-100">
            {setting.sangamNameEnglish}
          </h1>
          <p className="text-xs font-bold text-amber-200/90 tracking-wide uppercase mt-0.5">
            Festival Management Portal
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/30 border border-white/10 text-[11px] text-amber-200">
            <Lock className="w-3 h-3 text-amber-300" />
            <span>Authorized Volunteer & Admin Access</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Mobile */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" />
                <span>Username / Mobile Number</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or 9495233833"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-sm font-semibold text-stone-900 bg-stone-50/50"
              />
            </div>

            {/* Password / PIN */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  <span>Password / PIN</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password or PIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-sm font-semibold font-mono text-stone-900 bg-stone-50/50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-amber-950 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <CheckCircle className="w-4 h-4 text-amber-300" />
              <span>Log In to Portal</span>
            </button>
          </form>

          {/* Quick Demo Access Chips */}
          <div className="pt-2 border-t border-stone-200/80">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Login Options</span>
              <span className="text-[10px] text-amber-800 font-semibold">Click to autofill</span>
            </div>

            <div>
              <button
                type="button"
                onClick={() =>
                  handleQuickDemoLogin({ user: 'admin', pass: 'M9495233833' })
                }
                className="w-full p-2.5 text-left rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 transition text-xs cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-900 font-bold">
                    <Shield className="w-4 h-4 text-amber-800" />
                  </div>
                  <div>
                    <div className="font-extrabold text-amber-950">
                      Chief Administrator
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">
                      admin / M9495233833
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md font-semibold">
                  Autofill
                </span>
              </button>
            </div>
          </div>

          {/* Google Sign-in */}
          <div className="pt-2 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-xs font-bold text-stone-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="w-full max-w-md pb-4 text-center text-xs text-stone-500 flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          {isOnline ? (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <Wifi className="w-3.5 h-3.5" /> Cloud Sync Ready
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <WifiOff className="w-3.5 h-3.5" /> Offline Mode
            </span>
          )}
        </span>
        <span>•</span>
        <span className="font-mono">v2.4.0 Secure Auth</span>
      </div>
    </div>
  );
};
