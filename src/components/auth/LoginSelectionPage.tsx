import { useTheme } from "../../App";
import ThemeModeButton from "../ThemeModeButton";

interface LoginSelectionPageProps {
  onSelectAdmin: () => void;
  onSelectUser: () => void;
  onRegister: () => void;
}

const features = {
  admin: ["User Management", "Plan Management", "Card & Payment Tracking", "System Analytics"],
  user: ["Create Your ID", "Manage Your Card", "Access Emergency Contact", "Update Profile"],
};

function ShieldMark() {
  return (
    <svg viewBox="0 0 48 54" className="h-11 w-10" fill="none" aria-hidden="true">
      <path d="M24 3 43 10v14c0 12-8 21-19 27C13 45 5 36 5 24V10L24 3Z" fill="#08172a" stroke="#168bff" strokeWidth="3" />
      <path d="M14 18h7v8h-7zm13 0h7v8h-7zM14 31h7v7h-7zm13 0h7v7h-7z" stroke="white" strokeWidth="1.7" />
      <path d="M18 22h.1m13 0h.1m-13 12h.1m13 0h.1" stroke="#ff8a24" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function AccessCard({ kind, onClick, onRegister }: { kind: "admin" | "user"; onClick: () => void; onRegister?: () => void }) {
  const admin = kind === "admin";
  const accent = admin ? "blue" : "orange";
  const title = admin ? "Admin" : "User";
  const icon = admin ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2v.2a2 2 0 1 1-4 0V19a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 12.2H3a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.4 5.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 1.4v-.2a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.8h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 2.8Z" transform="translate(0 2) scale(.9)"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>
  );
  return (
    <article className={`login-card login-card-${accent}`}>
      <div className="flex items-start justify-between">
        <div className={`login-card-icon ${admin ? "text-sky-300" : "text-orange-300"}`}>{icon}</div>
        <span className={`login-pill ${admin ? "text-sky-300" : "text-orange-300"}`}>{title}</span>
      </div>
      <h2 className="mt-2 text-[21px] font-extrabold uppercase tracking-tight text-white">{title} <span className={admin ? "text-sky-400" : "text-orange-400"}>Login</span></h2>
      <p className="mt-1.5 min-h-9 max-w-[29rem] text-[12px] leading-[1.45] text-slate-200/80">{admin ? "Manage users, plans & ID cards across the entire system console." : "Create and manage your own digital ID card and verification QR codes."}</p>
      <ul className={`mt-3 space-y-1.5 text-[10px] text-slate-200/90 ${admin ? "login-check-blue" : "login-check-orange"}`}>
        {features[kind].map((feature) => <li key={feature} className="flex items-center gap-2"><span aria-hidden="true">✓</span>{feature}</li>)}
      </ul>
      <div className="mt-auto space-y-1.5 pt-4">
        <button className={`login-action ${admin ? "login-action-blue" : "login-action-orange"}`} onClick={onClick}>Login <span>→</span></button>
        {!admin && <button className="login-action login-register" onClick={onRegister}>Register <span>→</span></button>}
      </div>
    </article>
  );
}

export default function LoginSelectionPage({ onSelectAdmin, onSelectUser, onRegister }: LoginSelectionPageProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="login-scene min-h-screen w-full overflow-auto px-4 py-8 text-white sm:px-8">
      <ThemeModeButton isDark={theme === "dark"} onToggle={toggleTheme} />
      <div className="login-scene-shade" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[960px] flex-col justify-center">
        <header className="relative mb-5 text-center sm:mb-7">
          <div className="absolute left-0 top-0 hidden items-center gap-2 sm:flex" aria-label="ResQRide logo">
            <span className="font-black italic leading-none"><span className="text-white">ResQ</span><span className="text-orange-400">Ride</span></span>
          </div>
          <div className="mb-1 flex justify-center"><ShieldMark /></div>
          <h1 className="font-manrope text-[38px] font-black italic leading-none tracking-[-2px] sm:text-[48px]">ResQ<span className="text-orange-400">Ride</span></h1>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[4px] text-slate-100 sm:text-[12px]">Vehicle QR Safety System</p>
          <p className="mt-1.5 text-[11px] text-slate-300">Your vehicle. Your emergency contact. One scan away.</p>
          <p className="mt-3 text-[10px] text-slate-300">Please select your login type to continue to the system.</p>
        </header>
        <main className="mx-auto grid w-full max-w-[730px] grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <AccessCard kind="admin" onClick={onSelectAdmin} />
          <AccessCard kind="user" onClick={onSelectUser} onRegister={onRegister} />
        </main>
        <footer className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[9px] text-slate-300/90">
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm border border-orange-400"/>Safer Journeys</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm border border-orange-400"/>Instant Help</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full border border-orange-400"/>Stronger Communities</span>
        </footer>
      </div>
    </div>
  );
}
