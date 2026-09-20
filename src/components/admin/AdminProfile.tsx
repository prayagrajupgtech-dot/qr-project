import { useState, useEffect } from "react";
import { useTheme } from "../../App";
import PasswordStrength from "../PasswordStrength";

interface AdminProfileProps {
  adminEmail: string;
}

interface AdminProfileData {
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("maurya_admin_token") || "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
};

export default function AdminProfile({ adminEmail }: AdminProfileProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<AdminProfileData>({
    name: "Administrator",
    email: adminEmail,
    role: "Administrator",
    status: "Active",
    lastLogin: new Date().toLocaleString()
  });
  const [editName, setEditName] = useState(profileData.name);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const savedProfile = localStorage.getItem("maurya_admin_profile");
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      setProfileData(prev => ({ ...prev, ...parsed, email: adminEmail }));
      setEditName(parsed.name || "Administrator");
    }
  }, [adminEmail]);

  const handleSaveProfile = () => {
    const updatedProfile = { ...profileData, name: editName };
    setProfileData(updatedProfile);
    localStorage.setItem("maurya_admin_profile", JSON.stringify(updatedProfile));
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(profileData.name);
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    try {
      const response = await fetch("/api/admin-session", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "change-password", currentPassword, newPassword })
      });
      const result = await response.json();

      if (response.ok) {
        setPasswordSuccess("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(result.error || "Failed to change password");
      }
    } catch {
      setPasswordError("Failed to change password. Please try again.");
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "AD";
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Admin Profile</h2>
        <p className={`text-xs ${theme === "dark" ? "text-white/40" : "text-gray-500"}`}>
          Manage your administrator profile and security settings
        </p>
      </div>

      {/* Profile Display Section */}
      <div className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-[2.5rem] p-8`}>
        <div className="flex items-start justify-between mb-6">
          <h3 className={`text-[10px] font-black ${theme === "dark" ? "text-amber-500" : "text-amber-600"} uppercase tracking-widest`}>
            Profile Information
          </h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"}`}>
            <span className={`text-2xl font-black ${theme === "dark" ? "text-amber-500" : "text-amber-600"}`}>
              {getInitials(profileData.name)}
            </span>
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm font-semibold ${
                  theme === "dark"
                    ? "bg-white/5 border border-white/10 text-white focus:border-amber-500"
                    : "bg-gray-50 border border-gray-200 text-gray-900 focus:border-amber-500"
                } outline-none transition-colors`}
              />
            ) : (
              <h4 className={`text-lg font-black ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {profileData.name}
              </h4>
            )}
            <p className={`text-sm ${theme === "dark" ? "text-white/50" : "text-gray-500"} font-semibold mt-1`}>
              {profileData.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`${theme === "dark" ? "bg-black/30 border-white/10" : "bg-gray-50 border-gray-200"} border px-4 py-3 rounded-xl`}>
            <p className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-gray-400"} uppercase tracking-widest`}>
              Role
            </p>
            <span className="inline-block mt-1 px-3 py-1 bg-amber-500/10 text-amber-500 font-black rounded-lg uppercase text-xs">
              {profileData.role}
            </span>
          </div>
          <div className={`${theme === "dark" ? "bg-black/30 border-white/10" : "bg-gray-50 border-gray-200"} border px-4 py-3 rounded-xl`}>
            <p className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-gray-400"} uppercase tracking-widest`}>
              Status
            </p>
            <span className="inline-block mt-1 px-3 py-1 bg-emerald-500/10 text-emerald-500 font-black rounded-lg uppercase text-xs">
              {profileData.status}
            </span>
          </div>
        </div>

        <div className={`mt-4 pt-4 border-t ${theme === "dark" ? "border-white/10" : "border-gray-200"}`}>
          <p className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-gray-400"} uppercase tracking-widest`}>
            Last Login
          </p>
          <p className={`text-sm ${theme === "dark" ? "text-white/60" : "text-gray-600"} font-semibold mt-1`}>
            {profileData.lastLogin}
          </p>
        </div>

        {isEditing && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveProfile}
              className="bg-amber-500 text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancelEdit}
              className={`${theme === "dark" ? "bg-white/5 text-white/50 hover:bg-white/10" : "bg-gray-100 text-gray-500 hover:bg-gray-200"} px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-colors`}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-[2.5rem] p-8`}>
        <h3 className={`text-[10px] font-black ${theme === "dark" ? "text-amber-500" : "text-amber-600"} uppercase tracking-widest mb-6`}>
          Change Password
        </h3>

        <div className={`${theme === "dark" ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"} border rounded-xl p-4 mb-6`}>
          <p className={`text-xs ${theme === "dark" ? "text-amber-400" : "text-amber-700"} font-semibold`}>
            Admin password is configured via environment variable. Contact system administrator to change.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-gray-400"} uppercase tracking-widest block mb-2`}>
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-xl text-sm font-semibold ${
                  theme === "dark"
                    ? "bg-white/5 border border-white/10 text-white focus:border-amber-500"
                    : "bg-gray-50 border border-gray-200 text-gray-900 focus:border-amber-500"
                } outline-none transition-colors`}
              />
              <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showCurrentPass ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          <div>
            <label className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-gray-400"} uppercase tracking-widest block mb-2`}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-xl text-sm font-semibold ${
                  theme === "dark"
                    ? "bg-white/5 border border-white/10 text-white focus:border-amber-500"
                    : "bg-gray-50 border border-gray-200 text-gray-900 focus:border-amber-500"
                } outline-none transition-colors`}
              />
              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showNewPass ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
            {newPassword && <PasswordStrength password={newPassword} />}
          </div>

          <div>
            <label className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-gray-400"} uppercase tracking-widest block mb-2`}>
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-10 rounded-xl text-sm font-semibold ${
                  theme === "dark"
                    ? "bg-white/5 border border-white/10 text-white focus:border-amber-500"
                    : "bg-gray-50 border border-gray-200 text-gray-900 focus:border-amber-500"
                } outline-none transition-colors`}
              />
              <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showConfirmPass ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              </button>
            </div>
          </div>

          {passwordError && (
            <p className="text-xs text-red-400 font-semibold">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-xs text-emerald-400 font-semibold">{passwordSuccess}</p>
          )}

          <button
            onClick={handleChangePassword}
            className="bg-amber-500 text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-colors"
          >
            Update Password
          </button>
        </div>
      </div>

      {/* System Info Section */}
      <div className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-[2.5rem] p-8`}>
        <h3 className={`text-[10px] font-black ${theme === "dark" ? "text-amber-500" : "text-amber-600"} uppercase tracking-widest mb-6`}>
          System Information
        </h3>

        <div className="space-y-4">
          <div className={`flex items-center justify-between py-3 border-b ${theme === "dark" ? "border-white/10" : "border-gray-200"}`}>
            <span className={`text-xs font-semibold ${theme === "dark" ? "text-white/50" : "text-gray-500"}`}>
              Application Version
            </span>
            <span className={`text-xs font-black ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              v1.0.0
            </span>
          </div>

          <div className={`flex items-center justify-between py-3 border-b ${theme === "dark" ? "border-white/10" : "border-gray-200"}`}>
            <span className={`text-xs font-semibold ${theme === "dark" ? "text-white/50" : "text-gray-500"}`}>
              Database Status
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-black text-emerald-400">Connected</span>
            </div>
          </div>

          <div className={`flex items-center justify-between py-3`}>
            <span className={`text-xs font-semibold ${theme === "dark" ? "text-white/50" : "text-gray-500"}`}>
              Last Backup
            </span>
            <span className={`text-xs font-black ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
