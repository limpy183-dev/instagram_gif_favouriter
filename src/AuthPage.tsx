import * as React from "react";
import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";
import { SparkleIcon, GoogleIcon, EyeIcon } from "./components/Icons";
import { getAppRedirectUrl, getAuthErrorMessage } from "./utils/authHelpers";
import { DeveloperDiagnostics } from "./components/auth/DeveloperDiagnostics";

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showResendEmail, setShowResendEmail] = useState(false);

  useEffect(() => {
    const savedError = localStorage.getItem("gif_studio_google_login_error");
    if (savedError) {
      setError(savedError);
      localStorage.removeItem("gif_studio_google_login_error");
    }
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
    setShowResendEmail(false);
  };

  const handleErrorMessage = (msg: string, currentMode: Mode) => {
    const res = getAuthErrorMessage(msg, currentMode);
    setError(res.message);
    if (res.showResendEmail) {
      setShowResendEmail(true);
    }
  };

  const resendConfirmationEmail = async () => {
    if (!email.trim()) {
      setError("Enter your email first so the confirmation email can be resent.");
      return;
    }

    setLoading(true);
    clearMessages();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAppRedirectUrl(),
      },
    });
    setLoading(false);

    if (error) {
      handleErrorMessage(error.message, mode);
      return;
    }

    setSuccessMsg("Confirmation email resent. Check your inbox and spam folder, then sign in after confirming.");
  };

  const handleGoogleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setGoogleLoading(true);
    clearMessages();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAppRedirectUrl(),
        },
      });
      if (error) {
        localStorage.setItem("gif_studio_google_login_error", error.message);
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      console.error("Google login redirect failed:", err);
      const errMsg = err.message || "An unexpected error occurred during Google sign in.";
      localStorage.setItem("gif_studio_google_login_error", errMsg);
      setError(errMsg);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (mode === "forgot") {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppRedirectUrl()}?reset=true`,
      });
      setLoading(false);
      if (error) setError(error.message);
      else setSuccessMsg("Password reset email sent! Check your inbox.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) handleErrorMessage(error.message, mode);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAppRedirectUrl(),
        },
      });
      setLoading(false);
      if (error) {
        handleErrorMessage(error.message, mode);
      } else {
        if (data.user && !data.session) {
          setSuccessMsg("Account created. Check your email and confirm your account before signing in.");
        } else {
          setSuccessMsg("Account created and signed in.");
        }
        setMode("login");
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
              {mode === "login" && "Welcome back"}
              {mode === "signup" && "Create your account"}
              {mode === "forgot" && "Reset your password"}
            </p>
          </div>

          {/* Google OAuth button */}
          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold py-3 px-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 mb-4"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? "Redirecting..." : "Continue with Google"}
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
              <div className="space-y-3">
                <div>{error}</div>
                {showResendEmail && mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      void resendConfirmationEmail();
                    }}
                    className="secondary-btn text-xs"
                  >
                    Resend Email
                  </button>
                )}
              </div>
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-800 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all duration-200"
              />
            </div>

            {/* Password */}
            {mode !== "forgot" && (
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password */}
            {mode === "signup" && (
              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Confirm password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800 border border-white/10 text-white placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    clearMessages();
                  }}
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
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                  Loading...
                </>
              ) : mode === "login" ? (
                "Sign in"
              ) : mode === "signup" ? (
                "Create account"
              ) : (
                "Send reset email"
              )}
            </button>
          </form>

          {/* Mode switch */}
          <div className="mt-6 text-center text-sm">
            {mode === "login" && (
              <div className="space-y-2">
                <p className="text-zinc-500">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      clearMessages();
                    }}
                    className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                  >
                    Sign up
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void resendConfirmationEmail();
                  }}
                  className="text-xs text-zinc-400 hover:text-violet-300 transition-colors"
                >
                  Resend confirmation email
                </button>
              </div>
            )}
            {mode === "signup" && (
              <p className="text-zinc-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    clearMessages();
                  }}
                  className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  clearMessages();
                }}
                className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>

          {/* Developer Diagnostics Box */}
          <DeveloperDiagnostics />
        </div>
      </div>
    </div>
  );
}
