import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { verifyUserSession } from "./user-session.js";
import {
  getApplicationsByUserId,
  getApplicationById,
  saveApplication,
  getAllPlans,
  saveNotification
} from "./_shared/store.js";

export default async (request: Request) => {
  // GET - List user's applications
  if (request.method === "GET") {
    const authUser = await verifyUserSession(request);
    if (!authUser) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    try {
      const applications = await getApplicationsByUserId(authUser.userId);
      const plans = await getAllPlans();
      const planMap = new Map(plans.map(p => [p.id, p]));

      const enrichedApplications = applications.map(app => ({
        ...app,
        plan: app.plan_id ? planMap.get(app.plan_id) || null : null
      }));

      return jsonResponse({ applications: enrichedApplications });
    } catch (error) {
      console.error("user-applications GET error:", error);
      return jsonResponse({ error: "Failed to load applications." }, 500);
    }
  }

  // POST - Create or update application
  if (request.method === "POST") {
    const authUser = await verifyUserSession(request);
    if (!authUser) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    try {
      const body = await readJsonBody(request);

      const id = typeof body.id === "string" ? body.id : null;
      const planId = typeof body.plan_id === "string" ? body.plan_id : null;
      const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      const parentPhone = typeof body.parent_phone === "string" ? body.parent_phone.trim() : null;
      const country = typeof body.country === "string" ? body.country.trim() : "";
      const countryCode = typeof body.country_code === "string" ? body.country_code.trim() : "";
      const dateOfBirth = typeof body.date_of_birth === "string" ? body.date_of_birth.trim() : "";
      const address = typeof body.address === "string" ? body.address.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const photoUrl = typeof body.photo_url === "string" ? body.photo_url.trim() : null;
      const requestedStatus = typeof body.status === "string" ? body.status.trim() : null;

      if (id) {
        const existing = await getApplicationById(id);
        if (!existing || existing.user_id !== authUser.userId) {
          return jsonResponse({ error: "Application not found." }, 404);
        }
      }

      // Age check - only 18 years or older can apply.
      if (dateOfBirth) {
        const parts = dateOfBirth.split("-").map(Number);
        if (parts.length !== 3 || parts.some(n => isNaN(n))) {
          return jsonResponse({ error: "Invalid date of birth." }, 400);
        }
        const [y, m, d] = parts;
        const today = new Date();
        let age = today.getFullYear() - y;
        if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) {
          age -= 1;
        }
        if (age < 18) {
          return jsonResponse({ error: "You must be 18 years or older to apply. Children are not eligible for this card." }, 400);
        }
      }

      // Progress calculation - weights MUST match frontend
      let completionPercentage = 0;
      if (fullName) completionPercentage += 15;
      if (phone) completionPercentage += 15;
      if (country) completionPercentage += 10;
      if (dateOfBirth) completionPercentage += 15;
      if (address) completionPercentage += 15;
      if (email) completionPercentage += 10;
      if (planId) completionPercentage += 10;
      if (photoUrl) completionPercentage += 10;

      // Determine status - respect user's explicit status request when valid
      let status: CardApplicationRecord["status"] = "draft";
      if (requestedStatus === "submitted" && completionPercentage === 100) {
        status = "submitted";
      } else if (requestedStatus === "cancelled") {
        status = "cancelled";
      } else if (completionPercentage === 100) {
        status = "completed";
      } else if (completionPercentage >= 50) {
        status = "incomplete";
      }

      const application = await saveApplication({
        id: id || undefined,
        user_id: authUser.userId,
        plan_id: planId,
        full_name: fullName,
        phone,
        parent_phone: parentPhone,
        country,
        country_code: countryCode,
        date_of_birth: dateOfBirth || null,
        address,
        email,
        photo_url: photoUrl,
        completion_percentage: completionPercentage,
        status
      });

      if (requestedStatus === "submitted" && completionPercentage === 100) {
        await saveNotification({
          type: "application_submitted",
          title: "Application Submitted",
          message: `${fullName || "User"} has submitted their card application.`,
          related_user_id: authUser.userId,
          related_application_id: application.id,
          read: false
        });
      } else if (completionPercentage === 100 && !requestedStatus) {
        // First time reaching 100% without explicit submit
        await saveNotification({
          type: "application_started",
          title: "Application Completed",
          message: `${fullName || "User"} has completed their application form.`,
          related_user_id: authUser.userId,
          related_application_id: application.id,
          read: false
        });
      }

      return jsonResponse({ application });
    } catch (error) {
      console.error("user-applications POST error:", error);
      const message = error instanceof Error ? error.message : "Failed to save application.";
      return jsonResponse({ error: message }, 500);
    }
  }

  // PATCH - Update application status
  if (request.method === "PATCH") {
    const authUser = await verifyUserSession(request);
    if (!authUser) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    try {
      const body = await readJsonBody(request);
      const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
      const status = typeof body.status === "string" ? body.status : "";

      if (!applicationId || !status) {
        return jsonResponse({ error: "Application ID and status are required." }, 400);
      }

      const application = await getApplicationById(applicationId);
      if (!application || application.user_id !== authUser.userId) {
        return jsonResponse({ error: "Application not found." }, 404);
      }

      const allowedStatuses = ["draft", "incomplete", "completed", "cancelled"];
      if (!allowedStatuses.includes(status)) {
        return jsonResponse({ error: "Invalid status." }, 400);
      }

      const updated = await saveApplication({
        id: applicationId,
        status: status as any
      });

      return jsonResponse({ application: updated });
    } catch (error) {
      console.error("user-applications PATCH error:", error);
      return jsonResponse({ error: "Failed to update application." }, 500);
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
};

type CardApplicationRecord = {
  status: "draft" | "incomplete" | "completed" | "submitted" | "payment_pending" | "payment_success" | "payment_failed" | "card_issued" | "card_active" | "card_suspended" | "cancelled";
};
