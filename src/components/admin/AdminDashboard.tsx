import { useEffect, useState } from "react";
import { useTheme } from "../../App";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalCards: number;
  activeCards: number;
  totalApplications: number;
  pendingApplications: number;
  completedApplications: number;
  totalPayments: number;
  successfulPayments: number;
  pendingPayments: number;
  unreadNotifications: number;
  usersByPlan: Record<string, number>;
  recentUsers: Array<{ id: string; name: string; email: string; plan: string; status: string; created_at: string }>;
  recentApplications: Array<{ id: string; full_name: string; status: string; completion_percentage: number; created_at: string }>;
  recentPayments: Array<{ id: string; amount: number; status: string; created_at: string }>;
  recentLogs: Array<{ id: string; action: string; details: string; created_at: string }>;
}

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { theme } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin-stats");
        const data = await response.json();
        if (response.ok) setStats(data);
        else setError(data.error || "Failed to load admin statistics.");
      } catch {
        setError("Network error fetching statistics.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs font-black uppercase tracking-[3px] text-white/40">Loading Dashboard Metrics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
        <p className="text-sm font-bold text-red-300">{error || "Could not load stats."}</p>
      </div>
    );
  }

  const isDark = theme === "dark";
  const card = isDark ? "bg-white/5 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]";
  const innerCard = isDark ? "bg-black/30 border-white/5" : "bg-[#d1fae5] border-[#dcfce7]";
  const textMain = isDark ? "text-white" : "text-[#064e3b]";
  const textSub = isDark ? "text-white/40" : "text-[#047857]";
  // const textMuted = isDark ? "text-white/60" : "text-gray-600";

  return (
    <div className="space-y-8">
      {/* Stat Cards Row 1 - Core Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className={`${card} border p-4 sm:p-5 rounded-2xl relative overflow-hidden`}>
          <p className={`text-[10px] font-black ${textSub} uppercase tracking-[3px]`}>Users</p>
          <p className={`text-2xl sm:text-3xl font-black mt-2 ${textMain}`}>{stats.totalUsers}</p>
          <div className="absolute right-3 bottom-3 text-2xl opacity-20">👥</div>
        </div>
        <div className={`${card} border p-4 sm:p-5 rounded-2xl relative overflow-hidden`}>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[3px]">Applications</p>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-amber-500">{stats.totalApplications}</p>
          <div className="absolute right-3 bottom-3 text-2xl opacity-20">📝</div>
        </div>
        <div className={`${card} border p-4 sm:p-5 rounded-2xl relative overflow-hidden`}>
          <p className="text-[10px] font-black text-yellow-400 uppercase tracking-[3px]">Pending</p>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-yellow-400">{stats.pendingApplications}</p>
          <div className="absolute right-3 bottom-3 text-2xl opacity-20">⏳</div>
        </div>
        <div className={`${card} border p-4 sm:p-5 rounded-2xl relative overflow-hidden`}>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[3px]">Payments</p>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-emerald-400">{stats.successfulPayments}</p>
          <div className="absolute right-3 bottom-3 text-2xl opacity-20">💳</div>
        </div>
        <div className={`${card} border p-4 sm:p-5 rounded-2xl relative overflow-hidden`}>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[3px]">Cards</p>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-blue-400">{stats.activeCards}</p>
          <div className="absolute right-3 bottom-3 text-2xl opacity-20">🪪</div>
        </div>
        <div className={`${card} border p-4 sm:p-5 rounded-2xl relative overflow-hidden cursor-pointer`} onClick={() => onNavigate("notifications")}>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-[3px]">Notif.</p>
          <p className="text-2xl sm:text-3xl font-black mt-2 text-red-400">{stats.unreadNotifications}</p>
          <div className="absolute right-3 bottom-3 text-2xl opacity-20">🔔</div>
        </div>
      </div>

      {/* Plan-wise Breakdown */}
      <div className={`${card} border rounded-[2rem] p-4 sm:p-6 lg:p-8`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className={`text-base sm:text-lg font-black uppercase tracking-tight ${textMain}`}>Users by Plan</h2>
          <button onClick={() => onNavigate("plans")} className="text-[10px] sm:text-xs font-black uppercase text-amber-500 tracking-wider hover:underline">
            Manage →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(stats.usersByPlan).map(([planName, count]) => (
            <div key={planName} className={`${innerCard} border p-5 rounded-2xl flex items-center justify-between`}>
              <div>
                <p className={`text-xs font-black uppercase tracking-wider ${textSub}`}>{planName} Plan</p>
                <p className={`text-2xl font-black mt-1 ${textMain}`}>{count} Users</p>
              </div>
              <span className="text-xl">💎</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Applications */}
        <div className={`${card} border rounded-[2rem] p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className={`text-sm sm:text-base font-black uppercase tracking-tight ${textMain}`}>Recent Applications</h2>
            <button onClick={() => onNavigate("applications")} className="text-xs font-black uppercase text-amber-500 hover:underline">View All →</button>
          </div>
          <div className="space-y-2">
            {stats.recentApplications?.length > 0 ? stats.recentApplications.map(app => (
              <div key={app.id} className={`${innerCard} border p-3 rounded-xl flex items-center justify-between text-xs`}>
                <div>
                  <p className={`font-black ${textMain}`}>{app.full_name}</p>
                  <p className={textSub}>{app.completion_percentage}% complete</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  app.status === "card_issued" || app.status === "card_active" ? "bg-emerald-500/10 text-emerald-400" :
                  app.status === "payment_pending" ? "bg-amber-500/10 text-amber-400" :
                  "bg-white/10 text-white/50"
                }`}>{app.status}</span>
              </div>
            )) : <p className={`text-xs ${textSub}`}>No applications yet.</p>}
          </div>
        </div>

        {/* Recent Users */}
        <div className={`${card} border rounded-[2rem] p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className={`text-sm sm:text-base font-black uppercase tracking-tight ${textMain}`}>Recent Users</h2>
            <button onClick={() => onNavigate("users")} className="text-xs font-black uppercase text-amber-500 hover:underline">View All →</button>
          </div>
          <div className="space-y-2">
            {stats.recentUsers.length > 0 ? stats.recentUsers.map(user => (
              <div key={user.id} className={`${innerCard} border p-3 rounded-xl flex items-center justify-between text-xs`}>
                <div>
                  <p className={`font-black ${textMain}`}>{user.name}</p>
                  <p className={textSub}>{user.email}</p>
                </div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 font-black rounded text-[10px] uppercase">{user.plan}</span>
              </div>
            )) : <p className={`text-xs ${textSub}`}>No recent users.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
