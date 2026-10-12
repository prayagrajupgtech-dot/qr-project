import type { ReactNode } from "react";
import { useTheme } from "../../App";
import ThemeModeButton from "../ThemeModeButton";

export default function UserAuthShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="auth-scene min-h-screen w-full text-white selection:bg-orange-500/30">
      <ThemeModeButton isDark={theme === "dark"} onToggle={toggleTheme} />
      <main className="auth-scene-content">
        <div className="auth-layout">
          <header className="auth-brand">
            <button className="auth-brand-mark" onClick={() => { window.location.hash = "#/"; }} aria-label="Back to ResQRide home">
              <svg viewBox="0 0 48 54" fill="none" aria-hidden="true">
                <path d="M24 3 43 10v14c0 12-8 21-19 27C13 45 5 36 5 24V10L24 3Z" fill="#08172a" stroke="#168bff" strokeWidth="3" />
                <path d="M14 18h7v8h-7zm13 0h7v8h-7zM14 31h7v7h-7zm13 0h7v7h-7z" stroke="white" strokeWidth="1.7" />
                <path d="M18 22h.1m13 0h.1m-13 12h.1m13 0h.1" stroke="#ff8a24" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
            <div>
              <button className="auth-brand-name" onClick={() => { window.location.hash = "#/"; }} aria-label="ResQRide home">
                ResQ<span>Ride</span>
              </button>
              <p className="auth-brand-tagline">Vehicle QR Safety System</p>
            </div>
          </header>
          {children}
          <footer className="auth-brand-footer">
            <span>Scan.</span> Connect. Protect.
            <span className="auth-footer-divider">•</span>
            Your vehicle. Your emergency contact. One scan away.
          </footer>
        </div>
      </main>
    </div>
  );
}
