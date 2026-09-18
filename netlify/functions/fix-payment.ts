import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { verifyUserSession } from "./user-session.js";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_shared/supabase.js";
import { addCard, savePayment, saveApplication } from "./_shared/store.js";
import crypto from "node:crypto";

export default async (request: Request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const authUser = await verifyUserSession(request);
  if (!authUser) return jsonResponse({ error: "Authentication required." }, 401);

  try {
    const body = await readJsonBody(request);
    const razorpayPaymentId = body.paymentId || "";
    const razorpayOrderId = body.orderId || "";

    if (!razorpayPaymentId || !razorpayOrderId) {
      return jsonResponse({ error: "Payment ID and Order ID required." }, 400);
    }

    const supabase = getSupabaseAdmin();

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", razorpayOrderId)
      .maybeSingle();

    let paymentId: string;

    if (existingPayment) {
      paymentId = existingPayment.id;
      // Update it
      await supabase.from("payments").update({
        transaction_id: razorpayPaymentId,
        status: "success",
        verified: true,
        user_id: authUser.userId,
        updated_at: new Date().toISOString()
      }).eq("id", paymentId);
    } else {
      // Create new payment
      paymentId = crypto.randomUUID();
      const { error: payErr } = await supabase.from("payments").insert([{
        id: paymentId,
        user_id: authUser.userId,
        order_id: razorpayOrderId,
        transaction_id: razorpayPaymentId,
        amount: 49900,
        currency: "INR",
        status: "success",
        gateway: "razorpay",
        verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
      if (payErr) return jsonResponse({ error: "Payment save failed: " + payErr.message }, 500);
    }

    // Check if card already exists for this payment
    const { data: existingCard } = await supabase
      .from("id_cards")
      .select("id, card_number")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existingCard) {
      return jsonResponse({ success: true, cardNumber: existingCard.card_number, message: "Card already exists." });
    }

    // Get user profile for name/photo
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("display_name, phone, email")
      .eq("id", authUser.userId)
      .maybeSingle();

    // Get application if exists
    const { data: app } = await supabase
      .from("card_applications")
      .select("*")
      .eq("user_id", authUser.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cardNumber = `MRY-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const qrToken = crypto.randomUUID();

    const { error: cardErr } = await supabase.from("id_cards").insert([{
      id: crypto.randomUUID(),
      card_number: cardNumber,
      name: app?.full_name || profile?.display_name || "",
      phone: app?.phone || profile?.phone || "",
      date_of_birth: app?.date_of_birth?.slice(0, 10) || "2000-01-01",
      address: app?.address || "",
      edit_token_hash: crypto.randomUUID(),
      photo_url: app?.photo_url || undefined,
      country: app?.country || "India",
      country_code: app?.country_code || "+91",
      user_id: authUser.userId,
      application_id: app?.id || undefined,
      plan_id: app?.plan_id || undefined,
      payment_id: paymentId,
      qr_token: qrToken,
      status: "active",
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }]);

    if (cardErr) return jsonResponse({ error: "Card create failed: " + cardErr.message }, 500);

    // Update application status
    if (app?.id) {
      await supabase.from("card_applications").update({
        status: "card_issued",
        updated_at: new Date().toISOString()
      }).eq("id", app.id);
    }

    return jsonResponse({ success: true, cardNumber, message: "Card created successfully!" });
  } catch (error) {
    console.error("fix-payment error:", error);
    return jsonResponse({ error: "Fix failed." }, 500);
  }
};
