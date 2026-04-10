import type { FormEvent } from 'react';
import { useState } from 'react';
import { supabase } from './utils/supabase';

const APP_BASE_PATH = import.meta.env.PROD ? '/instagram_gif_favouriter/' : '/';

function getAppRedirectUrl() {
  return new URL(APP_BASE_PATH, window.location.origin).toString();
}

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1l2.5 7.5H22l-6.5 4.5 2.5 7.5L12 16l-6 4.5 2.5-7.5L3 8.5h7.5z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    clearMessages();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAppRedirectUrl(),
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // On success, Supabase redirects the browser — no need to do anything else
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (mode === 'forgot') {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppRedirectUrl()}?reset=true`,
      });
      setLoading(false);
      if (error) setError(error.message);
      else setSuccessMsg('Password reset email sent! Check your inbox.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg('Account created! Check your email to confirm, then log in.');
        setMode('login');
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl fade-in-up">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4 float-anim">
              <SparkleIcon />
            </div>
            <h1 className="text-2xl font-extrabold gradient-text tracking-tight">GIF Studio</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
            </p>
          </div>

          {/* Google OAuth button */}
          {mode !== 'forgot' && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold py-3 px-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 mb-4"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-zinc-600 text-xs font-medium">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </>
          )}

          {/* Error / success messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-4">
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Email */}
            <div>
              <label className="block text-zinc-400 text-xs font-medium mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-800 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all duration-200"
              />
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password */}
            {mode === 'signup' && (
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Confirm password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); clearMessages(); }}
                  className="text-violet-400 hover:text-violet-300 text-xs font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-60 disabled:scale-100 mt-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Loading...</>
              ) : (
                mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'
              )}
            </button>
          </form>

          {/* Mode switch */}
          <div className="mt-6 text-center text-sm">
            {mode === 'login' && (
              <p className="text-zinc-500">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setMode('signup'); clearMessages(); }} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p className="text-zinc-500">
                Already have an account?{' '}
                <button type="button" onClick={() => { setMode('login'); clearMessages(); }} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button type="button" onClick={() => { setMode('login'); clearMessages(); }} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
