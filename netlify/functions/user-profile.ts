import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { verifyUserSession } from "./user-session.js";
import { getUserById, saveUser } from "./_shared/store.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";

export default async (request: Request) => {
  const authUser = await verifyUserSession(request);
  if (!authUser) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  try {
    if (request.method === "GET") {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("id, email, display_name, phone, country, country_code, status, created_at")
          .eq("id", authUser.userId)
          .maybeSingle();

        if (error) {
          console.error("user-profile fetch error:", error);
          return jsonResponse({ error: "Failed to fetch profile." }, 500);
        }

        return jsonResponse({
          profile: {
            id: profile?.id || authUser.userId,
            email: profile?.email || authUser.email || "",
            display_name: profile?.display_name || "",
            phone: profile?.phone || "",
            country: profile?.country || "",
            country_code: profile?.country_code || "",
            status: profile?.status || "active",
            created_at: profile?.created_at || null
          }
        });
      }

      const user = await getUserById(authUser.userId);
      return jsonResponse({
        profile: {
          id: user?.id || authUser.userId,
          email: user?.email || authUser.email || "",
          display_name: user?.display_name || "",
          phone: user?.phone || "",
          country: user?.country || "",
          country_code: user?.country_code || "",
          status: user?.status || "active",
          created_at: user?.created_at || null
        }
      });
    }

    if (request.method === "POST") {
      const body = await readJsonBody(request);

      const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const country = typeof body.country === "string" ? body.country.trim() : "";
      const country_code = typeof body.country_code === "string" ? body.country_code.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      // Accept both `photo_url` (current) and legacy `photo` key from older clients.
      const rawPhoto = typeof body.photo_url === "string" ? body.photo_url : typeof body.photo === "string" ? body.photo : "";
      const photo_url = rawPhoto.trim();

      if (!display_name) {
        return jsonResponse({ error: "Display name is required." }, 400);
      }

      if (!phone) {
        return jsonResponse({ error: "Phone number is required." }, 400);
      }

      if (photo_url && !photo_url.startsWith("data:image/")) {
        return jsonResponse({ error: "Photo must be a valid base64 image." }, 400);
      }

      if (photo_url) {
        const sizeInBytes = Math.ceil((photo_url.length * 3) / 4);
        if (sizeInBytes > 5 * 1024 * 1024) {
          return jsonResponse({ error: "Photo must be smaller than 5MB." }, 400);
        }
      }

      const updates: Record<string, string> = {
        display_name,
        country,
        country_code,
        phone
      };

      if (photo_url) {
        updates.photo_url = photo_url;
      } else if (body.photo_url === null || body.photo_url === "" || body.photo === null || body.photo === "") {
        updates.photo_url = "";
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("user_profiles")
          .update(updates)
          .eq("id", authUser.userId)
          .select("id, email, display_name, phone, country, country_code, status, created_at")
          .single();

        if (error) {
          console.error("user-profile update error:", error);
          return jsonResponse({ error: "Failed to update profile." }, 500);
        }

        return jsonResponse({ profile: data });
      }

      const existing = await getUserById(authUser.userId);
      if (!existing) {
        return jsonResponse({ error: "User not found." }, 404);
      }

      const updated = await saveUser({ ...existing, ...updates });
      return jsonResponse({
        profile: {
          id: updated.id,
          email: updated.email,
          display_name: updated.display_name,
          phone: updated.phone,
          country: updated.country || "",
          country_code: updated.country_code || "",
          status: updated.status,
          created_at: updated.created_at
        }
      });
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("user-profile error:", error);
    return jsonResponse({ error: "Failed to process request." }, 500);
  }
};
