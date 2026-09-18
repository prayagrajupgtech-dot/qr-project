import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { requireAdmin } from "./_shared/admin-auth.js";
import { getAllCards, addCard, getUserByEmail, saveUser, getPlanById, logAdminAction } from "./_shared/store.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findOrCreateUserByEmail(email: string, name: string, phone: string, planId: string | null): Promise<{ id: string; isNew: boolean }> {
  const normalizedEmail = normalizeEmail(email);

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id, status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return { id: existing.id, isNew: false };
    }

    // Create new pending user profile
    const newUserId = crypto.randomUUID();
    const { error } = await supabase.from("user_profiles").insert({
      id: newUserId,
      email: normalizedEmail,
      display_name: name,
      phone: phone || "",
      role: "user",
      status: "pending",
      plan_id: planId,
      password_configured: false
    });

    if (error) {
      console.error("Failed to create pending user:", error);
      throw new Error("Could not create user account.");
    }

    return { id: newUserId, isNew: true };
  }

  // Local store fallback
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const newUser = await saveUser({
    email: normalizedEmail,
    display_name: name,
    phone: phone || "",
    role: "user",
    status: "pending",
    plan_id: planId
  });

  return { id: newUser.id, isNew: true };
}

export default async (request: Request) => {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  // GET - List all cards
  if (request.method === "GET") {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { data: cards, error } = await supabase
          .from("id_cards")
          .select("id, card_number, name, phone, date_of_birth, address, photo_url, user_id, plan_id, status, created_at")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("admin-cards GET error", error);
          return jsonResponse({ error: "Could not fetch cards." }, 500);
        }

        // Enrich cards with email from user_profiles
        const enrichedCards = await Promise.all((cards || []).map(async (card) => {
          let email = "";
          if (card.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("email")
              .eq("id", card.user_id)
              .maybeSingle();
            email = profile?.email || "";
          }
          return { ...card, email };
        }));

        return jsonResponse({ cards: enrichedCards }, 200);
      }

      const cards = await getAllCards();
      return jsonResponse({ cards }, 200);
    } catch (error) {
      console.error("admin-cards GET error", error);
      return jsonResponse({ error: "Could not fetch cards." }, 500);
    }
  }

  // POST - Create a card (admin only)
  if (request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
      const dateOfBirth = typeof body.dateOfBirth === "string" ? body.dateOfBirth : "";
      const address = typeof body.address === "string" ? body.address.trim() : "";
      const planId = typeof body.planId === "string" ? body.planId : null;
      const photoUrl = typeof body.photo_url === "string" ? body.photo_url : undefined;

      if (!email || !isValidEmail(email)) {
        return jsonResponse({ error: "A valid email address is required." }, 400);
      }
      if (!name || !dateOfBirth || !address) {
        return jsonResponse({ error: "Name, date of birth, and address are required." }, 400);
      }
      if (!planId) {
        return jsonResponse({ error: "Please select a plan before issuing the card." }, 400);
      }
      if (!await getPlanById(planId)) {
        return jsonResponse({ error: "The selected plan could not be found." }, 400);
      }

      // Find or create user by email
      const { id: userId, isNew } = await findOrCreateUserByEmail(email, name, phone, planId);

      let effectivePlanId = planId;

      const cardNumber = `ID-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

      const newCard = await addCard({
        id: crypto.randomUUID(),
        card_number: cardNumber,
        name,
        phone,
        date_of_birth: dateOfBirth?.slice(0, 10) || "2000-01-01",
        address,
        edit_token_hash: crypto.randomUUID(),
        photo_url: photoUrl,
        user_id: userId,
        plan_id: effectivePlanId,
        status: "active",
        created_at: new Date().toISOString()
      });

      await logAdminAction(
        "Card Generated",
        "admin",
        userId,
        `Generated card ${cardNumber} for ${name} (${email})${isNew ? " [New account created]" : " [Linked to existing account]"}`
      );

      return jsonResponse({ id: newCard.id, cardNumber, userId, isNewAccount: isNew }, 201);
    } catch (error) {
      console.error("admin-cards POST error", error);
      const message = error instanceof Error ? error.message : "Could not create card.";
      return jsonResponse({ error: message }, 500);
    }
  }

  // PATCH - Update card (activate/deactivate)
  if (request.method === "PATCH") {
    try {
      const body = await readJsonBody(request);
      const cardId = typeof body.cardId === "string" ? body.cardId : "";
      const action = typeof body.action === "string" ? body.action : "";

      if (!cardId || !action) {
        return jsonResponse({ error: "Card ID and action are required." }, 400);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        if (action === "activate") {
          const { data, error } = await supabase
            .from("id_cards")
            .update({ status: "active" })
            .eq("id", cardId)
            .select("id, card_number, name")
            .maybeSingle();

          if (error) {
            console.error("admin-cards PATCH activate error", error);
            return jsonResponse({ error: "Could not activate card." }, 500);
          }
          if (!data) return jsonResponse({ error: "Card not found." }, 404);

          await logAdminAction("Card Activated", "admin", null, `Activated card ${data.card_number} (${data.name})`);
          return jsonResponse({ success: true, card: data });
        }

        if (action === "deactivate") {
          const { data, error } = await supabase
            .from("id_cards")
            .update({ status: "blocked" })
            .eq("id", cardId)
            .select("id, card_number, name")
            .maybeSingle();

          if (error) {
            console.error("admin-cards PATCH deactivate error", error);
            return jsonResponse({ error: "Could not deactivate card." }, 500);
          }
          if (!data) return jsonResponse({ error: "Card not found." }, 404);

          await logAdminAction("Card Deactivated", "admin", null, `Deactivated card ${data.card_number} (${data.name})`);
          return jsonResponse({ success: true, card: data });
        }

        return jsonResponse({ error: "Invalid action. Use 'activate' or 'deactivate'." }, 400);
      }

      // Local store fallback
      const cards = await getAllCards();
      const card = cards.find(c => c.id === cardId);
      if (!card) return jsonResponse({ error: "Card not found." }, 404);

      if (action === "activate") {
        card.status = "active";
      } else if (action === "deactivate") {
        card.status = "blocked";
      } else {
        return jsonResponse({ error: "Invalid action." }, 400);
      }

      await logAdminAction(
        action === "activate" ? "Card Activated" : "Card Deactivated",
        "admin",
        null,
        `${action === "activate" ? "Activated" : "Deactivated"} card ${card.card_number} (${card.name})`
      );

      return jsonResponse({ success: true, card: { id: card.id, card_number: card.card_number, name: card.name, status: card.status } });
    } catch (error) {
      console.error("admin-cards PATCH error", error);
      return jsonResponse({ error: "Could not update card." }, 500);
    }
  }

  // DELETE - Delete a card
  if (request.method === "DELETE") {
    try {
      const url = new URL(request.url);
      const cardId = url.searchParams.get("cardId") || "";

      if (!cardId) {
        return jsonResponse({ error: "Card ID is required." }, 400);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { data: card, error: fetchError } = await supabase
          .from("id_cards")
          .select("id, card_number, name")
          .eq("id", cardId)
          .maybeSingle();

        if (fetchError || !card) {
          return jsonResponse({ error: "Card not found." }, 404);
        }

        const { error: deleteError } = await supabase
          .from("id_cards")
          .delete()
          .eq("id", cardId);

        if (deleteError) {
          console.error("admin-cards DELETE error", deleteError);
          return jsonResponse({ error: "Could not delete card." }, 500);
        }

        await logAdminAction("Card Deleted", "admin", null, `Deleted card ${card.card_number} (${card.name})`);
        return jsonResponse({ success: true });
      }

      // Local store fallback
      const cards = await getAllCards();
      const idx = cards.findIndex(c => c.id === cardId);
      if (idx === -1) return jsonResponse({ error: "Card not found." }, 404);

      const deletedCard = cards[idx];
      cards.splice(idx, 1);

      await logAdminAction("Card Deleted", "admin", null, `Deleted card ${deletedCard.card_number} (${deletedCard.name})`);
      return jsonResponse({ success: true });
    } catch (error) {
      console.error("admin-cards DELETE error", error);
      return jsonResponse({ error: "Could not delete card." }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
};
