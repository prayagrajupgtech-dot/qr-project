import { useState, useEffect, createContext, useContext, ReactNode } from "react";

// Auth & Components
import AdminLogin from "./components/AdminLogin";
import UserLogin from "./components/UserLogin";
import UserRegister from "./components/UserRegister";
import LoginSelectionPage from "./components/auth/LoginSelectionPage";
import PersonDetailView from "./components/PersonDetailView";
import SetupPasswordPage from "./components/SetupPasswordPage";
import { useAuth } from "./contexts/AuthContext";

// Admin Panel Components
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminUsers from "./components/admin/AdminUsers";
import AdminUserDetails from "./components/admin/AdminUserDetails";
import AdminPlans from "./components/admin/AdminPlans";
import AdminCardsList from "./components/admin/AdminCardsList";
import AdminCreateCard from "./components/admin/AdminCreateCard";
import AdminActivity from "./components/admin/AdminActivity";
import AdminSettings from "./components/admin/AdminSettings";
import AdminApplications from "./components/admin/AdminApplications";
import AdminApplicationDetails from "./components/admin/AdminApplicationDetails";
import AdminNotifications from "./components/admin/AdminNotifications";
import AdminAnalytics from "./components/admin/AdminAnalytics";
import AdminProfile from "./components/admin/AdminProfile";

// User Panel Components
import UserNavigation from "./components/user/UserNavigation";
import UserMyCardPage from "./components/user/UserMyCardPage";
import UserProfilePage from "./components/user/UserProfilePage";
import UserApplicationForm from "./components/user/UserApplicationForm";

// Theme Context
type Theme = "dark" | "light";
interface ThemeContextValue { theme: Theme; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggleTheme: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("maurya_theme") as Theme) || "dark");
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("maurya_theme", next);
  };
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

interface VerificationData {
  databaseVerified: boolean;
  idNumber: string;
  name: string;
  phone: string;
  parentPhone?: string | null;
  photoUrl?: string;
  dateOfBirth?: string;
  address?: string;
  planName?: string;
  status: "active" | "expired" | "blocked" | "legacy";
}

function decodeData(encoded: string): any {
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const decoded = decodeURIComponent(atob(base64));
    const [name, phone, idNumber] = decoded.split("|");
    return { name, phone, idNumber };
  } catch (e) {
    return null;
  }
}

function AppInner() {
  const { session: userSession, user: currentUser, signOut } = useAuth();
  const { theme } = useTheme();

  // Routing State
  const [currentHash, setCurrentHash] = useState(window.location.hash || "#/");
  const [viewData, setViewData] = useState<VerificationData | null>(null);
  const [verificationState, setVerificationState] = useState<"idle" | "loading" | "not-found" | "error">("idle");

  // Admin Auth State
  const [adminSession, setAdminSession] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);
  const [selectedAdminAppId, setSelectedAdminAppId] = useState<string | null>(null);

  // User Dashboard / Plan Data State
  const [userData, setUserData] = useState<{
    profile: { id: string; email: string; display_name?: string; status?: string; country?: string; country_code?: string; phone?: string; created_at?: string } | null;
    plan: { name: string; price: number; duration_days: number; card_limit: number } | null;
    cards: Array<any>;
    application: { id: string; status: string; completion_percentage: number; plan_id: string | null; submitted_at: string | null } | null;
  }>({ profile: null, plan: null, cards: [], application: null });

  const [userTab, setUserTab] = useState<"home" | "my-card" | "apply" | "plans" | "profile">("home");
  const [userBlockedMessage, setUserBlockedMessage] = useState("");

  // Keep userTab in sync with the URL hash so tabs (incl. Profile) survive reload/back button
  const syncUserTabFromHash = (hash: string) => {
    if (hash === "#/my-card") setUserTab("my-card");
    else if (hash === "#/apply") setUserTab("apply");
    else if (hash === "#/plans") setUserTab("plans");
    else if (hash === "#/profile") setUserTab("profile");
    else if (hash === "#/home") setUserTab("home");
  };

  const handleUserTabChange = (tab: "home" | "my-card" | "apply" | "plans" | "profile") => {
    setUserTab(tab);
    const targetHash = `#/${tab === "home" ? "home" : tab}`;
    if (window.location.hash !== targetHash) window.location.hash = targetHash;
  };

  // Sync Hash & Route Guards
  useEffect(() => {
    let requestNumber = 0;

    const handleRoute = async () => {
      const currentRequest = ++requestNumber;
      const hash = window.location.hash || "#/";
      setCurrentHash(hash);
      syncUserTabFromHash(hash);

      // Check Verification routes - support both UUID and card_number
      if (hash.startsWith("#/verify/")) {
        const cardId = hash.split("#/verify/")[1];
        setViewData(null);
        setVerificationState("loading");
        try {
          const response = await fetch(`/api/verify-card?id=${encodeURIComponent(cardId)}`);
          const result = await response.json();
          if (currentRequest !== requestNumber) return;
          if (response.status === 404) {
            setVerificationState("not-found");
            return;
          }
          if (!response.ok) {
            setVerificationState("error");
            return;
          }
          setViewData({
            databaseVerified: true,
            idNumber: result.cardNumber,
            name: result.name,
            phone: result.phone,
            parentPhone: result.parentPhone || null,
            photoUrl: result.photoUrl,
            dateOfBirth: result.dateOfBirth,
            address: result.address,
            planName: result.planName,
            status: result.status
          });
          setVerificationState("idle");
        } catch {
          if (currentRequest === requestNumber) setVerificationState("error");
        }
        return;
      }

      if (hash.startsWith("#/v/")) {
        const encoded = hash.split("#/v/")[1];
        if (encoded) {
          const decoded = decodeData(encoded);
          if (decoded) {
            setViewData({ ...decoded, databaseVerified: false, status: "legacy" });
            setVerificationState("idle");
          }
        }
        return;
      }

      // Check Admin route session — only when not already authenticated
      if (hash.startsWith("#/admin") && adminSession !== "authenticated") {
        setAdminSession("checking");
        try {
          const response = await fetch("/api/admin-session");
          const result = await response.json();
          if (currentRequest === requestNumber) {
            setAdminSession(response.ok && result.authenticated ? "authenticated" : "unauthenticated");
          }
        } catch {
          if (currentRequest === requestNumber) setAdminSession("unauthenticated");
        }
      }
    };

    handleRoute();
    window.addEventListener("hashchange", handleRoute);
    return () => {
      requestNumber += 1;
      window.removeEventListener("hashchange", handleRoute);
    };
  }, []);

  // Fetch User Dashboard Data (Profile, Assigned Plan, Cards)
  useEffect(() => {
    if (!currentUser) return;
    async function loadUserDashboard() {
      try {
        const headers: Record<string, string> = {};
        if (userSession?.access_token) {
          headers["Authorization"] = `Bearer ${userSession.access_token}`;
        }
        const res = await fetch("/api/user-dashboard", { headers });
        const data = await res.json();
        if (res.status === 403) {
          setUserBlockedMessage(data.error || "Your account has been blocked.");
        } else if (res.ok) {
          setUserData(data);
          setUserBlockedMessage("");
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadUserDashboard();
  }, [currentUser, userSession]);

  // Route Handlers
  const isSelectionPage = currentHash === "#/" || currentHash === "" || currentHash === "#";
  const isAdminRoute = currentHash.startsWith("#/admin");
  const isUserLoginRoute = currentHash === "#/login" || currentHash === "#/user/login";
  const isRegisterRoute = currentHash === "#/register" || currentHash === "#/user/register";
  const isSetupPasswordRoute = currentHash.startsWith("#/setup-password/");

  // Public Verification View
  if (viewData) {
    return <PersonDetailView data={viewData} />;
  }

  if (verificationState !== "idle") {
    const messages = {
      error: ["Verification unavailable", "The verification service could not be reached. Please try again."],
      loading: ["Checking record", "Fetching the latest card status..."],
      "not-found": ["ID Card Not Found", "This QR code is invalid or the ID card does not exist."]
    };
    const [title, message] = messages[verificationState];
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-[#020617] text-white" : "bg-[#f0fdf4] text-[#064e3b]"} flex items-center justify-center p-6`}>
        <div className={`max-w-md text-center border ${theme === "dark" ? "border-white/10 bg-white/5" : "border-[#bbf7d0] bg-[#f0fdf4]"} rounded-3xl p-10`}>
          <h1 className="text-2xl font-black uppercase">{title}</h1>
          <p className={`mt-3 text-sm ${theme === "dark" ? "text-white/50" : "text-[#047857]"}`}>{message}</p>
          {verificationState !== "loading" && (
            <button
              onClick={() => { window.location.hash = "#/"; window.location.reload(); }}
              className="mt-8 bg-amber-500 text-black font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl"
            >
              Return Home
            </button>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SETUP PASSWORD PAGE
  // ----------------------------------------------------
  if (isSetupPasswordRoute) {
    const parts = currentHash.split("/setup-password/");
    const rest = parts[1] || "";
    const lastSlash = rest.lastIndexOf("/");
    const userId = lastSlash > -1 ? rest.substring(0, lastSlash) : rest;
    const email = lastSlash > -1 ? decodeURIComponent(rest.substring(lastSlash + 1)) : "";
    return <SetupPasswordPage userId={userId} email={email} />;
  }

  // ----------------------------------------------------
  // 1. FIRST PAGE: LOGIN SELECTION PAGE (/)
  // ----------------------------------------------------
  if (isSelectionPage) {
    return (
      <LoginSelectionPage
        onSelectAdmin={() => { window.location.hash = "#/admin/login"; }}
        onSelectUser={() => { window.location.hash = "#/login"; }}
        onRegister={() => { window.location.hash = "#/register"; }}
      />
    );
  }

  // ----------------------------------------------------
  // 2. ADMIN PANEL ROUTING (/admin/*)
  // ----------------------------------------------------
  if (isAdminRoute) {
    if (currentHash === "#/admin/login") {
      return <AdminLogin onAuthenticated={() => { setAdminSession("authenticated"); window.location.hash = "#/admin"; }} />;
    }

    if (adminSession === "checking") {
      return (
        <div className={`min-h-screen ${theme === "dark" ? "bg-[#020617] text-white" : "bg-[#f0fdf4] text-[#064e3b]"} flex items-center justify-center p-6`}>
          <p className={`text-xs font-black uppercase tracking-[3px] ${theme === "dark" ? "text-white/40" : "text-[#059669]"}`}>Checking Admin Authorization...</p>
        </div>
      );
    }

    if (adminSession === "unauthenticated") {
      return <AdminLogin onAuthenticated={() => { setAdminSession("authenticated"); window.location.hash = "#/admin"; }} />;
    }

    // Determine Active Admin Tab
    let activeAdminTab = "dashboard";
    if (currentHash === "#/admin/users") activeAdminTab = "users";
    else if (currentHash.startsWith("#/admin/users/")) activeAdminTab = "user-details";
    else if (currentHash === "#/admin/plans") activeAdminTab = "plans";
    else if (currentHash === "#/admin/applications") activeAdminTab = "applications";
    else if (currentHash.startsWith("#/admin/applications/")) activeAdminTab = "application-details";
    else if (currentHash === "#/admin/notifications") activeAdminTab = "notifications";
    else if (currentHash === "#/admin/analytics") activeAdminTab = "analytics";
    else if (currentHash === "#/admin/profile") activeAdminTab = "profile";
    else if (currentHash === "#/admin/cards") activeAdminTab = "cards";
    else if (currentHash === "#/admin/create-card") activeAdminTab = "create-card";
    else if (currentHash === "#/admin/activity") activeAdminTab = "activity";
    else if (currentHash === "#/admin/settings") activeAdminTab = "settings";

    const handleAdminNavigate = (tab: string) => {
      if (tab === "dashboard") window.location.hash = "#/admin";
      else window.location.hash = `#/admin/${tab}`;
    };

    const handleAdminLogout = async () => {
      await fetch("/api/admin-session", { method: "DELETE" });
      setAdminSession("unauthenticated");
      window.location.hash = "#/admin/login";
    };

    return (
      <AdminLayout
        currentTab={activeAdminTab}
        title={activeAdminTab.toUpperCase().replace("-", " ")}
        subtitle="Maurya System Administrator Control Center"
        onNavigate={handleAdminNavigate}
        onLogout={handleAdminLogout}
      >
        {activeAdminTab === "dashboard" && <AdminDashboard onNavigate={handleAdminNavigate} />}
        {activeAdminTab === "users" && (
          <AdminUsers
            onSelectUser={id => {
              setSelectedAdminUserId(id);
              window.location.hash = `#/admin/users/${id}`;
            }}
          />
        )}
        {activeAdminTab === "user-details" && (
          <AdminUserDetails
            userId={selectedAdminUserId || currentHash.split("#/admin/users/")[1] || ""}
            onBack={() => { window.location.hash = "#/admin/users"; }}
          />
        )}
        {activeAdminTab === "plans" && <AdminPlans />}
        {activeAdminTab === "applications" && (
          <AdminApplications
            onSelectApplication={id => {
              setSelectedAdminAppId(id);
              window.location.hash = `#/admin/applications/${id}`;
            }}
          />
        )}
        {activeAdminTab === "application-details" && (
          <AdminApplicationDetails
            applicationId={selectedAdminAppId || currentHash.split("#/admin/applications/")[1] || ""}
            onBack={() => { window.location.hash = "#/admin/applications"; }}
          />
        )}
        {activeAdminTab === "notifications" && <AdminNotifications />}
        {activeAdminTab === "analytics" && <AdminAnalytics />}
        {activeAdminTab === "profile" && <AdminProfile adminEmail="admin@mauryagenerator.com" />}
        {activeAdminTab === "cards" && <AdminCardsList />}
        {activeAdminTab === "create-card" && <AdminCreateCard />}
        {activeAdminTab === "activity" && <AdminActivity />}
        {activeAdminTab === "settings" && <AdminSettings />}
      </AdminLayout>
    );
  }

  // ----------------------------------------------------
  // 3. USER LOGIN PAGE (/login)
  // ----------------------------------------------------
  if (isUserLoginRoute) {
    return <UserLogin />;
  }

  // ----------------------------------------------------
  // 4. USER REGISTER PAGE (/register)
  // ----------------------------------------------------
  if (isRegisterRoute) {
    return <UserRegister />;
  }

  // Check if User is Blocked
  if (userBlockedMessage) {
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-[#020617] text-white" : "bg-[#f0fdf4] text-[#064e3b]"} flex items-center justify-center p-6`}>
        <div className={`max-w-md text-center border border-red-500/20 bg-red-500/10 rounded-3xl p-10 space-y-4`}>
          <span className="text-4xl">🚫</span>
          <h1 className="text-2xl font-black uppercase text-red-400">Account Blocked</h1>
          <p className="text-sm text-white/70">{userBlockedMessage}</p>
          <button
            onClick={async () => { await signOut(); window.location.hash = "#/login"; }}
            className="mt-6 bg-white text-black font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // User Guard
  const userRoutes = ["#/home", "#/my-card", "#/apply", "#/plans", "#/profile"];
  if (!currentUser && userRoutes.some(r => currentHash === r || currentHash.startsWith(r + "/"))) {
    return <UserLogin />;
  }

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#020617] text-white selection:bg-amber-500/30" : "bg-[#f0fdf4] text-[#064e3b] selection:bg-emerald-500/30"}`}>
      <UserNavigation
        activeTab={userTab}
        onTabChange={handleUserTabChange}
        onLogout={async () => {
          await signOut();
          window.location.hash = "#/";
        }}
      />

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-10 pb-24 sm:pb-10">
        {userTab === "home" && (
          <div className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]"} border rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 text-center space-y-6`}>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-amber-500">Welcome, {userData.profile?.display_name || "User"}</span>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">Your Digital ID Card</h1>

            <div className="pt-4 space-y-4">
              {userData.cards.length > 0 ? (
                <div className="space-y-4">
                  <div className={`${theme === "dark" ? "bg-black/30 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]"} border px-4 sm:px-6 py-3 sm:py-4 rounded-2xl inline-block`}>
                    <p className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-[#059669]"} uppercase tracking-widest`}>Card Status</p>
                    <span className="inline-block mt-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 font-black rounded-lg uppercase text-xs sm:text-sm">
                      Active
                    </span>
                  </div>

                  <div className={`${theme === "dark" ? "bg-black/30 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]"} border px-4 sm:px-6 py-3 sm:py-4 rounded-2xl inline-block`}>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Current Plan</p>
                    <p className={`font-black ${theme === "dark" ? "text-white" : "text-[#064e3b]"} text-base sm:text-lg mt-1`}>{userData.plan?.name || "Basic"}</p>
                    <p className={`text-xs ${theme === "dark" ? "text-white/40" : "text-[#047857]"} font-semibold`}>
                      {userData.plan?.card_limit === -1 ? "Unlimited" : `${userData.plan?.card_limit || 100} Cards Limit`}
                    </p>
                  </div>
                </div>
              ) : userData.application ? (
                <div className="space-y-4">
                  <div className={`${theme === "dark" ? "bg-black/30 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]"} border px-4 sm:px-6 py-3 sm:py-4 rounded-2xl inline-block`}>
                    <p className={`text-[10px] font-black ${theme === "dark" ? "text-white/30" : "text-[#059669]"} uppercase tracking-widest`}>Application</p>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${
                          userData.application.status === "submitted" ? "bg-blue-500/10 text-blue-400" :
                          userData.application.status === "card_issued" ? "bg-emerald-500/10 text-emerald-400" :
                          userData.application.status === "payment_pending" ? "bg-amber-500/10 text-amber-400" :
                          "bg-white/5 text-white/50"
                        }`}>
                          {userData.application.status}
                        </span>
                      </div>
                      <p className={`text-sm font-bold ${theme === "dark" ? "text-white/60" : "text-[#047857]"} mt-1`}>
                        {userData.application.completion_percentage}% Complete
                      </p>
                    </div>
                  </div>

                  {userData.application.status !== "submitted" && userData.application.status !== "card_issued" && (
                    <div className={`${theme === "dark" ? "bg-black/30 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]"} border px-5 sm:px-8 py-4 sm:py-6 rounded-2xl max-w-md mx-auto space-y-3`}>
                      <p className={`text-sm ${theme === "dark" ? "text-white/50" : "text-[#047857]"}`}>
                        {userData.application.completion_percentage === 100
                          ? "Your application is complete. Submit it to proceed."
                          : "Continue filling out your card application."}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${theme === "dark" ? "bg-black/30 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]"} border px-5 sm:px-8 py-4 sm:py-6 rounded-2xl max-w-md mx-auto space-y-3`}>
                  <p className={`text-xs sm:text-sm ${theme === "dark" ? "text-white/50" : "text-[#047857]"}`}>
                    No card issued yet. Create your card application to get started.
                  </p>
                </div>
              )}

              <button
                onClick={() => handleUserTabChange(userData.cards.length > 0 ? "my-card" : "apply")}
                className="bg-amber-500 text-black px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20"
              >
                {userData.cards.length > 0 ? "View My Card" : userData.application?.status === "submitted" ? "Check Application Status" : "Create ID Card"}
              </button>
            </div>
          </div>
        )}

        {userTab === "my-card" && <UserMyCardPage />}
        {userTab === "apply" && <UserApplicationForm />}
        {userTab === "plans" && (
          <div className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-[#f0fdf4] border-[#bbf7d0]"} border rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-10 pb-24 sm:pb-10`}>
            <UserApplicationForm />
          </div>
        )}
        {userTab === "profile" && (
          <UserProfilePage
            user={userData.profile}
            assignedPlan={userData.plan}
            cardsCount={userData.cards.length}
            onProfileUpdated={profile => setUserData(prev => ({ ...prev, profile }))}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
