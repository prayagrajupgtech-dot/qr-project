import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function UserLogin() {
  const { signInWithGoogle, signInWithEmail, signInWithMobile, resetPassword, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"google" | "email" | "mobile">("google");

  // Email form state
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  
  // Mobile form state
  const [phone, setPhone] = useState("");
  const [mobilePassword, setMobilePassword] = useState("");
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [showMobilePass, setShowMobilePass] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !emailPassword || submitting) return;

    setSubmitting(true);
    setError("");
    setInfoMessage("");
    try {
      const result = await signInWithEmail(email, emailPassword);
      if (result?.requiresPasswordSetup) {
        window.location.hash = `#/setup-password/${result.userId}/${encodeURIComponent(result.email)}`;
        return;
      }
      window.location.hash = "#/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMobileLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || !mobilePassword || submitting) return;

    setSubmitting(true);
    setError("");
    setInfoMessage("");
    try {
      await signInWithMobile(phone, mobilePassword);
      window.location.hash = "#/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mobile login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const res = await resetPassword(forgotEmail);
      setInfoMessage(res.message || "Password reset link sent to your email.");
      setShowForgotModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 selection:bg-amber-500/30">
      <div className="w-full max-w-md space-y-6">
        {/* Card Header */}
        <div className="border border-white/10 bg-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[3px] text-amber-500">User Access</p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-tight">User Sign In</h1>
            </div>
            <button
              onClick={() => { window.location.hash = "#/"; }}
              className="text-xs font-black uppercase text-white/40 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Login Option Selector Tabs */}
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 text-xs font-black">
            <button
              onClick={() => { setActiveTab("google"); setError(""); setInfoMessage(""); }}
              className={`flex-1 py-2.5 rounded-xl transition-all uppercase tracking-wider ${
                activeTab === "google" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-white/40 hover:text-white"
              }`}
            >
              Google
            </button>
            <button
              onClick={() => { setActiveTab("email"); setError(""); setInfoMessage(""); }}
              className={`flex-1 py-2.5 rounded-xl transition-all uppercase tracking-wider ${
                activeTab === "email" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-white/40 hover:text-white"
              }`}
            >
              Email
            </button>
            <button
              onClick={() => { setActiveTab("mobile"); setError(""); setInfoMessage(""); }}
              className={`flex-1 py-2.5 rounded-xl transition-all uppercase tracking-wider ${
                activeTab === "mobile" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-white/40 hover:text-white"
              }`}
            >
              Mobile
            </button>
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs font-bold text-red-300">
              {error}
            </div>
          )}
          {infoMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs font-bold text-emerald-300">
              {infoMessage}
            </div>
          )}

          {/* OPTION 1: GOOGLE LOGIN */}
          {activeTab === "google" && (
            <div className="space-y-6 pt-2">
              <p className="text-xs text-white/50 text-center">
                Sign in with your Google account to access your user dashboard.
              </p>
              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <p className="text-[10px] text-amber-400 text-center bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                  Google Sign-In not configured. Set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> in .env
                </p>
              )}
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-all shadow-xl disabled:cursor-wait disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {loading ? "Loading..." : "Continue with Google"}
              </button>
            </div>
          )}

          {/* OPTION 2: EMAIL + PASSWORD LOGIN */}
          {activeTab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-4 pt-2">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setShowForgotModal(true); }}
                    className="text-[10px] font-black uppercase text-amber-500 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    required
                    type={showEmailPass ? "text" : "password"}
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-xs font-bold outline-none focus:border-amber-500/60"
                  />
                  <button type="button" onClick={() => setShowEmailPass(!showEmailPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showEmailPass ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 text-black py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Login"}
              </button>
            </form>
          )}

          {/* OPTION 3: MOBILE NUMBER + PASSWORD LOGIN */}
          {activeTab === "mobile" && (
            <form onSubmit={handleMobileLogin} className="space-y-4 pt-2">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                  Mobile Number
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210 or +919876543210"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showMobilePass ? "text" : "password"}
                    value={mobilePassword}
                    onChange={e => setMobilePassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-xs font-bold outline-none focus:border-amber-500/60"
                  />
                  <button type="button" onClick={() => setShowMobilePass(!showMobilePass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showMobilePass ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 text-black py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {submitting ? "Authenticating..." : "Login with Mobile"}
              </button>
            </form>
          )}
        </div>

        {/* Switch to Admin + Register */}
        <div className="text-center space-y-2">
          <p className="text-xs text-white/40">
            Don't have an account?{" "}
            <button onClick={() => { window.location.hash = "#/register"; }} className="text-amber-500 font-black uppercase hover:underline">
              Register
            </button>
          </p>
          <button
            onClick={() => { window.location.hash = "#/admin/login"; }}
            className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Switch to Admin Sign In
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={handleForgotPassword} className="bg-slate-900 border border-white/10 max-w-md w-full rounded-3xl p-8 space-y-5">
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Reset Account Password</h3>
            <p className="text-xs text-white/50">Enter your registered email address to receive password recovery instructions.</p>

            <div>
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Registered Email</label>
              <input
                required
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2.5 bg-white/10 text-white rounded-xl text-xs font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-amber-500 text-black rounded-xl text-xs font-black uppercase hover:bg-amber-400 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Reset Email"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
