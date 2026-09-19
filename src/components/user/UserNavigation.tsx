import { useTheme } from "../../App";

interface UserNavigationProps {
  activeTab: "home" | "my-card" | "apply" | "plans" | "profile";
  onTabChange: (tab: "home" | "my-card" | "apply" | "plans" | "profile") => void;
  onLogout: () => void;
}

export default function UserNavigation({ activeTab, onTabChange, onLogout }: UserNavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className={`border-b backdrop-blur-md sticky top-0 z-50 ${isDark ? "border-white/5 bg-black/20" : "border-[#bbf7d0] bg-[#f0fdf4]/90"}`}>
      {/* Desktop nav */}
      <div className="hidden sm:flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
        <div onClick={() => onTabChange("home")} className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-amber-500/20">ID</div>
          <span className={`font-black text-lg tracking-tighter uppercase ${isDark ? "text-white" : "text-[#064e3b]"}`}>Maurya Generator</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex p-1 rounded-xl border ${isDark ? "bg-white/5 border-white/10" : "bg-[#d1fae5] border-[#bbf7d0]"}`}>
            {(["home", "apply", "my-card", "profile"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                  activeTab === tab ? "bg-amber-500 text-black" : isDark ? "text-white/40 hover:text-white" : "text-[#059669] hover:text-[#064e3b]"
                }`}
              >
                {tab === "my-card" ? "MY CARD" : tab === "apply" ? "CREATE CARD" : tab.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={toggleTheme} className={`p-2 rounded-lg text-sm transition-all ${isDark ? "bg-white/10 text-white/60 hover:text-white" : "bg-[#d1fae5] text-[#047857] hover:text-[#064e3b]"}`}>
            {isDark ? "☀️" : "🌙"}
          </button>
          <button onClick={onLogout} className="px-3 py-2 rounded-lg text-xs font-black text-red-400 hover:text-red-300 transition-colors">LOG OUT</button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="sm:hidden flex items-center justify-between px-4 py-3">
        <div onClick={() => onTabChange("home")} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-black text-black text-sm">ID</div>
          <span className={`font-black text-sm tracking-tighter uppercase ${isDark ? "text-white" : "text-[#064e3b]"}`}>Maurya</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-lg text-sm ${isDark ? "bg-white/10 text-white/60" : "bg-[#d1fae5] text-[#047857]"}`}>
            {isDark ? "☀️" : "🌙"}
          </button>
          <button onClick={onLogout} className="px-2 py-2 rounded-lg text-xs font-black text-red-400">EXIT</button>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex justify-around py-2 px-1 ${isDark ? "border-white/10 bg-slate-950/95" : "border-[#bbf7d0] bg-[#f0fdf4]/95"}`}>
        {([
          { tab: "home" as const, icon: "🏠", label: "HOME" },
          { tab: "apply" as const, icon: "📝", label: "APPLY" },
          { tab: "my-card" as const, icon: "🪪", label: "MY CARD" },
          { tab: "profile" as const, icon: "👤", label: "PROFILE" },
        ]).map(item => (
          <button
            key={item.tab}
            onClick={() => onTabChange(item.tab)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
              activeTab === item.tab ? "text-amber-500" : isDark ? "text-white/40" : "text-[#059669]"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[9px] font-black tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
