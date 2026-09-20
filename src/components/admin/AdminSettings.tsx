import { useState, useEffect } from "react";
import { useTheme } from "../../App";

export default function AdminSettings() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const name = localStorage.getItem("maurya_admin_name") || "Administrator";
    const email = localStorage.getItem("maurya_admin_email") || "admin@mauryagenerator.com";
    setAdminName(name);
    setAdminEmail(email);
    setEditName(name);
  }, []);

  const getInitials = (n: string) => n.split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2) || "AD";

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setAdminName(editName.trim());
    localStorage.setItem("maurya_admin_name", editName.trim());
    setIsEditing(false);
    setMsg({ type: "success", text: "Profile name updated successfully." });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleChangePassword = async () => {
    setMsg({ type: "", text: "" });
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMsg({ type: "error", text: "All password fields are required." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/admin-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change-password", currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: data.message || "Password changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMsg({ type: "error", text: data.error || "Failed to change password." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setChangingPassword(false);
      setTimeout(() => setMsg({ type: "", text: "" }), 5000);
    }
  };

  const s = (dark: string, light: string) => isDark ? dark : light;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Settings</h2>
        <p className={`text-xs ${s("text-white/40", "text-[#047857]")}`}>
          Manage your admin profile, password, and view system configuration.
        </p>
      </div>

      {/* Status Message */}
      {msg.text && (
        <div className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
          msg.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Profile Section */}
      <div className={`${s("bg-white/5 border-white/10", "bg-[#f0fdf4] border-[#bbf7d0]")} border rounded-[2.5rem] p-8`}>
        <div className="flex items-start justify-between mb-6">
          <h3 className={`text-[10px] font-black text-amber-500 uppercase tracking-widest`}>
            Profile Information
          </h3>
          {!isEditing && (
            <button
              onClick={() => { setIsEditing(true); setEditName(adminName); }}
              className="text-xs font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${s("bg-amber-500/20", "bg-amber-100")}`}>
            <span className={`text-xl font-black ${s("text-amber-500", "text-amber-600")}`}>
              {getInitials(adminName)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold outline-none transition-colors ${
                  s("bg-white/5 border border-white/10 text-white focus:border-amber-500", "bg-[#d1fae5] border border-[#bbf7d0] text-[#064e3b] focus:border-[#059669]")
                }`}
              />
            ) : (
              <h4 className={`text-lg font-black ${s("text-white", "text-[#064e3b]")}`}>{adminName}</h4>
            )}
            <p className={`text-xs font-semibold mt-1 ${s("text-white/40", "text-[#047857]")}`}>{adminEmail}</p>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-3">
            <button
              onClick={handleSaveProfile}
              className="bg-amber-500 text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={() => { setIsEditing(false); setEditName(adminName); }}
              className={`${s("bg-white/10 text-white/50 hover:bg-white/15", "bg-[#d1fae5] text-[#047857] hover:bg-[#a7f3d0]")} px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors`}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className={`${s("bg-black/30 border-white/5", "bg-[#d1fae5] border-[#dcfce7]")} border px-4 py-3 rounded-xl`}>
            <p className={`text-[10px] font-black ${s("text-white/30", "text-[#059669]")} uppercase tracking-widest`}>Role</p>
            <p className={`text-sm font-black mt-1 ${s("text-white", "text-[#064e3b]")}`}>Administrator</p>
          </div>
          <div className={`${s("bg-black/30 border-white/5", "bg-[#d1fae5] border-[#dcfce7]")} border px-4 py-3 rounded-xl`}>
            <p className={`text-[10px] font-black ${s("text-white/30", "text-[#059669]")} uppercase tracking-widest`}>Status</p>
            <p className="text-sm font-black mt-1 text-emerald-400">Active</p>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className={`${s("bg-white/5 border-white/10", "bg-[#f0fdf4] border-[#bbf7d0]")} border rounded-[2.5rem] p-8`}>
        <h3 className={`text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6`}>
          Change Password
        </h3>

        <div className="space-y-4">
          <div>
            <label className={`text-[10px] font-black ${s("text-white/30", "text-[#059669]")} uppercase tracking-widest block mb-2`}>
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={`w-full px-4 py-2.5 pr-10 rounded-xl text-sm font-semibold outline-none transition-colors ${
                  s("bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-amber-500", "bg-[#d1fae5] border border-[#bbf7d0] text-[#064e3b] placeholder-[#059669]/50 focus:border-[#059669]")
                }`}
              />
              <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors ${s("text-white/50 hover:text-white", "text-[#059669]/60 hover:text-[#059669]")}`}>
                {showCurrentPass ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          <div>
            <label className={`text-[10px] font-black ${s("text-white/30", "text-[#059669]")} uppercase tracking-widest block mb-2`}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className={`w-full px-4 py-2.5 pr-10 rounded-xl text-sm font-semibold outline-none transition-colors ${
                  s("bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-amber-500", "bg-[#d1fae5] border border-[#bbf7d0] text-[#064e3b] placeholder-[#059669]/50 focus:border-[#059669]")
                }`}
              />
              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors ${s("text-white/50 hover:text-white", "text-[#059669]/60 hover:text-[#059669]")}`}>
                {showNewPass ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          <div>
            <label className={`text-[10px] font-black ${s("text-white/30", "text-[#059669]")} uppercase tracking-widest block mb-2`}>
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`w-full px-4 py-2.5 pr-10 rounded-xl text-sm font-semibold outline-none transition-colors ${
                  s("bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-amber-500", "bg-[#d1fae5] border border-[#bbf7d0] text-[#064e3b] placeholder-[#059669]/50 focus:border-[#059669]")
                }`}
              />
              <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors ${s("text-white/50 hover:text-white", "text-[#059669]/60 hover:text-[#059669]")}`}>
                {showConfirmPass ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="bg-amber-500 text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className={`${s("bg-white/5 border-white/10", "bg-[#f0fdf4] border-[#bbf7d0]")} border rounded-[2.5rem] p-8`}>
        <h3 className={`text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6`}>
          System Information
        </h3>
        <div className="space-y-0">
          {[
            ["Authentication", "Role-Based Access Control (RBAC) active"],
            ["Database", "Supabase Serverless & Service Role API"],
            ["Payment Gateway", "Razorpay Integration"],
            ["Session Security", "Server-side `.env` secured"],
            ["Platform", "React + TypeScript + Tailwind CSS"],
          ].map(([label, value]) => (
            <div key={label} className={`flex items-center justify-between py-3 border-b ${s("border-white/5", "border-[#dcfce7]")}`}>
              <span className={`text-xs font-semibold ${s("text-white/50", "text-[#047857]")}`}>{label}</span>
              <span className={`text-xs font-black ${s("text-white", "text-[#064e3b]")}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-8">
        <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-4">
          Danger Zone
        </h3>
        <p className={`text-xs ${s("text-white/40", "text-[#047857]")} mb-4`}>
          These actions are irreversible. Proceed with caution.
        </p>
        <div className="flex gap-3">
          <button className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors">
            Clear All Notifications
          </button>
          <button className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors">
            Reset System Logs
          </button>
        </div>
      </div>
    </div>
  );
}
