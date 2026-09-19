import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  isAdminRequest,
  verifyAdminPassword
} from "./_shared/admin-auth.js";
import { jsonResponse, readJsonBody } from "./_shared/http.js";

export async function verifyAdminSession(request: Request) {
  if (await isAdminRequest(request)) {
    return { authenticated: true };
  }
  return null;
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      return jsonResponse({ authenticated: await isAdminRequest(request) });
    }

    if (request.method === "POST") {
      const body = await readJsonBody(request, 1_000);
      const action = typeof body.action === "string" ? body.action : "login";

      // Handle change-password action
      if (action === "change-password") {
        const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
        const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

        if (!currentPassword || !newPassword) {
          return jsonResponse({ error: "Current and new password are required." }, 400);
        }
        if (newPassword.length < 8) {
          return jsonResponse({ error: "New password must be at least 8 characters." }, 400);
        }

        let currentValid = false;
        try {
          currentValid = await verifyAdminPassword(currentPassword);
        } catch {
          return jsonResponse({ error: "Admin authentication is not configured." }, 500);
        }
        if (!currentValid) {
          return jsonResponse({ error: "Current password is incorrect." }, 401);
        }

        // For env-based auth, we can't actually change the password server-side
        // (it's stored in .env). Return success with a note.
        return jsonResponse({
          success: true,
          message: "Password verified. For env-based admin auth, update ADMIN_PASSWORD in your .env file and redeploy."
        });
      }

      // Default login action
      const password = typeof body.password === "string" ? body.password : "";

      if (!password) {
        return jsonResponse({ error: "Password is required." }, 400);
      }

      let passwordValid = false;
      try {
        passwordValid = await verifyAdminPassword(password);
      } catch (envError) {
        console.error("Admin auth config error:", envError);
        return jsonResponse({ error: "Admin authentication is not configured on the server." }, 500);
      }

      if (!passwordValid) {
        return jsonResponse({ error: "Invalid admin password." }, 401);
      }

      const response = jsonResponse({ authenticated: true });
      response.headers.set("Set-Cookie", await createAdminSessionCookie(request));
      return response;
    }

    if (request.method === "DELETE") {
      const response = jsonResponse({ authenticated: false });
      response.headers.set("Set-Cookie", clearAdminSessionCookie(request));
      return response;
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof Error && (error.message === "INVALID_JSON" || error.message === "PAYLOAD_TOO_LARGE")) {
      return jsonResponse({ error: "Invalid request." }, 400);
    }
    console.error("admin-session failed", error);
    return jsonResponse({ error: "Admin authentication service encountered an error." }, 500);
  }
};
