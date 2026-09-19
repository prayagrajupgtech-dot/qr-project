import { useTheme } from "../../App";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className={`border-b px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between sticky top-0 z-30 ${isDark ? "border-white/10 bg-slate-900/50" : "border-[#bbf7d0] bg-[#f0fdf4]/80"} backdrop-blur-md`}>
      <div className="pl-12 lg:pl-0 min-w-0">
        <h1 className={`text-lg sm:text-xl font-black uppercase tracking-tight ${isDark ? "text-white" : "text-[#064e3b]"} truncate`}>{title}</h1>
        {subtitle && <p className={`text-[10px] sm:text-xs font-semibold ${isDark ? "text-white/40" : "text-[#059669]"} truncate`}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            isDark
              ? "bg-white/10 text-white hover:bg-white/15"
              : "bg-[#d1fae5] text-[#047857] hover:bg-[#a7f3d0]"
          }`}
        >
          <span>{isDark ? "☀️" : "🌙"}</span>
          <span>{isDark ? "Light" : "Dark"}</span>
        </button>
        <span className={`inline-block w-2.5 h-2.5 rounded-full animate-pulse ${isDark ? "bg-emerald-400" : "bg-emerald-500"}`} />
        <span className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-emerald-400" : "text-[#059669]"}`}>Admin Mode</span>
      </div>
    </header>
  );
}
