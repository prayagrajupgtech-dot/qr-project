import { jsonResponse } from "./_shared/http.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";
import { getAllCards, getPlanById } from "./_shared/store.js";

export default async (request: Request) => {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) {
    return jsonResponse({ error: "Invalid verification ID." }, 400);
  }

  try {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();

      // Try UUID lookup first (backward compatibility)
      let data = null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      if (isUuid) {
        const result = await supabase
          .from("id_cards")
          .select("id, card_number, name, phone, parent_phone, date_of_birth, address, photo_url, status, user_id, plan_id, created_at, issued_at, expires_at")
          .eq("id", id)
          .maybeSingle();
        data = result.data;
      }

      // If not found by UUID, try card_number lookup
      if (!data) {
        const result = await supabase
          .from("id_cards")
          .select("id, card_number, name, phone, parent_phone, date_of_birth, address, photo_url, status, user_id, plan_id, created_at, issued_at, expires_at")
          .eq("card_number", id)
          .maybeSingle();
        data = result.data;
      }

      if (!data) {
        return jsonResponse({ error: "Verification record not found." }, 404);
      }

      // Runtime expiry check — if expires_at has passed, treat as expired
      let effectiveStatus = data.status;
      if (data.status === "active" && data.expires_at) {
        if (new Date(data.expires_at) < new Date()) {
          effectiveStatus = "expired";
          await supabase.from("id_cards").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", data.id);
        }
      }

      // Fetch plan name if plan_id exists
      let planName = "Basic";
      if (data.plan_id) {
        const { data: plan } = await supabase
          .from("plans")
          .select("name")
          .eq("id", data.plan_id)
          .maybeSingle();
        if (plan) planName = plan.name;
      }

      return jsonResponse({
        cardNumber: data.card_number,
        createdAt: data.created_at,
        name: data.name,
        phone: data.phone,
        parentPhone: data.parent_phone || null,
        dateOfBirth: data.date_of_birth,
        address: data.address,
        photoUrl: data.photo_url || null,
        status: effectiveStatus,
        planName,
        expiresAt: data.expires_at || null
      });
    }

    // Local store fallback
    const cards = await getAllCards();
    const card = cards.find(c => c.id === id || c.card_number === id);

    if (!card) {
      return jsonResponse({ error: "Verification record not found." }, 404);
    }

    // Runtime expiry check
    let effectiveStatus = card.status;
    if (card.status === "active" && card.expires_at) {
      if (new Date(card.expires_at) < new Date()) {
        effectiveStatus = "expired";
      }
    }

    let planName = "Basic";
    if (card.plan_id) {
      const plan = await getPlanById(card.plan_id);
      if (plan) planName = plan.name;
    }

    return jsonResponse({
      cardNumber: card.card_number,
      createdAt: card.created_at,
      name: card.name,
      phone: card.phone,
      parentPhone: (card as { parent_phone?: string }).parent_phone || null,
      dateOfBirth: card.date_of_birth,
      address: card.address,
      photoUrl: card.photo_url || null,
      status: effectiveStatus,
      planName,
      expiresAt: card.expires_at || null
    });
  } catch (error) {
    console.error("verify-card failed", error);
    return jsonResponse({ error: "Server configuration error." }, 500);
  }
};
