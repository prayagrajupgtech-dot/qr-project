import { jsonResponse } from "./_shared/http.js";
import { verifyAdminSession } from "./admin-session.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";
import {
  getAllUsers, getAllCards, getAllApplications, getAllPayments, getAllPlans
} from "./_shared/store.js";

function computeUsersByCountry(users: { country?: string }[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const u of users) {
    const key = u.country || "Unknown";
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

function computeUsersByPlan(users: { plan_id: string | null }[], plans: { id: string; name: string }[]): Record<string, number> {
  const planMap = new Map(plans.map(p => [p.id, p.name]));
  const map: Record<string, number> = {};
  for (const u of users) {
    const name = u.plan_id ? (planMap.get(u.plan_id) || "Unknown Plan") : "Unassigned";
    map[name] = (map[name] || 0) + 1;
  }
  return map;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function computeMonthly(records: { created_at: string }[], year: number) {
  const counts = Array(12).fill(0);
  for (const r of records) {
    const d = new Date(r.created_at);
    if (d.getFullYear() === year) counts[d.getMonth()]++;
  }
  return MONTH_NAMES.map((name, i) => ({ month: name, count: counts[i] }));
}

function computeMonthlyRevenue(payments: { status: string; amount: number; created_at: string }[], year: number) {
  const totals = Array(12).fill(0);
  for (const p of payments) {
    if (p.status === "success") {
      const d = new Date(p.created_at);
      if (d.getFullYear() === year) totals[d.getMonth()] += p.amount / 100;
    }
  }
  return MONTH_NAMES.map((name, i) => ({ month: name, amount: totals[i] }));
}

export default async (request: Request) => {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);

  const admin = await verifyAdminSession(request);
  if (!admin) return jsonResponse({ error: "Admin authentication required." }, 401);

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "month";
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth()));

  const now = new Date();

  // Compute date boundaries using [start, end) pattern
  let startDate: Date;
  let endDate: Date;
  let reportLabel: string;

  switch (range) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      reportLabel = `Today — ${now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`;
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 86400000);
      endDate = new Date(now.getTime() + 86400000);
      reportLabel = "This Week (last 7 days)";
      break;
    case "month":
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 1);
      reportLabel = `${MONTH_NAMES[month]} ${year}`;
      break;
    case "last_month": {
      const lm = month === 0 ? 11 : month - 1;
      const ly = month === 0 ? year - 1 : year;
      startDate = new Date(ly, lm, 1);
      endDate = new Date(ly, lm + 1, 1);
      reportLabel = `${MONTH_NAMES[lm]} ${ly}`;
      break;
    }
    case "year":
      startDate = new Date(year, 0, 1);
      endDate = new Date(year + 1, 0, 1);
      reportLabel = `Year ${year}`;
      break;
    case "last_year":
      startDate = new Date(year - 1, 0, 1);
      endDate = new Date(year, 0, 1);
      reportLabel = `Year ${year - 1}`;
      break;
    default: // "all"
      startDate = new Date(0);
      endDate = new Date(now.getTime() + 86400000);
      reportLabel = "All Time";
  }

  const inRange = (dateStr: string) => {
    const d = new Date(dateStr);
    return d >= startDate && d < endDate;
  };

  // Fetch only the columns needed for aggregation (parallel, lightweight)
  type SlimUser = { country?: string; plan_id: string | null; status: string; created_at: string };
  type SlimCard = { status: string; created_at: string };
  type SlimApp = { status: string; completion_percentage: number; created_at: string };
  type SlimPayment = { status: string; amount: number; created_at: string };
  type SlimPlan = { id: string; name: string };

  let allUsers: SlimUser[];
  let allCards: SlimCard[];
  let allApplications: SlimApp[];
  let allPayments: SlimPayment[];
  let plans: SlimPlan[];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const [u, c, a, p, pl] = await Promise.all([
      supabase.from("user_profiles").select("country, plan_id, status, created_at").neq("status", "deleted"),
      supabase.from("id_cards").select("status, created_at"),
      supabase.from("card_applications").select("status, completion_percentage, created_at"),
      supabase.from("payments").select("status, amount, created_at"),
      supabase.from("plans").select("id, name")
    ]);
    if (u.error || c.error || a.error || p.error || pl.error) {
      throw new Error("Analytics fetch failed.");
    }
    allUsers = (u.data || []) as SlimUser[];
    allCards = (c.data || []) as SlimCard[];
    allApplications = (a.data || []) as SlimApp[];
    allPayments = (p.data || []) as SlimPayment[];
    plans = (pl.data || []) as SlimPlan[];
  } else {
    [allUsers, allCards, allApplications, allPayments, plans] = await Promise.all([
      getAllUsers(),
      getAllCards(),
      getAllApplications(),
      getAllPayments(),
      getAllPlans(),
    ]);
  }

  // Filter by date range
  const filteredUsers = allUsers.filter(u => inRange(u.created_at));
  const filteredCards = allCards.filter(c => inRange(c.created_at));
  const filteredApplications = allApplications.filter(a => inRange(a.created_at));
  const filteredPayments = allPayments.filter(p => inRange(p.created_at));

  // Summary cards — use filtered data
  const totalUsers = filteredUsers.length;
  const activeUsers = filteredUsers.filter(u => u.status === "active").length;
  const blockedUsers = filteredUsers.filter(u => u.status === "blocked").length;
  const totalCards = filteredCards.length;
  const activeCards = filteredCards.filter(c => c.status === "active").length;
  const expiredCards = filteredCards.filter(c => c.status === "expired").length;
  const totalApplications = filteredApplications.length;
  const completedApplications = filteredApplications.filter(a => a.completion_percentage === 100).length;
  const pendingApplications = filteredApplications.filter(a => a.status === "draft" || a.status === "incomplete").length;
  const totalPayments = filteredPayments.length;
  const successfulPayments = filteredPayments.filter(p => p.status === "success").length;
  const failedPayments = filteredPayments.filter(p => p.status === "failed").length;
  const pendingPayments = filteredPayments.filter(p => p.status === "pending" || p.status === "created").length;
  const totalRevenue = successfulPayments > 0
    ? filteredPayments.filter(p => p.status === "success").reduce((sum, p) => sum + (p.amount / 100), 0)
    : 0;

  // Plan distribution — only from filtered users
  const usersByPlan = computeUsersByPlan(filteredUsers, plans);
  const usersByCountry = computeUsersByCountry(filteredUsers);

  // Monthly charts — use the selected year for monthly breakdown
  const monthlyUsers = computeMonthly(allUsers, year);
  const monthlyRevenue = computeMonthlyRevenue(allPayments, year);
  const monthlyApplications = computeMonthly(allApplications, year);

  return jsonResponse({
    reportLabel,
    totalUsers,
    activeUsers,
    blockedUsers,
    totalCards,
    activeCards,
    expiredCards,
    totalApplications,
    completedApplications,
    pendingApplications,
    totalPayments,
    successfulPayments,
    failedPayments,
    pendingPayments,
    totalRevenue,
    usersByCountry,
    usersByPlan,
    monthlyUsers,
    monthlyRevenue,
    monthlyApplications,
  });
};
