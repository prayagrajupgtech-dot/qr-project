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
    <header className={`border-b backdrop-blur-md sticky top-0 z-50 p-4 ${isDark ? "border-white/5 bg-black/20" : "border-[#bbf7d0] bg-[#f0fdf4]/90"}`}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div
          onClick={() => onTabChange("home")}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-amber-500/20">
            ID
          </div>
          <span className={`font-black text-lg tracking-tighter uppercase ${isDark ? "text-white" : "text-[#064e3b]"}`}>Maurya Generator</span>
        </div>

        <div className={`flex items-center gap-2`}>
          <div className={`flex p-1 rounded-xl border overflow-x-auto ${isDark ? "bg-white/5 border-white/10" : "bg-[#d1fae5] border-[#bbf7d0]"}`}>
            <button
              onClick={() => onTabChange("home")}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                activeTab === "home" ? "bg-amber-500 text-black" : isDark ? "text-white/40 hover:text-white" : "text-[#059669] hover:text-[#064e3b]"
              }`}
            >
              HOME
            </button>
            <button
              onClick={() => onTabChange("apply")}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                activeTab === "apply" ? "bg-amber-500 text-black" : isDark ? "text-white/40 hover:text-white" : "text-[#059669] hover:text-[#064e3b]"
              }`}
            >
              CREATE CARD
            </button>
            <button
              onClick={() => onTabChange("my-card")}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                activeTab === "my-card" ? "bg-amber-500 text-black" : isDark ? "text-white/40 hover:text-white" : "text-[#059669] hover:text-[#064e3b]"
              }`}
            >
              MY CARD
            </button>
            <button
              onClick={() => onTabChange("profile")}
              className={`px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                activeTab === "profile" ? "bg-amber-500 text-black" : isDark ? "text-white/40 hover:text-white" : "text-[#059669] hover:text-[#064e3b]"
              }`}
            >
              PROFILE
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg text-sm transition-all ${isDark ? "bg-white/10 text-white/60 hover:text-white" : "bg-[#d1fae5] text-[#047857] hover:text-[#064e3b]"}`}
            title={isDark ? "Switch to Light" : "Switch to Dark"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg text-xs font-black text-red-400 hover:text-red-300 transition-colors"
          >
            LOG OUT
          </button>
        </div>
      </div>
    </header>
  );
}
