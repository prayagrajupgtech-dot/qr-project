import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { requireAdmin } from "./_shared/admin-auth.js";
import {
  getAllApplications,
  getApplicationById,
  saveApplication,
  getAllUsers,
  getAllPlans,
  getAllPayments
} from "./_shared/store.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";

export default async (request: Request) => {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);

  // GET - List all applications or fetch single by id
  if (request.method === "GET") {
    try {
      const appId = url.searchParams.get("id");

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        // Single application detail
        if (appId) {
          const { data: app, error: appError } = await supabase
            .from("card_applications")
            .select("*")
            .eq("id", appId)
            .maybeSingle();

          if (appError || !app) {
            return jsonResponse({ error: "Application not found." }, 404);
          }

          // Fetch related data in parallel (all independent)
          const [profileRes, planRes, paymentRes, cardRes] = await Promise.all([
            app.user_id
              ? supabase
                  .from("user_profiles")
                  .select("id, email, display_name, phone, country, country_code")
                  .eq("id", app.user_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            app.plan_id
              ? supabase
                  .from("plans")
                  .select("id, name, price, duration_days")
                  .eq("id", app.plan_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            supabase
              .from("payments")
              .select("id, status, amount, currency, transaction_id, created_at")
              .eq("application_id", appId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("id_cards")
              .select("id, card_number, status, qr_token, created_at")
              .eq("application_id", appId)
              .maybeSingle()
          ]);

          const userProfile = (profileRes as any).data;
          const plan = (planRes as any).data;
          const payment = (paymentRes as any).data;
          const card = (cardRes as any).data;

          const enriched = {
            ...app,
            user_name: userProfile?.display_name || null,
            user_email: userProfile?.email || null,
            user_country: userProfile?.country || null,
            user_country_code: userProfile?.country_code || null,
            user_phone: userProfile?.phone || null,
            plan_name: plan?.name || null,
            plan_price: plan?.price ?? null,
            payment_status: payment?.status || null,
            payment_amount: payment?.amount ?? null,
            transaction_id: payment?.transaction_id || null,
            card_number: card?.card_number || null,
            card_status: card?.status || null,
            qr_token: card?.qr_token || null,
            admin_notes: (app as any).admin_notes || null
          };

          return jsonResponse({ application: enriched }, 200);
        }

        // List all applications
        let statusFilter = url.searchParams.get("status") || "";
        let searchQuery = url.searchParams.get("search")?.toLowerCase().trim() || "";
        const sortBy = url.searchParams.get("sort") || "newest";

        let query = supabase
          .from("card_applications")
          .select("*");

        if (statusFilter) {
          query = query.eq("status", statusFilter);
        }

        const { data: apps, error: appsError } = await query
          .order("created_at", { ascending: sortBy === "oldest" });

        if (appsError) {
          console.error("admin-applications GET error", appsError);
          return jsonResponse({ error: "Could not fetch applications." }, 500);
        }

        let applications = apps || [];

        // Batch-fetch all related data in 4 parallel queries (no N+1)
        const appIds = applications.map((a: any) => a.id);
        const appUserIds = [...new Set(applications.map((a: any) => a.user_id).filter(Boolean))];
        const appPlanIds = [...new Set(applications.map((a: any) => a.plan_id).filter(Boolean))];

        const [profilesRes, plansRes, paymentsRes, cardsRes] = await Promise.all([
          appUserIds.length > 0
            ? supabase.from("user_profiles").select("id, email, display_name, phone, country, country_code").in("id", appUserIds)
            : Promise.resolve({ data: [] as any[] }),
          appPlanIds.length > 0
            ? supabase.from("plans").select("id, name, price").in("id", appPlanIds)
            : Promise.resolve({ data: [] as any[] }),
          appIds.length > 0
            ? supabase.from("payments").select("application_id, id, status, amount, transaction_id").in("application_id", appIds).order("created_at", { ascending: false })
            : Promise.resolve({ data: [] as any[] }),
          appIds.length > 0
            ? supabase.from("id_cards").select("application_id, id, card_number, status, qr_token").in("application_id", appIds)
            : Promise.resolve({ data: [] as any[] })
        ]);

        const profileMap: Record<string, any> = {};
        ((profilesRes as any).data || []).forEach((p: any) => { profileMap[p.id] = p; });
        const planMap: Record<string, any> = {};
        ((plansRes as any).data || []).forEach((p: any) => { planMap[p.id] = p; });
        // Latest payment per application (already ordered desc)
        const paymentMap: Record<string, any> = {};
        (((paymentsRes as any).data || []) as any[]).forEach((p: any) => {
          if (p.application_id && !paymentMap[p.application_id]) paymentMap[p.application_id] = p;
        });
        const cardMap: Record<string, any> = {};
        (((cardsRes as any).data || []) as any[]).forEach((c: any) => {
          if (c.application_id && !cardMap[c.application_id]) cardMap[c.application_id] = c;
        });

        // Enrich each application from in-memory maps
        const enrichedApplications = applications.map((app: any) => {
          const userProfile = (app.user_id && profileMap[app.user_id]) || null;
          const plan = (app.plan_id && planMap[app.plan_id]) || null;
          const payment = paymentMap[app.id] || null;
          const card = cardMap[app.id] || null;

          return {
            ...app,
            user_name: userProfile?.display_name || null,
            user_email: userProfile?.email || null,
            user_country: userProfile?.country || null,
            user_country_code: userProfile?.country_code || null,
            user_phone: userProfile?.phone || null,
            plan_name: plan?.name || null,
            plan_price: plan?.price ?? null,
            payment_status: payment?.status || null,
            payment_amount: payment?.amount ?? null,
            transaction_id: payment?.transaction_id || null,
            card_number: card?.card_number || null,
            card_status: card?.status || null,
            qr_token: card?.qr_token || null,
            admin_notes: (app as any).admin_notes || null
          };
        });

        // Apply search filter after enrichment
        if (searchQuery) {
          return jsonResponse({
            applications: enrichedApplications.filter(app =>
              (app.user_name && app.user_name.toLowerCase().includes(searchQuery)) ||
              (app.user_email && app.user_email.toLowerCase().includes(searchQuery)) ||
              (app.full_name && app.full_name.toLowerCase().includes(searchQuery)) ||
              (app.email && app.email.toLowerCase().includes(searchQuery))
            )
          }, 200);
        }

        return jsonResponse({ applications: enrichedApplications }, 200);
      }

      // --- Local store fallback ---
      if (appId) {
        const app = await getApplicationById(appId);
        if (!app) return jsonResponse({ error: "Application not found." }, 404);

        const users = await getAllUsers();
        const plans = await getAllPlans();
        const payments = await getAllPayments();

        const user = users.find(u => u.id === app.user_id);
        const plan = plans.find(p => p.id === app.plan_id);
        const payment = payments.find(p => p.application_id === app.id);

        const enriched = {
          ...app,
          user_name: user?.display_name || null,
          user_email: user?.email || null,
          user_country: user?.country || null,
          user_country_code: user?.country_code || null,
          user_phone: user?.phone || null,
          plan_name: plan?.name || null,
          plan_price: plan?.price ?? null,
          payment_status: payment?.status || null,
          payment_amount: payment?.amount ?? null,
          transaction_id: payment?.transaction_id || null,
          card_number: null,
          card_status: null,
          qr_token: null,
          admin_notes: (app as any).admin_notes || null
        };

        return jsonResponse({ application: enriched }, 200);
      }

      let apps = await getAllApplications();
      const users = await getAllUsers();
      const plans = await getAllPlans();
      const payments = await getAllPayments();

      const statusFilter = url.searchParams.get("status") || "";
      const searchQuery = url.searchParams.get("search")?.toLowerCase().trim() || "";
      const sortBy = url.searchParams.get("sort") || "newest";

      if (statusFilter) {
        apps = apps.filter(a => a.status === statusFilter);
      }

      if (searchQuery) {
        apps = apps.filter(a =>
          a.full_name.toLowerCase().includes(searchQuery) ||
          a.email.toLowerCase().includes(searchQuery)
        );
      }

      if (sortBy === "oldest") {
        apps.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      } else {
        apps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const enrichedApplications = apps.map(app => {
        const user = users.find(u => u.id === app.user_id);
        const plan = plans.find(p => p.id === app.plan_id);
        const payment = payments.find(p => p.application_id === app.id);

        return {
          ...app,
          user_name: user?.display_name || null,
          user_email: user?.email || null,
          user_country: user?.country || null,
          user_country_code: user?.country_code || null,
          user_phone: user?.phone || null,
          plan_name: plan?.name || null,
          plan_price: plan?.price ?? null,
          payment_status: payment?.status || null,
          payment_amount: payment?.amount ?? null,
          transaction_id: payment?.transaction_id || null,
          card_number: null,
          card_status: null,
          qr_token: null,
          admin_notes: (app as any).admin_notes || null
        };
      });

      return jsonResponse({ applications: enrichedApplications }, 200);
    } catch (error) {
      console.error("admin-applications GET error", error);
      return jsonResponse({ error: "Could not fetch applications." }, 500);
    }
  }

  // PATCH - Update application (admin manages status)
  if (request.method === "PATCH") {
    try {
      const body = await readJsonBody(request);
      const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
      const status = typeof body.status === "string" ? body.status : "";
      const adminNotes = typeof body.admin_notes === "string" ? body.admin_notes : undefined;

      if (!applicationId) {
        return jsonResponse({ error: "Application ID is required." }, 400);
      }

      const allowedStatuses = [
        "draft", "incomplete", "completed", "submitted",
        "payment_pending", "payment_success", "payment_failed",
        "card_issued", "card_active", "card_suspended", "cancelled"
      ];

      if (status && !allowedStatuses.includes(status)) {
        return jsonResponse({ error: "Invalid status value." }, 400);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        const { data: existing, error: fetchError } = await supabase
          .from("card_applications")
          .select("id, status, full_name")
          .eq("id", applicationId)
          .maybeSingle();

        if (fetchError || !existing) {
          return jsonResponse({ error: "Application not found." }, 404);
        }

        const updates: Record<string, any> = {
          updated_at: new Date().toISOString()
        };

        if (status) updates.status = status;
        if (adminNotes !== undefined) updates.admin_notes = adminNotes;

        const { data: updated, error: updateError } = await supabase
          .from("card_applications")
          .update(updates)
          .eq("id", applicationId)
          .select("*")
          .maybeSingle();

        if (updateError) {
          console.error("admin-applications PATCH error", updateError);
          return jsonResponse({ error: "Could not update application." }, 500);
        }

        return jsonResponse({ success: true, application: updated }, 200);
      }

      // Local store fallback
      const app = await getApplicationById(applicationId);
      if (!app) return jsonResponse({ error: "Application not found." }, 404);

      const updates: Partial<typeof app> = { id: applicationId };
      if (status) updates.status = status as any;

      const updated = await saveApplication(updates);

      return jsonResponse({ success: true, application: updated }, 200);
    } catch (error) {
      console.error("admin-applications PATCH error", error);
      return jsonResponse({ error: "Could not update application." }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
};
