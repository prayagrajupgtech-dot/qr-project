import { jsonResponse } from "./_shared/http.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";
import { verifyUserSession } from "./user-session.js";
import { getUserById, getUserByEmail, getCardsByUserId } from "./_shared/store.js";

export default async (request: Request) => {
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);

  const authUser = await verifyUserSession(request);
  if (!authUser) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  try {
    let userRecord = await getUserById(authUser.userId);
    if (!userRecord && authUser.email) {
      userRecord = await getUserByEmail(authUser.email);
    }

    if (userRecord?.status === "blocked") {
      return jsonResponse({ error: "Your account has been blocked." }, 403);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, status")
        .eq("id", authUser.userId)
        .single();

      if (profile?.status === "blocked") {
        return jsonResponse({ error: "Your account has been blocked." }, 403);
      }

      const { data: cards, error } = await supabase
        .from("id_cards")
        .select("id, card_number, name, phone, parent_phone, date_of_birth, address, photo_url, status, plan_id, created_at")
        .eq("user_id", authUser.userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("user-card fetch error", error);
        return jsonResponse({ error: "Could not load your card." }, 500);
      }

      if (!cards || cards.length === 0) {
        return jsonResponse({ card: null });
      }

      const card = cards[0];
      return jsonResponse({
        card: {
          id: card.id,
          cardNumber: card.card_number,
          name: card.name,
          phone: card.phone,
          parentPhone: (card as any).parent_phone || null,
          dateOfBirth: card.date_of_birth,
          address: card.address,
          photoUrl: card.photo_url || null,
          status: card.status,
          planId: card.plan_id || null,
          createdAt: card.created_at
        }
      });
    }

    // Local store fallback
    const cards = await getCardsByUserId(userRecord?.id || authUser.userId);
    if (cards.length === 0) {
      return jsonResponse({ card: null });
    }

    const card = cards.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return jsonResponse({
      card: {
        id: card.id,
        cardNumber: card.card_number,
        name: card.name,
        phone: card.phone,
        dateOfBirth: card.date_of_birth,
        address: card.address,
        photoUrl: card.photo_url || null,
        status: card.status,
        planId: card.plan_id || null,
        createdAt: card.created_at
      }
    });
  } catch (error) {
    console.error("user-card error:", error);
    return jsonResponse({ error: "Failed to load your card." }, 500);
  }
};
