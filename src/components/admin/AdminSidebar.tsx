import { useState, useEffect } from "react";
import { useTheme } from "../../App";

interface AdminSidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ currentTab, onNavigate, onLogout }: AdminSidebarProps) {
  const { theme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin-notifications")
      .then(r => r.json())
      .then(d => { if (d.unreadCount) setUnreadCount(d.unreadCount); })
      .catch(() => {});
  }, [currentTab]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "analytics", label: "Analysis", icon: "📈" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "applications", label: "Applications", icon: "📝" },
    { id: "plans", label: "Plans", icon: "💎" },
    { id: "cards", label: "Cards / Generated", icon: "🪪" },
    { id: "create-card", label: "Create Card", icon: "➕" },
    { id: "notifications", label: "Notifications", icon: "🔔", badge: unreadCount },
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "activity", label: "Activity / Logs", icon: "📜" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const isDark = theme === "dark";

  return (
    <aside className={`w-64 border-r flex flex-col justify-between shrink-0 min-h-screen p-6 ${isDark ? "bg-slate-950 border-white/10" : "bg-[#052e16] border-[#065f46]"}`}>
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-black shadow-lg shadow-amber-500/20 text-lg">
            AD
          </div>
          <div>
            <h1 className="font-black text-sm uppercase tracking-wider text-white">Admin Panel</h1>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Maurya System</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(item => {
            const isActive = currentTab === item.id || (item.id === "users" && (currentTab === "user-details" || currentTab.startsWith("users/"))) || (item.id === "applications" && (currentTab === "application-details" || currentTab.startsWith("applications/")));
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-left ${
                  isActive
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {"badge" in item && typeof item.badge === "number" && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-white/10">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-all text-left"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
