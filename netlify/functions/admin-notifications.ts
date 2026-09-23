import { jsonResponse, readJsonBody } from "./_shared/http.js";
import { requireAdmin } from "./_shared/admin-auth.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
} from "./_shared/store.js";

export default async (request: Request) => {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  // GET - List notifications
  if (request.method === "GET") {
    try {
      const [notifications, unreadCount] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount()
      ]);
      return jsonResponse({ notifications, unreadCount }, 200);
    } catch (error) {
      console.error("admin-notifications GET error", error);
      return jsonResponse(
        { error: "Could not fetch notifications." },
        500,
      );
    }
  }

  // PATCH - Mark as read
  if (request.method === "PATCH") {
    try {
      const body = await readJsonBody(request);
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      await markNotificationsRead(ids);
      return jsonResponse({ success: true }, 200);
    } catch (error) {
      console.error("admin-notifications PATCH error", error);
      return jsonResponse(
        { error: "Could not mark notifications as read." },
        500,
      );
    }
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
};
