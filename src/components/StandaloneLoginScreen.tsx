import React, { useState } from 'react';
import { AuthUser, loginWithCredentials } from '../modules/auth';
import { Setting } from '../types';
import {
  Lock,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

interface StandaloneLoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  setting: Setting;
}

export const StandaloneLoginScreen: React.FC<StandaloneLoginScreenProps> = ({
  onLoginSuccess,
  setting,
}) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
    try {
      const res = await loginWithCredentials(cleanId, password);
      setLoading(false);

      if (!res.success || !res.user) {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
        return;
      }

      setSuccessMsg(`Welcome back, ${res.user.name}!`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
      }, 500);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication service error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none overflow-hidden bg-stone-950 text-stone-100">
      {/* Blurry Photograph Background: Historic Kalady Bridge and River at Night */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{
          backgroundImage: `url('/assets/aistudio/Gemini_Generated_Image_te35te35te35te35_b921a4ad.png')`,
        }}
      />

      {/* Atmospheric Vignette & Warm Night Shading */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-950/80 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-radial from-transparent via-stone-950/60 to-stone-950/95 pointer-events-none" />

      {/* Dual Column Container for Expansive Cinematic Aesthetic */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Welcome Copy Space (Empty space below subheader showcasing dark warm river view) */}
        <div className="lg:col-span-7 space-y-2 sm:space-y-4 text-left">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-md">
            <span>🔱 Om Saravana Bhavaya Namaha</span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-5xl font-black text-amber-50 tracking-tight leading-tight drop-shadow-lg">
            {setting?.sangamNameEnglish || 'ONAMPILLY KAVADI SANGAM'}
          </h1>

          <p className="text-xs sm:text-base lg:text-lg text-amber-300/90 font-medium font-serif italic drop-shadow-md">
            Thaipooyam Maholsavam 2027 • Kalady, Kerala
          </p>
        </div>

        {/* Right Column: Glassmorphic Secure Login Card */}
        <div className="lg:col-span-5 w-full">
          <div className="w-full bg-stone-900/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden relative animate-fade-in">
            {/* Top Card Banner */}
            <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 text-center border-b border-amber-500/20">
              <div className="inline-flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-inner mb-1.5 sm:mb-2.5">
                <span className="text-xl sm:text-2xl">🔱</span>
              </div>
              <h2 className="text-sm sm:text-lg font-black text-amber-100 tracking-tight">
                Festival Portal Sign In
              </h2>
              <p className="text-[10px] sm:text-[11px] text-amber-300/80 font-medium">
                Authorized Executive Committee & Volunteer Access
              </p>
            </div>

            {/* Login Form Container - ending neatly below the Sign In button */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-950/80 text-rose-200 text-xs rounded-xl border border-rose-800/80 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Success Alert */}
              {successMsg && (
                <div className="p-3 bg-emerald-950/80 text-emerald-200 text-xs rounded-xl border border-emerald-800/80 flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 font-bold">{successMsg}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* User ID / Handle */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1">
                    User ID / Handle
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <User className="w-4 h-4 text-amber-400/80" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. admin or username"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-850/90 border border-stone-700 focus:border-amber-500 rounded-xl text-stone-100 placeholder-stone-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold text-amber-200 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-4 h-4 text-amber-400/80" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-stone-850/90 border border-stone-700 focus:border-amber-500 rounded-xl text-stone-100 placeholder-stone-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition"
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

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-stone-950 font-black text-xs rounded-xl shadow-lg hover:shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
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
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
