import type { IncomingMessage, ServerResponse } from "node:http";
import { createVercelHandler } from "../server/vercel-adapter.js";

import adminSession from "../netlify/functions/admin-session.js";
import adminStats from "../netlify/functions/admin-stats.js";
import adminUsers from "../netlify/functions/admin-users.js";
import adminUserDetail from "../netlify/functions/admin-user-detail.js";
import adminPlans from "../netlify/functions/admin-plans.js";
import adminActivity from "../netlify/functions/admin-activity.js";
import adminCards from "../netlify/functions/admin-cards.js";
import adminNotifications from "../netlify/functions/admin-notifications.js";
import adminApplications from "../netlify/functions/admin-applications.js";
import adminAnalytics from "../netlify/functions/admin-analytics.js";

import userSession from "../netlify/functions/user-session.js";
import userDashboard from "../netlify/functions/user-dashboard.js";
import userAuth from "../netlify/functions/user-auth.js";
import userCard from "../netlify/functions/user-card.js";
import userRegister from "../netlify/functions/user-register.js";
import userApplications from "../netlify/functions/user-applications.js";
import userPayment from "../netlify/functions/user-payment.js";
import userProfile from "../netlify/functions/user-profile.js";
import userChangePassword from "../netlify/functions/user-change-password.js";

import createCard from "../netlify/functions/create-card.js";
import updateCard from "../netlify/functions/update-card.js";
import verifyCard from "../netlify/functions/verify-card.js";

import createSubscription from "../netlify/functions/create-subscription.js";
import verifySubscription from "../netlify/functions/verify-subscription.js";
import razorpayWebhook from "../netlify/functions/razorpay-webhook.js";

import sendOtp from "../netlify/functions/send-otp.js";
import verifyOtp from "../netlify/functions/verify-otp.js";

import plans from "../netlify/functions/plans.js";

type Handler = (request: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "admin-session": adminSession,
  "admin-stats": adminStats,
  "admin-users": adminUsers,
  "admin-user-detail": adminUserDetail,
  "admin-plans": adminPlans,
  "admin-activity": adminActivity,
  "admin-cards": adminCards,
  "admin-notifications": adminNotifications,
  "admin-applications": adminApplications,
  "admin-analytics": adminAnalytics,
  "user-session": userSession,
  "user-dashboard": userDashboard,
  "user-auth": userAuth,
  "user-card": userCard,
  "user-register": userRegister,
  "user-applications": userApplications,
  "user-payment": userPayment,
  "user-profile": userProfile,
  "user-change-password": userChangePassword,
  "create-card": createCard,
  "update-card": updateCard,
  "verify-card": verifyCard,
  "create-subscription": createSubscription,
  "verify-subscription": verifySubscription,
  "razorpay-webhook": razorpayWebhook,
  "send-otp": sendOtp,
  "verify-otp": verifyOtp,
  "plans": plans,
};

export default async (req: IncomingMessage, res: ServerResponse) => {
  const pathname = (req.url || "/").split("?")[0].replace(/^\/api\//, "").replace(/\/$/, "");

  const handler = routes[pathname];
  if (!handler) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "API route not found." }));
    return;
  }

  const vercelHandler = createVercelHandler(handler);
  return vercelHandler(req, res);
};
