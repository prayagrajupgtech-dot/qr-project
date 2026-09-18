import fs from "fs";
import path from "path";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase.js";

export interface PlanRecord {
  id: string;
  name: string;
  price: number;
  currency?: string;
  duration_days: number;
  card_limit: number; // -1 for unlimited
  features?: string[];
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  phone: string;
  country?: string;
  country_code?: string;
  password_hash?: string;
  role: "admin" | "user";
  status: "active" | "blocked" | "deleted" | "pending";
  plan_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardApplicationRecord {
  id: string;
  user_id: string;
  plan_id: string | null;
  full_name: string;
  phone: string;
  parent_phone: string | null;
  country: string;
  country_code: string;
  date_of_birth: string | null;
  address: string;
  email: string;
  photo_url: string | null;
  completion_percentage: number;
  status: "draft" | "incomplete" | "completed" | "submitted" | "payment_pending" | "payment_success" | "payment_failed" | "card_issued" | "card_active" | "card_suspended" | "cancelled";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string | null;
  application_id: string | null;
  plan_id: string | null;
  order_id: string | null;
  transaction_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "pending" | "success" | "failed" | "cancelled" | "refunded";
  gateway: string;
  gateway_response?: any;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  type: "new_user" | "application_started" | "application_submitted" | "payment_success" | "payment_failed" | "card_issued";
  title: string;
  message: string;
  related_user_id: string | null;
  related_application_id: string | null;
  read: boolean;
  created_at: string;
}

export interface CardRecord {
  id: string;
  card_number: string;
  name: string;
  phone: string;
  parent_phone?: string | null;
  date_of_birth: string;
  address: string;
  edit_token_hash?: string;
  photo_url?: string;
  country?: string;
  country_code?: string;
  user_id?: string | null;
  application_id?: string | null;
  plan_id?: string | null;
  payment_id?: string | null;
  qr_token?: string | null;
  status: "active" | "expired" | "blocked";
  issued_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  admin_id: string;
  target_user_id?: string | null;
  details?: string | null;
  created_at: string;
}

// In-memory fallback data for local testing when Supabase is not connected
const mockPlans: PlanRecord[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Basic",
    price: 499,
    duration_days: 30,
    card_limit: 100,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Standard",
    price: 999,
    duration_days: 90,
    card_limit: 300,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Premium",
    price: 1999,
    duration_days: 365,
    card_limit: -1,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockUsers: UserRecord[] = [
  {
    id: "u-101",
    email: "user@example.com",
    display_name: "Amit Kumar",
    phone: "9876543210",
    role: "user",
    status: "active",
    plan_id: "11111111-1111-1111-1111-111111111111",
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u-102",
    email: "priya@example.com",
    display_name: "Priya Sharma",
    phone: "9876543211",
    role: "user",
    status: "active",
    plan_id: "22222222-2222-2222-2222-222222222222",
    last_login_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "u-103",
    email: "rahul@example.com",
    display_name: "Rahul Singh",
    phone: "9876543212",
    role: "user",
    status: "blocked",
    plan_id: "11111111-1111-1111-1111-111111111111",
    last_login_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockCards: CardRecord[] = [
  {
    id: "c-101",
    card_number: "MC-1001",
    name: "Amit Kumar",
    phone: "9876543210",
    date_of_birth: "1995-05-15",
    address: "123 Park Street, Delhi",
    user_id: "u-101",
    plan_id: "11111111-1111-1111-1111-111111111111",
    status: "active",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

const mockLogs: ActivityLog[] = [
  {
    id: "l-101",
    action: "System Initialized",
    admin_id: "admin",
    details: "Admin panel created and configured.",
    created_at: new Date().toISOString()
  }
];

// File persistence for local plans store when Supabase is not connected
const DATA_DIR = path.resolve(process.cwd(), ".data");
const PLANS_FILE = path.join(DATA_DIR, "plans.json");

function loadPlansFromDisk(): PlanRecord[] {
  try {
    if (fs.existsSync(PLANS_FILE)) {
      const content = fs.readFileSync(PLANS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load plans from disk:", e);
  }
  return mockPlans;
}

function savePlansToDisk(plans: PlanRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save plans to disk:", e);
  }
}

// --- HELPER FUNCTIONS ---

export async function getAllPlans(): Promise<PlanRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("plans").select("*").order("price", { ascending: true });
      if (!error && data) return data as PlanRecord[];
    } catch (e) {
      console.warn("Supabase fetch plans failed, falling back to local store", e);
    }
  }
  return loadPlansFromDisk();
}

export async function getPlanById(id: string): Promise<PlanRecord | null> {
  const plans = await getAllPlans();
  return plans.find(p => p.id === id) || null;
}

export async function savePlan(plan: Partial<PlanRecord>): Promise<PlanRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (plan.id) {
        const { data, error } = await supabase.from("plans").update({ ...plan, updated_at: now }).eq("id", plan.id).select().single();
        if (!error && data) return data as PlanRecord;
      } else {
        const { data, error } = await supabase.from("plans").insert([{ ...plan, updated_at: now }]).select().single();
        if (!error && data) return data as PlanRecord;
      }
    } catch (e) {
      console.warn("Supabase save plan failed", e);
    }
  }

  const plans = loadPlansFromDisk();
  if (plan.id) {
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = { ...plans[idx], ...plan, updated_at: now } as PlanRecord;
      savePlansToDisk(plans);
      return plans[idx];
    }
  }
  const newPlan: PlanRecord = {
    id: plan.id || `p-${Date.now()}`,
    name: plan.name || "Custom Plan",
    price: plan.price || 0,
    duration_days: plan.duration_days || 30,
    card_limit: plan.card_limit ?? 100,
    status: plan.status || "active",
    created_at: now,
    updated_at: now
  };
  plans.push(newPlan);
  savePlansToDisk(plans);
  return newPlan;
}

export async function deletePlanStore(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {
      console.warn("Supabase delete plan failed", e);
    }
  }
  const plans = loadPlansFromDisk();
  const idx = plans.findIndex(p => p.id === id);
  if (idx !== -1) {
    plans.splice(idx, 1);
    savePlansToDisk(plans);
    return true;
  }
  return false;
}

export async function getAllUsers(): Promise<UserRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("user_profiles").select("*").neq("status", "deleted").order("created_at", { ascending: false });
      if (!error && data) return data as UserRecord[];
    } catch (e) {
      console.warn("Supabase fetch users failed", e);
    }
  }
  return mockUsers.filter(u => u.status !== "deleted");
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const users = await getAllUsers();
  return users.find(u => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const users = await getAllUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function saveUser(user: Partial<UserRecord>): Promise<UserRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (user.id) {
        const { data, error } = await supabase.from("user_profiles").update({ ...user, updated_at: now }).eq("id", user.id).select().single();
        if (!error && data) return data as UserRecord;
      } else {
        const { data, error } = await supabase.from("user_profiles").insert([{ ...user, updated_at: now }]).select().single();
        if (!error && data) return data as UserRecord;
      }
    } catch (e) {
      console.warn("Supabase save user failed", e);
    }
  }

  if (user.id) {
    const idx = mockUsers.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      mockUsers[idx] = { ...mockUsers[idx], ...user, updated_at: now } as UserRecord;
      return mockUsers[idx];
    }
  }

  const newUser: UserRecord = {
    id: user.id || `u-${Date.now()}`,
    email: user.email || "",
    display_name: user.display_name || "New User",
    phone: user.phone || "",
    role: user.role || "user",
    status: user.status || "active",
    plan_id: user.plan_id || "11111111-1111-1111-1111-111111111111",
    last_login_at: user.last_login_at || null,
    created_at: now,
    updated_at: now
  };
  mockUsers.push(newUser);
  return newUser;
}

export async function getAllCards(): Promise<CardRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("id_cards").select("*").order("created_at", { ascending: false });
      if (!error && data) return data as CardRecord[];
    } catch (e) {
      console.warn("Supabase fetch cards failed", e);
    }
  }
  return mockCards;
}

export async function getCardsByUserId(userId: string): Promise<CardRecord[]> {
  const cards = await getAllCards();
  return cards.filter(c => c.user_id === userId);
}

export async function addCard(card: CardRecord): Promise<CardRecord> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("id_cards").insert([card]).select().single();
      if (error) {
        console.error("Supabase add card error:", error.message);
        throw new Error(error.message);
      }
      if (data) return data as CardRecord;
    } catch (e) {
      console.error("Supabase add card failed:", e);
      throw e;
    }
  }
  mockCards.push(card);
  return card;
}

export async function getLogs(): Promise<ActivityLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false });
      if (!error && data) return data as ActivityLog[];
    } catch (e) {
      console.warn("Supabase fetch logs failed", e);
    }
  }
  return [...mockLogs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function logAdminAction(action: string, adminId: string, targetUserId?: string | null, details?: string | null) {
  const log: ActivityLog = {
    id: `l-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    action,
    admin_id: adminId,
    target_user_id: targetUserId || null,
    details: details || null,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from("admin_activity_logs").insert([log]);
    } catch (e) {
      console.warn("Supabase log action failed", e);
    }
  }
  mockLogs.push(log);
}

// --- CARD APPLICATIONS ---
export async function getApplicationsByUserId(userId: string): Promise<CardApplicationRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("card_applications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) return data as CardApplicationRecord[];
    } catch (e) { console.warn("Supabase fetch applications failed", e); }
  }
  return [];
}

export async function getApplicationById(appId: string): Promise<CardApplicationRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("card_applications")
        .select("*")
        .eq("id", appId)
        .maybeSingle();
      if (!error && data) return data as CardApplicationRecord;
    } catch (e) { console.warn("Supabase fetch application failed", e); }
  }
  return null;
}

export async function getAllApplications(): Promise<CardApplicationRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("card_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data as CardApplicationRecord[];
    } catch (e) { console.warn("Supabase fetch all applications failed", e); }
  }
  return [];
}

export async function saveApplication(app: Partial<CardApplicationRecord>): Promise<CardApplicationRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();

      // Ensure user_profiles exists for this user_id
      if (app.user_id) {
        const { data: existingUser } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", app.user_id)
          .maybeSingle();
        if (!existingUser) {
          await supabase.from("user_profiles").insert([{
            id: app.user_id,
            email: app.email || "",
            display_name: app.full_name || "",
            phone: app.phone || "",
            role: "user",
            status: "active",
            created_at: now,
            updated_at: now
          }]);
        }
      }

      if (app.id) {
        const { data, error } = await supabase
          .from("card_applications")
          .update({ ...app, updated_at: now })
          .eq("id", app.id)
          .select()
          .single();
        if (error) {
          console.error("Supabase update application error:", error.message);
          throw new Error(error.message);
        }
        if (data) return data as CardApplicationRecord;
      } else {
        const { id: _unused, ...insertData } = app as any;
        const { data, error } = await supabase
          .from("card_applications")
          .insert([{ ...insertData, created_at: now, updated_at: now }])
          .select()
          .single();
        if (error) {
          console.error("Supabase insert application error:", error.message);
          throw new Error(error.message);
        }
        if (data) return data as CardApplicationRecord;
      }
    } catch (e) {
      console.error("Supabase save application failed:", e);
      throw e;
    }
  }
  return app as CardApplicationRecord;
}

// --- PAYMENTS ---
export async function getPaymentsByUserId(userId: string): Promise<PaymentRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) return data as PaymentRecord[];
    } catch (e) { console.warn("Supabase fetch payments failed", e); }
  }
  return [];
}

export async function getPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (!error && data) return data as PaymentRecord;
    } catch (e) { console.warn("Supabase fetch payment failed", e); }
  }
  return null;
}

export async function getPaymentById(paymentId: string): Promise<PaymentRecord | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle();
      if (!error && data) return data as PaymentRecord;
    } catch (e) { console.warn("Supabase fetch payment by id failed", e); }
  }
  return null;
}

export async function getAllPayments(): Promise<PaymentRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) return data as PaymentRecord[];
    } catch (e) { console.warn("Supabase fetch all payments failed", e); }
  }
  return [];
}

export async function savePayment(payment: Partial<PaymentRecord>): Promise<PaymentRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (payment.id) {
        const { data, error } = await supabase
          .from("payments")
          .update({ ...payment, updated_at: now })
          .eq("id", payment.id)
          .select()
          .single();
        if (error) {
          console.error("Supabase update payment error:", error.message);
          throw new Error(error.message);
        }
        if (data) return data as PaymentRecord;
      } else {
        const { data, error } = await supabase
          .from("payments")
          .insert([{ ...payment, created_at: now, updated_at: now }])
          .select()
          .single();
        if (error) {
          console.error("Supabase insert payment error:", error.message);
          throw new Error(error.message);
        }
        if (data) return data as PaymentRecord;
      }
    } catch (e) { console.error("Supabase save payment failed:", e); throw e; }
  }
  return payment as PaymentRecord;
}

// --- NOTIFICATIONS ---
export async function getNotifications(): Promise<NotificationRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) return data as NotificationRecord[];
    } catch (e) { console.warn("Supabase fetch notifications failed", e); }
  }
  return [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
      if (!error && count !== null) return count;
    } catch (e) { console.warn("Supabase count notifications failed", e); }
  }
  return 0;
}

export async function saveNotification(notification: Partial<NotificationRecord>): Promise<NotificationRecord> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("notifications")
        .insert([{ ...notification, created_at: now }])
        .select()
        .single();
      if (!error && data) return data as NotificationRecord;
    } catch (e) { console.warn("Supabase save notification failed", e); }
  }
  return notification as NotificationRecord;
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      if (ids && ids.length > 0) {
        await supabase.from("notifications").update({ read: true }).in("id", ids);
      } else {
        await supabase.from("notifications").update({ read: true }).eq("read", false);
      }
    } catch (e) { console.warn("Supabase mark notifications read failed", e); }
  }
}
