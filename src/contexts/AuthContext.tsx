import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface CustomUser {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: string;
  status?: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | CustomUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signInWithMobile: (phone: string, password: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [customUser, setCustomUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const googleInitialized = useRef(false);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setLoading(false);
      return;
    }

    const checkGoogle = setInterval(() => {
      if (window.google?.accounts?.id && !googleInitialized.current) {
        googleInitialized.current = true;
        clearInterval(checkGoogle);
        setLoading(false);
      }
    }, 100);

    // Fallback: stop waiting after 3s
    const timeout = setTimeout(() => {
      clearInterval(checkGoogle);
      setLoading(false);
    }, 3000);

    return () => {
      clearInterval(checkGoogle);
      clearTimeout(timeout);
    };
  }, []);

  // Supabase session listener
  useEffect(() => {
    if (!supabase || !supabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    try {
      const res = await fetch("/api/user-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login-google", credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign in failed.");
      if (data.token) {
        localStorage.setItem("maurya_user_token", data.token);
      }
      setCustomUser(data.user);
      window.location.hash = "#/home";
    } catch (err) {
      console.error("Google login error:", err);
      alert(err instanceof Error ? err.message : "Google sign in failed.");
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Primary: Supabase Google OAuth (works everywhere, no domain restrictions)
    if (supabase && supabaseConfigured) {
      // Always use the actual origin the app was opened from (works on phone/LAN too).
      // VITE_PUBLIC_SITE_URL is only a fallback for non-browser contexts.
      const siteUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${siteUrl}#/home` }
      });
      if (error) {
        console.error("Supabase Google OAuth error:", error);
        alert("Google sign in failed. Please try email login instead.");
      }
      return;
    }

    // Fallback: Google Identity Services — render a real button in a modal
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      const overlay = document.createElement("div");
      overlay.id = "google-signin-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)";

      const modal = document.createElement("div");
      modal.style.cssText = "background:#1e293b;border-radius:1.5rem;padding:2.5rem;max-width:400px;width:90%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)";

      const title = document.createElement("h2");
      title.textContent = "Sign in with Google";
      title.style.cssText = "color:white;font-size:1.1rem;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1.5rem;font-family:inherit";

      const btnContainer = document.createElement("div");
      btnContainer.id = "google-signin-btn";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = "margin-top:1rem;background:none;border:none;color:rgba(255,255,255,0.4);font-size:0.75rem;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.1em;font-family:inherit";
      cancelBtn.onclick = () => overlay.remove();

      modal.appendChild(title);
      modal.appendChild(btnContainer);
      modal.appendChild(cancelBtn);
      overlay.appendChild(modal);
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
      document.body.appendChild(overlay);

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          overlay.remove();
          handleGoogleCredential(response);
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      window.google.accounts.id.renderButton(btnContainer, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 300,
        text: "continue_with",
        shape: "rectangular"
      });
      return;
    }

    // Nothing configured
    alert("Google login not configured. Please use email login.");
  }, [handleGoogleCredential]);

  // Registration flow: get ONLY email+name from Google, come BACK to the
  // register form so the user fills the rest (phone, password) manually.
  const signUpWithGoogle = useCallback(async () => {
    // Primary: Supabase Google OAuth, redirect back to #/register for pre-fill
    if (supabase && supabaseConfigured) {
      const siteUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${siteUrl}#/register` }
      });
      if (error) {
        console.error("Supabase Google OAuth error:", error);
        alert("Google sign up failed. Please fill the form manually instead.");
      }
      return;
    }

    // Fallback: Google Identity Services — decode the credential JWT locally
    // (no backend call, no session) and pre-fill the register form.
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
      const overlay = document.createElement("div");
      overlay.id = "google-signup-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)";

      const modal = document.createElement("div");
      modal.style.cssText = "background:#1e293b;border-radius:1.5rem;padding:2.5rem;max-width:400px;width:90%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)";

      const title = document.createElement("h2");
      title.textContent = "Sign up with Google";
      title.style.cssText = "color:white;font-size:1.1rem;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1.5rem;font-family:inherit";

      const btnContainer = document.createElement("div");
      btnContainer.id = "google-signup-btn";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = "margin-top:1rem;background:none;border:none;color:rgba(255,255,255,0.4);font-size:0.75rem;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.1em;font-family:inherit";
      cancelBtn.onclick = () => overlay.remove();

      modal.appendChild(title);
      modal.appendChild(btnContainer);
      modal.appendChild(cancelBtn);
      overlay.appendChild(modal);
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
      document.body.appendChild(overlay);

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          overlay.remove();
          try {
            const payload = JSON.parse(atob(response.credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            window.dispatchEvent(new CustomEvent("google-signup-prefill", {
              detail: { email: payload.email || "", name: payload.name || "" }
            }));
          } catch {
            alert("Could not read Google profile. Please fill the form manually.");
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      window.google.accounts.id.renderButton(btnContainer, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 300,
        text: "signup_with",
        shape: "rectangular"
      });
      return;
    }

    alert("Google sign up not configured. Please fill the form manually.");
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const res = await fetch("/api/user-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login-email", email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Email sign in failed.");
    if (data.requiresPasswordSetup) {
      return { requiresPasswordSetup: true, userId: data.userId, email: data.email, message: data.message };
    }
    if (data.token) {
      localStorage.setItem("maurya_user_token", data.token);
    }
    setCustomUser(data.user);
    return data;
  };

  const signInWithMobile = async (phone: string, password: string) => {
    const res = await fetch("/api/user-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login-mobile", phone, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Mobile sign in failed.");
    if (data.token) {
      localStorage.setItem("maurya_user_token", data.token);
    }
    setCustomUser(data.user);
    return data;
  };

  const resetPassword = async (email: string) => {
    const res = await fetch("/api/user-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "forgot-password", email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Password reset request failed.");
    return data;
  };

  const signOut = async () => {
    if (supabase && supabaseConfigured) {
      await supabase.auth.signOut();
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem("maurya_user_token");
    setSession(null);
    setCustomUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? customUser,
        loading,
        signInWithGoogle,
        signUpWithGoogle,
        signInWithEmail,
        signInWithMobile,
        resetPassword,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
