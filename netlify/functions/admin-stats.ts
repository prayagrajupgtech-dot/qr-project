import { jsonResponse } from "./_shared/http.js";
import { requireAdmin } from "./_shared/admin-auth.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";
import { getAllUsers, getAllCards, getAllPlans, getLogs, getAllApplications, getAllPayments, getUnreadNotificationCount } from "./_shared/store.js";

export default async (request: Request) => {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    // Fast path: all queries run in parallel, counts use head-only requests
    // (no row data transferred) and recents are limited to 5 rows.
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const head = { count: "exact" as const, head: true };

      const [
        usersCount,
        activeUsersCount,
        blockedUsersCount,
        cardsCount,
        activeCardsCount,
        appsCount,
        pendingAppsCount,
        completedAppsCount,
        paymentsCount,
        successPaymentsCount,
        pendingPaymentsCount,
        unreadCount,
        plansRes,
        userPlansRes,
        recentUsersRes,
        recentAppsRes,
        recentPaymentsRes,
        recentLogsRes
      ] = await Promise.all([
        supabase.from("user_profiles").select("id", head).neq("status", "deleted"),
        supabase.from("user_profiles").select("id", head).eq("status", "active"),
        supabase.from("user_profiles").select("id", head).eq("status", "blocked"),
        supabase.from("id_cards").select("id", head),
        supabase.from("id_cards").select("id", head).eq("status", "active"),
        supabase.from("card_applications").select("id", head),
        supabase.from("card_applications").select("id", head).in("status", ["draft", "incomplete", "submitted"]),
        supabase.from("card_applications").select("id", head).in("status", ["completed", "submitted"]),
        supabase.from("payments").select("id", head),
        supabase.from("payments").select("id", head).eq("status", "success"),
        supabase.from("payments").select("id", head).in("status", ["created", "pending"]),
        supabase.from("notifications").select("id", head).eq("read", false),
        supabase.from("plans").select("id, name"),
        supabase.from("user_profiles").select("plan_id").neq("status", "deleted"),
        supabase.from("user_profiles").select("id, display_name, email, plan_id, status, created_at").neq("status", "deleted").order("created_at", { ascending: false }).limit(5),
        supabase.from("card_applications").select("id, full_name, status, completion_percentage, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("payments").select("id, amount, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("admin_activity_logs").select("id, action, details, created_at").order("created_at", { ascending: false }).limit(5)
      ]);

      const plans = plansRes.data || [];
      const planMap: Record<string, string> = {};
      plans.forEach((p: { id: string; name: string }) => { planMap[p.id] = p.name; });

      const usersByPlan: Record<string, number> = {};
      plans.forEach((p: { name: string }) => { usersByPlan[p.name] = 0; });
      usersByPlan["Unassigned"] = 0;

      (userPlansRes.data || []).forEach((u: { plan_id: string | null }) => {
        const planName = u.plan_id ? planMap[u.plan_id] || "Unknown Plan" : "Unassigned";
        usersByPlan[planName] = (usersByPlan[planName] || 0) + 1;
      });

      const recentUsers = (recentUsersRes.data || []).map((u: any) => ({
        id: u.id,
        name: u.display_name,
        email: u.email,
        plan: u.plan_id ? planMap[u.plan_id] || "Unassigned" : "Unassigned",
        status: u.status,
        created_at: u.created_at
      }));

      return jsonResponse({
        totalUsers: usersCount.count || 0,
        activeUsers: activeUsersCount.count || 0,
        blockedUsers: blockedUsersCount.count || 0,
        totalCards: cardsCount.count || 0,
        activeCards: activeCardsCount.count || 0,
        totalApplications: appsCount.count || 0,
        pendingApplications: pendingAppsCount.count || 0,
        completedApplications: completedAppsCount.count || 0,
        totalPayments: paymentsCount.count || 0,
        successfulPayments: successPaymentsCount.count || 0,
        pendingPayments: pendingPaymentsCount.count || 0,
        unreadNotifications: unreadCount.count || 0,
        usersByPlan,
        recentUsers,
        recentApplications: recentAppsRes.data || [],
        recentPayments: recentPaymentsRes.data || [],
        recentLogs: recentLogsRes.data || []
      }, 200);
    }

    // Local store fallback
    const users = await getAllUsers();
    const cards = await getAllCards();
    const plans = await getAllPlans();
    const logs = await getLogs();
    const applications = await getAllApplications();
    const payments = await getAllPayments();
    const unreadNotifications = await getUnreadNotificationCount();

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === "active").length;
    const blockedUsers = users.filter(u => u.status === "blocked").length;
    const totalCards = cards.length;
    const totalApplications = applications.length;
    const pendingApplications = applications.filter(a => ["draft", "incomplete", "submitted"].includes(a.status)).length;
    const completedApplications = applications.filter(a => ["completed", "submitted"].includes(a.status)).length;
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(p => p.status === "success").length;
    const pendingPayments = payments.filter(p => ["created", "pending"].includes(p.status)).length;
    const activeCards = cards.filter(c => c.status === "active").length;

    const planMap: Record<string, string> = {};
    plans.forEach(p => { planMap[p.id] = p.name; });

    const usersByPlan: Record<string, number> = {};
    plans.forEach(p => { usersByPlan[p.name] = 0; });
    usersByPlan["Unassigned"] = 0;

    users.forEach(u => {
      const planName = u.plan_id ? planMap[u.plan_id] || "Unknown Plan" : "Unassigned";
      usersByPlan[planName] = (usersByPlan[planName] || 0) + 1;
    });

    const recentUsers = users.slice(0, 5).map(u => ({
      id: u.id,
      name: u.display_name,
      email: u.email,
      plan: u.plan_id ? planMap[u.plan_id] || "Unassigned" : "Unassigned",
      status: u.status,
      created_at: u.created_at
    }));

    const recentApplications = applications.slice(0, 5).map(a => ({
      id: a.id,
      full_name: a.full_name,
      status: a.status,
      completion_percentage: a.completion_percentage,
      created_at: a.created_at
    }));

    const recentPayments = payments.slice(0, 5).map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      created_at: p.created_at
    }));

    const recentLogs = logs.slice(0, 5);

    return jsonResponse({
      totalUsers,
      activeUsers,
      blockedUsers,
      totalCards,
      activeCards,
      totalApplications,
      pendingApplications,
      completedApplications,
      totalPayments,
      successfulPayments,
      pendingPayments,
      unreadNotifications,
      usersByPlan,
      recentUsers,
      recentApplications,
      recentPayments,
      recentLogs
    }, 200);
  } catch (error) {
    console.error("admin-stats error", error);
    return jsonResponse({ error: "Could not fetch admin stats." }, 500);
  }
};
