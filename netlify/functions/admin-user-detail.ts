import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { requireAdmin } from "./_shared/admin-auth.js";
import { getUserById, saveUser, getCardsByUserId, getPlanById, logAdminAction } from "./_shared/store.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";

export default async (request: Request) => {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const userId = url.searchParams.get("id");

  if (request.method === "GET") {
    if (!userId) return jsonResponse({ error: "User ID is required." }, 400);

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        const { data: user, error: userError } = await supabase
          .from("user_profiles")
          .select("id, email, display_name, phone, status, role, plan_id, created_at, last_login_at")
          .eq("id", userId)
          .maybeSingle();

        if (userError || !user) {
          return jsonResponse({ error: "User not found." }, 404);
        }

        const { data: cards } = await supabase
          .from("id_cards")
          .select("id, card_number, name, phone, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        let plan = null;
        if (user.plan_id) {
          const { data: planData } = await supabase
            .from("plans")
            .select("id, name, price, card_limit")
            .eq("id", user.plan_id)
            .maybeSingle();
          plan = planData;
        }

        return jsonResponse({
          user: {
            id: user.id,
            name: user.display_name,
            email: user.email,
            phone: user.phone,
            status: user.status,
            role: user.role,
            planId: user.plan_id,
            planName: plan?.name || "Unassigned",
            planCardLimit: plan?.card_limit ?? 0,
            createdAt: user.created_at,
            lastLogin: user.last_login_at
          },
          cards: cards || [],
          plan
        }, 200);
      }

      const user = await getUserById(userId);
      if (!user) return jsonResponse({ error: "User not found." }, 404);

      const cards = await getCardsByUserId(userId);
      const plan = user.plan_id ? await getPlanById(user.plan_id) : null;

      return jsonResponse({
        user: {
          id: user.id,
          name: user.display_name,
          email: user.email,
          phone: user.phone,
          status: user.status,
          role: user.role,
          planId: user.plan_id,
          planName: plan?.name || "Unassigned",
          planCardLimit: plan?.card_limit ?? 0,
          createdAt: user.created_at,
          lastLogin: user.last_login_at
        },
        cards,
        plan
      }, 200);
    } catch (error) {
      console.error("admin-user-detail GET error", error);
      return jsonResponse({ error: "Could not fetch user details." }, 500);
    }
  }

  if (request.method === "PATCH") {
    try {
      const body = await readJsonBody(request);
      const targetId = (typeof body.id === "string" ? body.id : null) || userId;
      if (!targetId) return jsonResponse({ error: "User ID is required." }, 400);

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        const { data: existing } = await supabase
          .from("user_profiles")
          .select("id, email, display_name, status, plan_id")
          .eq("id", targetId)
          .maybeSingle();

        if (!existing) return jsonResponse({ error: "User not found." }, 404);

        const updates: Record<string, any> = {};
        if (typeof body.name === "string") updates.display_name = body.name.trim();
        if (typeof body.phone === "string") updates.phone = body.phone.trim();
        if (typeof body.planId === "string") updates.plan_id = body.planId;
        if (typeof body.status === "string" && ["active", "blocked"].includes(body.status)) {
          updates.status = body.status;
        }
        updates.updated_at = new Date().toISOString();

        const { data: updatedUser, error: updateError } = await supabase
          .from("user_profiles")
          .update(updates)
          .eq("id", targetId)
          .select("id, email, display_name, phone, status, role, plan_id, created_at, last_login_at")
          .maybeSingle();

        if (updateError) {
          console.error("admin-user-detail PATCH error", updateError);
          return jsonResponse({ error: "Could not update user." }, 500);
        }

        if (body.status && body.status !== existing.status) {
          const actionText = body.status === "blocked" ? "User Blocked" : "User Unblocked";
          await logAdminAction(actionText, "admin", targetId, `${actionText} ${existing.display_name} (${existing.email})`);
        }

        if (body.planId && body.planId !== existing.plan_id) {
          await logAdminAction("Plan Assigned", "admin", targetId, `Assigned plan ${body.planId} to ${existing.display_name}`);
        }

        return jsonResponse({ user: updatedUser }, 200);
      }

      const user = await getUserById(targetId);
      if (!user) return jsonResponse({ error: "User not found." }, 404);

      const updates: Record<string, any> = { id: targetId };
      if (typeof body.name === "string") updates.display_name = body.name.trim();
      if (typeof body.phone === "string") updates.phone = body.phone.trim();
      if (typeof body.planId === "string") updates.plan_id = body.planId;
      if (typeof body.status === "string" && ["active", "blocked"].includes(body.status)) {
        updates.status = body.status;
      }

      const updatedUser = await saveUser(updates);

      if (body.status && body.status !== user.status) {
        const actionText = body.status === "blocked" ? "User Blocked" : "User Unblocked";
        await logAdminAction(actionText, "admin", targetId, `${actionText} ${user.display_name} (${user.email})`);
      }

      if (body.planId && body.planId !== user.plan_id) {
        await logAdminAction("Plan Assigned", "admin", targetId, `Assigned plan ${body.planId} to ${user.display_name}`);
      }

      return jsonResponse({ user: updatedUser }, 200);
    } catch (error) {
      console.error("admin-user-detail PATCH error", error);
      return jsonResponse({ error: "Could not update user." }, 500);
    }
  }

  if (request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const targetId = (typeof body.id === "string" ? body.id : null) || userId;
      if (!targetId) return jsonResponse({ error: "User ID is required." }, 400);

      if (body.action === "reset-password") {
        const newPassword = typeof body.password === "string" ? body.password.trim() : "";
        if (!newPassword || newPassword.length < 6) {
          return jsonResponse({ error: "Password must be at least 6 characters." }, 400);
        }

        if (!isSupabaseConfigured()) {
          return jsonResponse({ error: "Supabase not configured." }, 500);
        }

        const supabase = getSupabaseAdmin();

        const { data: existing } = await supabase
          .from("user_profiles")
          .select("id, email, display_name")
          .eq("id", targetId)
          .maybeSingle();

        if (!existing) return jsonResponse({ error: "User not found." }, 404);

        const { error: updateError } = await supabase.auth.admin.updateUserById(targetId, {
          password: newPassword
        });

        if (updateError) {
          console.error("Password reset error", updateError);
          return jsonResponse({ error: "Failed to reset password." }, 500);
        }

        await logAdminAction("Password Reset", "admin", targetId, `Password reset for ${existing.display_name} (${existing.email})`);

        return jsonResponse({ message: "Password reset successfully." }, 200);
      }

      return jsonResponse({ error: "Invalid action." }, 400);
    } catch (error) {
      console.error("admin-user-detail POST error", error);
      return jsonResponse({ error: "Could not process request." }, 500);
    }
  }

  if (request.method === "DELETE") {
    if (!userId) return jsonResponse({ error: "User ID is required." }, 400);

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        const { data: user } = await supabase
          .from("user_profiles")
          .select("id, email, display_name")
          .eq("id", userId)
          .maybeSingle();

        if (!user) return jsonResponse({ error: "User not found." }, 404);

        await supabase
          .from("user_profiles")
          .update({ status: "deleted", updated_at: new Date().toISOString() })
          .eq("id", userId);

        await logAdminAction("User Deleted", "admin", userId, `Deleted user ${user.display_name} (${user.email})`);
        return jsonResponse({ message: "User deleted successfully." }, 200);
      }

      const user = await getUserById(userId);
      if (!user) return jsonResponse({ error: "User not found." }, 404);

      await saveUser({ id: userId, status: "deleted" });
      await logAdminAction("User Deleted", "admin", userId, `Deleted user ${user.display_name} (${user.email})`);

      return jsonResponse({ message: "User deleted successfully." }, 200);
    } catch (error) {
      console.error("admin-user-detail DELETE error", error);
      return jsonResponse({ error: "Could not delete user." }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
};
