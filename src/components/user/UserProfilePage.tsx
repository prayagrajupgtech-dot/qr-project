import { useEffect, useState } from "react";
import { useTheme } from "../../App";
import { useAuth } from "../../contexts/AuthContext";
import { countries } from "../../utils/countries";
import PasswordStrength from "../PasswordStrength";

interface UserProfileProps {
  user: {
    id: string;
    email: string;
    display_name?: string;
    phone?: string;
    country?: string;
    country_code?: string;
    status?: string;
    created_at?: string;
  } | null;
  assignedPlan: {
    name: string;
    price: number;
    duration_days: number;
    card_limit: number;
  } | null;
  cardsCount: number;
  onProfileUpdated?: (profile: NonNullable<UserProfileProps["user"]>) => void;
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCountryFlag(countryCode?: string): string {
  if (!countryCode) return "";
  const country = countries.find((c) => c.code === countryCode.toUpperCase());
  return country?.flag || "";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

export default function UserProfilePage({ user, assignedPlan, cardsCount, onProfileUpdated }: UserProfileProps) {
  const { theme } = useTheme();
  const { session } = useAuth();

  const getAuthHeaders = () => {
    const token = session?.access_token || localStorage.getItem("maurya_user_token") || "";
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [editName, setEditName] = useState(user?.display_name || "");
  const [editCountry, setEditCountry] = useState(user?.country || "");
  const [editCountryCode, setEditCountryCode] = useState(user?.country_code || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [editPhotoAction, setEditPhotoAction] = useState<"none" | "upload" | "remove">("none");

  // Sync edit fields when the user profile loads/updates from parent.
  // Without this, opening Profile before dashboard fetch finishes leaves the form empty forever.
  useEffect(() => {
    if (!editing) {
      setEditName(user?.display_name || "");
      setEditCountry(user?.country || "");
      setEditCountryCode(user?.country_code || "");
      setEditPhone(user?.phone || "");
      setEditPhoto(null);
      setEditPhotoAction("none");
    }
  }, [user?.id, user?.display_name, user?.phone, user?.country, user?.country_code]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const card = `bg-white/5 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 space-y-6`;
  const label = "text-[10px] font-black uppercase tracking-widest text-white/30";
  const inputBase =
    "w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none transition-all border " +
    (theme === "dark"
      ? "bg-black/30 border-white/10 text-white placeholder-white/30 focus:border-amber-500/50"
      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-amber-500/50");

  const handleCountryChange = (code: string) => {
    setEditCountry(code);
    const country = countries.find((c) => c.code === code);
    if (country) {
      setEditCountryCode(country.callingCode);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Only PNG, JPEG, and WEBP images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be less than 5MB.");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setEditPhoto(base64);
      setEditPhotoAction("upload");
      setError("");
    } catch {
      setError("Failed to read image file.");
    }
  };

  const handleRemovePhoto = () => {
    setEditPhoto(null);
    setEditPhotoAction("remove");
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, string> = {
        display_name: editName,
        country: editCountry,
        country_code: editCountryCode,
        phone: editPhone,
      };

      if (editPhotoAction === "upload" && editPhoto) {
        body.photo_url = editPhoto;
      } else if (editPhotoAction === "remove") {
        body.photo_url = "";
      }

      const res = await fetch("/api/user-profile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");

      if (data.profile && onProfileUpdated) {
        onProfileUpdated(data.profile);
      }
      setSuccess("Profile updated successfully.");
      setEditing(false);
      setEditPhoto(null);
      setEditPhotoAction("none");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    setSavingPassword(true);
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/user-change-password", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password.");

      setSuccess("Password changed successfully.");
      setChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(user?.display_name || "");
    setEditCountry(user?.country || "");
    setEditCountryCode(user?.country_code || "");
    setEditPhone(user?.phone || "");
    setEditPhoto(null);
    setEditPhotoAction("none");
    setEditing(false);
    setError("");
  };

  const handleCancelPassword = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangingPassword(false);
    setError("");
  };

  const displayPhoto = editing
    ? editPhotoAction === "remove"
      ? null
      : editPhoto
    : user?.id
      ? `/api/user-photo/${user.id}`
      : null;

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {/* Status messages */}
      {error && (
        <div className="px-5 py-3 rounded-2xl text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="px-5 py-3 rounded-2xl text-sm font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          {success}
        </div>
      )}

      {/* Profile Display / Edit */}
      <div className={card}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[5px]">
              User Profile
            </span>
            <h2 className="text-2xl font-black uppercase mt-2">
              {user?.display_name || user?.email || "Account Profile"}
            </h2>
            <p className="text-xs text-white/40">{user?.email}</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2.5 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-colors shrink-0"
            >
              Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          /* Edit Mode */
          <div className="space-y-5 border-t border-white/10 pt-6">
            {/* Photo */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-white/10 flex items-center justify-center text-3xl">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{user?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}</span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-amber-400 transition-colors">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </label>
              </div>
              {editPhotoAction === "upload" && (
                <button
                  onClick={handleRemovePhoto}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className={label}>Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                className={inputBase}
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label className={label}>Email</label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className={`${inputBase} opacity-50 cursor-not-allowed`}
              />
            </div>

            {/* Country + Calling Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={label}>Country</label>
                <select
                  value={editCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className={inputBase}
                >
                  <option value="">Select country</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={label}>Calling Code</label>
                <input
                  type="text"
                  value={editCountryCode}
                  readOnly
                  className={`${inputBase} opacity-60 cursor-not-allowed`}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className={label}>Mobile Number</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Enter mobile number"
                className={inputBase}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-6 py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={savingProfile}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white/50 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6 border-t border-white/10 pt-6">
            {/* Photo + basic info */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-white/10 flex items-center justify-center text-3xl">
                {displayPhoto ? (
                  <img
                    src={displayPhoto}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span>{user?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
              <div className="text-center">
                <p className="text-lg font-black">{user?.display_name || "No name set"}</p>
                <p className="text-xs text-white/40">{user?.email}</p>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-black/30 p-5 rounded-2xl space-y-1">
                <p className={label}>Country</p>
                <p className="font-bold text-white">
                  {getCountryFlag(user?.country)}{" "}
                  {countries.find((c) => c.code === user?.country)?.name || user?.country || "N/A"}
                </p>
              </div>
              <div className="bg-black/30 p-5 rounded-2xl space-y-1">
                <p className={label}>Mobile</p>
                <p className="font-bold text-white">
                  {user?.country_code || ""} {user?.phone || "Not set"}
                </p>
              </div>
              <div className="bg-black/30 p-5 rounded-2xl space-y-1">
                <p className={label}>Account Status</p>
                <span className="inline-block px-2.5 py-1 bg-emerald-500/10 text-emerald-400 font-black rounded-lg uppercase">
                  {user?.status || "active"}
                </span>
              </div>
              <div className="bg-black/30 p-5 rounded-2xl space-y-1">
                <p className={label}>Member Since</p>
                <p className="font-bold text-white">{formatDate(user?.created_at)}</p>
              </div>
            </div>

            {/* Plan + Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-black/20 p-5 rounded-2xl space-y-1">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  Current Plan
                </p>
                <p className="font-black text-white text-base">{assignedPlan?.name || "Basic Plan"}</p>
                <p className="text-[11px] text-white/40 font-semibold">
                  Limit:{" "}
                  {assignedPlan?.card_limit === -1
                    ? "Unlimited"
                    : `${assignedPlan?.card_limit || 100} Cards`}
                </p>
              </div>
              <div className="bg-black/20 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className={label}>Cards Issued</p>
                  <p className="font-black text-white text-xl mt-1">{cardsCount}</p>
                </div>
                <span className="text-2xl">🪪</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[5px]">
              Security
            </span>
            <h2 className="text-xl font-black uppercase mt-2">Change Password</h2>
          </div>
          {!changingPassword && (
            <button
              onClick={() => setChangingPassword(true)}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/50 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-colors shrink-0"
            >
              Change Password
            </button>
          )}
        </div>

        {changingPassword && (
          <div className="space-y-5 border-t border-white/10 pt-6">
            <div className="space-y-1.5">
              <label className={label}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={inputBase}
              />
            </div>

            <div className="space-y-1.5">
              <label className={label}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={inputBase}
              />
              {newPassword && (
                <div className="mt-3">
                  <PasswordStrength password={newPassword} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className={label}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={inputBase}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSavePassword}
                disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="px-6 py-3 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {savingPassword ? "Saving..." : "Update Password"}
              </button>
              <button
                onClick={handleCancelPassword}
                disabled={savingPassword}
                className="px-6 py-3 bg-white/5 border border-white/10 text-white/50 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
