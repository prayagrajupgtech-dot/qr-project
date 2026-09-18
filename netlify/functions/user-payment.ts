import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { verifyUserSession } from "./user-session.js";
import {
  getApplicationById,
  saveApplication,
  getPaymentByOrderId,
  savePayment,
  getPlanById,
  addCard,
  getCardsByUserId,
  saveNotification
} from "./_shared/store.js";
import { getRazorpayOrderConfig, verifyHmac } from "./_shared/razorpay.js";
import { getSupabaseAdmin } from "./_shared/supabase.js";

export default async (request: Request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "create";

  // --- Create payment order ---
  if (action === "create") {
    const authUser = await verifyUserSession(request);
    if (!authUser) return jsonResponse({ error: "Authentication required." }, 401);

    try {
      const body = await readJsonBody(request);
      const applicationId = typeof body.applicationId === "string" ? body.applicationId.trim() : "";

      if (!applicationId) return jsonResponse({ error: "Application ID is required." }, 400);

      const application = await getApplicationById(applicationId);
      if (!application) return jsonResponse({ error: "Application not found." }, 404);
      if (application.user_id !== authUser.userId) return jsonResponse({ error: "Application not found." }, 404);
      if (!["completed", "submitted"].includes(application.status)) {
        return jsonResponse({ error: "Application is not ready for payment." }, 400);
      }

      const existingCards = await getCardsByUserId(authUser.userId);
      if (existingCards.some(c => c.status === "active")) {
        return jsonResponse({ error: "You already have an active card." }, 400);
      }

      const plan = application.plan_id ? await getPlanById(application.plan_id) : null;
      if (!plan) return jsonResponse({ error: "Plan not found for this application." }, 400);

      const { keyId, keySecret } = getRazorpayOrderConfig();
      const amount = plan.price * 100;
      const currency = plan.currency || "INR";

      const rpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount, currency, receipt: applicationId })
      });
      const rpOrder = await rpResponse.json() as { id?: string; error?: string };
      if (!rpOrder.id) {
        return jsonResponse({ error: rpOrder.error || "Could not create payment order." }, 500);
      }

      const payment = await savePayment({
        user_id: authUser.userId,
        application_id: applicationId,
        plan_id: application.plan_id,
        order_id: rpOrder.id,
        amount,
        currency,
        status: "created",
        gateway: "razorpay",
        verified: false
      });

      await saveApplication({ id: applicationId, status: "payment_pending" });

      return jsonResponse({ orderId: rpOrder.id, amount, currency, key: keyId, paymentId: payment.id });
    } catch (error) {
      if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
        return jsonResponse({ error: "Request is too large." }, 413);
      }
      if (error instanceof Error && error.message === "INVALID_JSON") {
        return jsonResponse({ error: "Invalid request." }, 400);
      }
      console.error("user-payment create error:", error);
      return jsonResponse({ error: "Could not create payment order." }, 500);
    }
  }

  // --- Verify payment ---
  if (action === "verify") {
    const authUser = await verifyUserSession(request);
    if (!authUser) return jsonResponse({ error: "Authentication required." }, 401);

    try {
      const body = await readJsonBody(request);
      const razorpayPaymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
      const razorpayOrderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
      const razorpaySignature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";

      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return jsonResponse({ error: "Incomplete payment verification data." }, 400);
      }

      const { keySecret } = getRazorpayOrderConfig();
      const signatureValid = verifyHmac(`${razorpayPaymentId}|${razorpayOrderId}`, razorpaySignature, keySecret);
      if (!signatureValid) {
        return jsonResponse({ error: "Payment signature verification failed." }, 400);
      }

      const payment = await getPaymentByOrderId(razorpayOrderId);
      if (!payment) return jsonResponse({ error: "Payment not found." }, 404);

      // Idempotent: if already verified, return existing card
      if (payment.verified && payment.status === "success") {
        const existingCards = await getCardsByUserId(authUser.userId);
        const card = existingCards.find(c => c.payment_id === payment.id);
        if (card) {
          return jsonResponse({ success: true, card: { cardNumber: card.card_number, qrToken: card.qr_token, id: card.id } });
        }
      }

      await savePayment({
        id: payment.id,
        transaction_id: razorpayPaymentId,
        status: "success",
        verified: true
      });

      if (payment.application_id) {
        await saveApplication({ id: payment.application_id, status: "payment_success" });
      }

      // Create ID card
      const application = payment.application_id ? await getApplicationById(payment.application_id) : null;
      const plan = payment.plan_id ? await getPlanById(payment.plan_id) : null;

      const cardNumber = `MRY-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const qrToken = crypto.randomUUID();

      const newCard = await addCard({
        id: crypto.randomUUID(),
        card_number: cardNumber,
        name: application?.full_name || "",
        phone: application?.phone || "",
        date_of_birth: application?.date_of_birth?.slice(0, 10) || "2000-01-01",
        address: application?.address || "",
        edit_token_hash: crypto.randomUUID(),
        photo_url: application?.photo_url || undefined,
        country: application?.country || undefined,
        country_code: application?.country_code || undefined,
        user_id: authUser.userId,
        application_id: payment.application_id || undefined,
        plan_id: payment.plan_id || undefined,
        payment_id: payment.id,
        qr_token: qrToken,
        status: "active",
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      if (payment.application_id) {
        await saveApplication({ id: payment.application_id, status: "card_issued" });
      }

      await saveNotification({
        type: "card_issued",
        title: "Card Issued",
        message: `Your ID card ${cardNumber} has been issued successfully.`,
        related_user_id: authUser.userId,
        related_application_id: payment.application_id || null,
        read: false
      });

      await saveNotification({
        type: "payment_success",
        title: "Payment Successful",
        message: `Payment of ₹${(payment.amount / 100).toFixed(2)} received for ${plan?.name || "plan"}.`,
        related_user_id: authUser.userId,
        related_application_id: payment.application_id || null,
        read: false
      });

      return jsonResponse({ success: true, card: { cardNumber, qrToken, id: newCard.id } });
    } catch (error) {
      console.error("user-payment verify error:", error);
      return jsonResponse({ error: "Could not verify payment." }, 500);
    }
  }

  // --- Razorpay webhook (no auth, verify HMAC) ---
  if (action === "webhook") {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    try {
      const { webhookSecret } = getRazorpayOrderConfig();
      if (!webhookSecret || !verifyHmac(rawBody, signature, webhookSecret)) {
        return jsonResponse({ error: "Invalid webhook signature." }, 401);
      }

      const event = JSON.parse(rawBody) as {
        event?: string;
        payload?: {
          payment?: {
            entity?: {
              id?: string;
              order_id?: string;
              status?: string;
              amount?: number;
              currency?: string;
            };
          };
        };
      };

      const orderId = event.payload?.payment?.entity?.order_id;
      if (!orderId) return jsonResponse({ received: true });

      const paymentEntity = event.payload?.payment?.entity;

      if (event.event === "payment.captured") {
        const payment = await getPaymentByOrderId(orderId);
        if (payment) {
          await savePayment({
            id: payment.id,
            transaction_id: paymentEntity?.id || undefined,
            status: "success",
            verified: true
          });

          if (payment.application_id) {
            await saveApplication({ id: payment.application_id, status: "payment_success" });

            // Create card if not already created (idempotent)
            const existingCards = await getCardsByUserId(payment.user_id || "");
            if (!existingCards.some(c => c.payment_id === payment.id)) {
              const application = await getApplicationById(payment.application_id);
              const cardNumber = `MRY-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
              const qrToken = crypto.randomUUID();

              await addCard({
                id: crypto.randomUUID(),
                card_number: cardNumber,
                name: application?.full_name || "",
                phone: application?.phone || "",
                date_of_birth: application?.date_of_birth?.slice(0, 10) || "2000-01-01",
                address: application?.address || "",
                edit_token_hash: crypto.randomUUID(),
                photo_url: application?.photo_url || undefined,
                country: application?.country || undefined,
                country_code: application?.country_code || undefined,
                user_id: payment.user_id || undefined,
                application_id: payment.application_id || undefined,
                plan_id: payment.plan_id || undefined,
                payment_id: payment.id,
                qr_token: qrToken,
                status: "active",
                issued_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });

              await saveApplication({ id: payment.application_id, status: "card_issued" });

              await saveNotification({
                type: "card_issued",
                title: "Card Issued",
                message: `Your ID card ${cardNumber} has been issued successfully.`,
                related_user_id: payment.user_id || null,
                related_application_id: payment.application_id || null,
                read: false
              });

              await saveNotification({
                type: "payment_success",
                title: "Payment Successful",
                message: `Payment received via webhook.`,
                related_user_id: payment.user_id || null,
                related_application_id: payment.application_id || null,
                read: false
              });
            }
          }
        } else {
          await savePayment({
            user_id: null,
            order_id: orderId,
            transaction_id: paymentEntity?.id || null,
            amount: paymentEntity?.amount || 0,
            currency: paymentEntity?.currency || "INR",
            status: "success",
            gateway: "razorpay",
            verified: true
          });
        }
      }

      if (event.event === "payment.failed") {
        const payment = await getPaymentByOrderId(orderId);
        if (payment) {
          await savePayment({
            id: payment.id,
            status: "failed",
            verified: false
          });

          if (payment.application_id) {
            await saveApplication({ id: payment.application_id, status: "payment_failed" });
          }

          await saveNotification({
            type: "payment_failed",
            title: "Payment Failed",
            message: `Payment for order ${orderId} has failed.`,
            related_user_id: payment.user_id || null,
            related_application_id: payment.application_id || null,
            read: false
          });
        }
      }

      return jsonResponse({ received: true });
    } catch (error) {
      console.error("user-payment webhook error:", error);
      return jsonResponse({ error: "Webhook processing failed." }, 500);
    }
  }

  // --- Recover cards for successful payments that didn't get cards ---
  if (action === "recover") {
    const authUser = await verifyUserSession(request);
    if (!authUser) return jsonResponse({ error: "Authentication required." }, 401);

    try {
      const supabase = getSupabaseAdmin();

      // Find all successful payments for this user
      const { data: payments, error: pErr } = await supabase
        .from("payments")
        .select("id, application_id, plan_id")
        .eq("user_id", authUser.userId)
        .eq("status", "success");

      if (pErr) return jsonResponse({ error: pErr.message }, 500);
      if (!payments || payments.length === 0) return jsonResponse({ message: "No successful payments found." });

      const recovered: string[] = [];

      for (const payment of payments) {
        // Check if card already exists for this payment
        const { data: existingCards } = await supabase
          .from("id_cards")
          .select("id")
          .eq("payment_id", payment.id)
          .limit(1);

        if (existingCards && existingCards.length > 0) continue;

        // Get application
        const application = payment.application_id
          ? await getApplicationById(payment.application_id)
          : null;

        const cardNumber = `MRY-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
        const qrToken = crypto.randomUUID();

        const newCard = await addCard({
          id: crypto.randomUUID(),
          card_number: cardNumber,
          name: application?.full_name || "",
          phone: application?.phone || "",
          date_of_birth: application?.date_of_birth?.slice(0, 10) || "2000-01-01",
          address: application?.address || "",
          edit_token_hash: crypto.randomUUID(),
          photo_url: application?.photo_url || undefined,
          country: application?.country || undefined,
          country_code: application?.country_code || undefined,
          user_id: authUser.userId,
          application_id: payment.application_id || undefined,
          plan_id: payment.plan_id || undefined,
          payment_id: payment.id,
          qr_token: qrToken,
          status: "active",
          issued_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

        if (payment.application_id) {
          await saveApplication({ id: payment.application_id, status: "card_issued" });
        }

        recovered.push(cardNumber);
      }

      return jsonResponse({ recovered, count: recovered.length });
    } catch (error) {
      console.error("user-payment recover error:", error);
      return jsonResponse({ error: "Could not recover cards." }, 500);
    }
  }

  return jsonResponse({ error: "Invalid action." }, 400);
};

