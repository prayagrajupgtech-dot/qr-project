import { jsonResponse, readJsonBody, sha256 } from "./_shared/http.js";
import { getUserByEmail, saveUser, getAllUsers } from "./_shared/store.js";
import { isSupabaseConfigured, getSupabaseAdmin } from "./_shared/supabase.js";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export default async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const body = await readJsonBody(request);
    const action = typeof body.action === "string" ? body.action : "login-email";

    // 1. EMAIL + PASSWORD LOGIN
    if (action === "login-email") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!email || !password) {
        return jsonResponse({ error: "Email and password are required." }, 400);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        // Check if user exists in user_profiles
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, email, status, role, password_configured")
          .eq("email", email)
          .maybeSingle();

        // If user exists with status "pending" and no password configured, tell frontend to redirect
        if (profile && profile.status === "pending" && !profile.password_configured) {
          return jsonResponse({
            requiresPasswordSetup: true,
            userId: profile.id,
            email: profile.email,
            message: "Please set up your password to activate your account."
          }, 200);
        }

        // If profile exists but password_configured is false and status is not pending,
        // treat as needing setup (edge case)
        if (profile && !profile.password_configured && profile.status === "active") {
          // Fall through to normal auth - if no password_hash set, signInWithPassword will fail
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          return jsonResponse({ error: error?.message || "Invalid email or password." }, 401);
        }

        // Check if user is blocked in user_profiles
        if (profile?.status === "blocked") {
          return jsonResponse({ error: "Your account has been blocked by the administrator." }, 403);
        }

        // Update last_login_at
        if (profile) {
          await supabase
            .from("user_profiles")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", data.user.id);
        }

        return jsonResponse({
          token: data.session?.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: profile?.role || "user",
            status: profile?.status || "active"
          }
        }, 200);
      }

      // Local store authentication
      let user = await getUserByEmail(email);

      // Check pending status in local store
      if (user && user.status === "pending" && !user.password_hash) {
        return jsonResponse({
          requiresPasswordSetup: true,
          userId: user.id,
          email: user.email,
          message: "Please set up your password to activate your account."
        }, 200);
      }

      if (!user) {
        user = await saveUser({
          email,
          display_name: email.split("@")[0],
          role: "user",
          status: "active",
          password_hash: await sha256(password)
        });
      }

      if (user.status === "blocked") {
        return jsonResponse({ error: "Your account has been blocked by the administrator." }, 403);
      }

      return jsonResponse({
        token: `mock-user-token-${user.id}`,
        user: {
          id: user.id,
          email: user.email,
          name: user.display_name,
          role: user.role,
          status: user.status
        }
      }, 200);
    }

    // 2. MOBILE + PASSWORD LOGIN
    if (action === "login-mobile") {
      const rawPhone = typeof body.phone === "string" ? body.phone : "";
      const password = typeof body.password === "string" ? body.password : "";

      const normalizedPhone = normalizePhone(rawPhone);
      if (!/^[6-9]\d{9}$/.test(normalizedPhone) || !password) {
        return jsonResponse({ error: "Enter a valid 10-digit Indian mobile number and password." }, 400);
      }

      const users = await getAllUsers();
      let user = users.find(u => normalizePhone(u.phone) === normalizedPhone);

      if (!user) {
        user = await saveUser({
          email: `mobile_${normalizedPhone}@example.com`,
          display_name: `User ${normalizedPhone}`,
          phone: normalizedPhone,
          role: "user",
          status: "active",
          password_hash: await sha256(password)
        });
      }

      if (user.status === "blocked") {
        return jsonResponse({ error: "Your account has been blocked by the administrator." }, 403);
      }

      return jsonResponse({
        token: `mock-user-token-${user.id}`,
        user: {
          id: user.id,
          phone: normalizedPhone,
          name: user.display_name,
          role: user.role,
          status: user.status
        }
      }, 200);
    }

    // 3. GOOGLE SIGN-IN (verifies Google ID token)
    if (action === "login-google") {
      const credential = typeof body.credential === "string" ? body.credential : "";
      if (!credential) {
        return jsonResponse({ error: "Google credential is required." }, 400);
      }

      // Verify the Google ID token using Google's tokeninfo endpoint
      let googleUser: { email: string; name: string; picture?: string; sub: string };
      try {
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (!tokenRes.ok) {
          return jsonResponse({ error: "Invalid Google token. Please try again." }, 401);
        }
        googleUser = await tokenRes.json();
      } catch {
        return jsonResponse({ error: "Failed to verify Google token." }, 500);
      }

      const email = googleUser.email?.toLowerCase();
      const name = googleUser.name || email?.split("@")[0] || "Google User";
      const picture = googleUser.picture || "";

      if (!email) {
        return jsonResponse({ error: "Google account has no email." }, 400);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        // Find or create user profile
        let { data: profile } = await supabase
          .from("user_profiles")
          .select("id, email, display_name, status, role, plan_id")
          .eq("email", email)
          .maybeSingle();

        if (!profile) {
          // Create new user profile for Google sign-in
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { name, avatar_url: picture }
          });

          if (authError) {
            // If user already exists in auth, just find them
            const { data: existingAuth } = await supabase.auth.admin.listUsers();
            const existingUser = existingAuth?.users?.find(u => u.email === email);
            if (existingUser) {
              profile = {
                id: existingUser.id,
                email,
                display_name: name,
                status: "active",
                role: "user",
                plan_id: null
              };
            } else {
              console.error("Google login createUser error", authError);
              return jsonResponse({ error: "Could not create Google account." }, 500);
            }
          } else {
            // Create profile for the new auth user
            await supabase.from("user_profiles").insert({
              id: authData.user.id,
              email,
              display_name: name,
              role: "user",
              status: "active",
              password_configured: true,
              last_login_at: new Date().toISOString()
            });

            profile = {
              id: authData.user.id,
              email,
              display_name: name,
              status: "active",
              role: "user",
              plan_id: null
            };
          }
        }

        if (profile.status === "blocked") {
          return jsonResponse({ error: "Your account has been blocked by the administrator." }, 403);
        }

        // Update last login
        await supabase
          .from("user_profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", profile.id);

        // If user has pending status (admin created card for them), activate on Google login
        if (profile.status === "pending") {
          await supabase
            .from("user_profiles")
            .update({ status: "active", password_configured: true })
            .eq("id", profile.id);
        }

        // Generate a login link to get a session token for the Google user
        let token = "";
        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: email
          });
          if (linkData?.properties?.hashed_token) {
            // Use the hashed token to sign in
            const { data: verifyData } = await supabase.auth.verifyOtp({
              email,
              token: linkData.properties.hashed_token,
              type: "magiclink"
            });
            token = verifyData?.session?.access_token || "";
          }
        } catch {
          // Fallback: try creating a temporary password and signing in
          try {
            const tempPass = `goog_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            await supabase.auth.admin.updateUserById(profile.id, { password: tempPass });
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email,
              password: tempPass
            });
            token = signInData?.session?.access_token || "";
          } catch {
            // Token generation failed — user data still returned
          }
        }

        return jsonResponse({
          token,
          user: {
            id: profile.id,
            email,
            name: profile.display_name || name,
            role: profile.role || "user",
            status: "active"
          }
        }, 200);
      }

      // Local store fallback
      let user = await getUserByEmail(email);
      if (!user) {
        user = await saveUser({
          email,
          display_name: name,
          role: "user",
          status: "active"
        });
      }

      if (user.status === "blocked") {
        return jsonResponse({ error: "Your account has been blocked by the administrator." }, 403);
      }

      return jsonResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.display_name,
          role: user.role,
          status: user.status
        }
      }, 200);
    }

    // 4. SETUP PASSWORD (first-time user created by admin)
    if (action === "setup-password") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const userId = typeof body.userId === "string" ? body.userId : "";

      if (!email || !password || !userId) {
        return jsonResponse({ error: "Email, user ID, and password are required." }, 400);
      }

      if (password.length < 8) {
        return jsonResponse({ error: "Password must be at least 8 characters." }, 400);
      }

      // Strong password validation
      const passwordErrors: string[] = [];
      if (!/[A-Z]/.test(password)) passwordErrors.push("uppercase letter");
      if (!/[a-z]/.test(password)) passwordErrors.push("lowercase letter");
      if (!/[0-9]/.test(password)) passwordErrors.push("number");
      if (!/[!@#$%^&*()_+\-=\[\]{}|;':",./<>?]/.test(password)) passwordErrors.push("special character");
      if (passwordErrors.length > 0) {
        return jsonResponse({ error: `Password must contain at least 1 ${passwordErrors.join(", ")}.` }, 400);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, email, status, password_configured, plan_id")
          .eq("id", userId)
          .eq("email", email)
          .maybeSingle();

        if (!profile) {
          return jsonResponse({ error: "User not found." }, 404);
        }

        if (profile.status !== "pending") {
          return jsonResponse({ error: "This account has already been set up." }, 400);
        }

        // Create Supabase auth user (gets a new UUID)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });

        if (authError) {
          console.error("setup-password createUser error", authError);
          return jsonResponse({ error: authError.message || "Failed to create account." }, 500);
        }

        const newAuthUserId = authData.user.id;

        // Step 1: Create new profile with auth user's UUID (must exist before updating card references)
        await supabase.from("user_profiles").insert({
          id: newAuthUserId,
          email,
          display_name: email.split("@")[0],
          role: "user",
          status: "active",
          plan_id: profile.plan_id || null,
          password_configured: true,
          last_login_at: new Date().toISOString()
        });

        // Step 2: Move card references from old user_id to new auth user id
        await supabase
          .from("id_cards")
          .update({ user_id: newAuthUserId })
          .eq("user_id", userId);

        // Step 3: Delete old pending profile (safe now — cards already moved)
        await supabase
          .from("user_profiles")
          .delete()
          .eq("id", userId);

        return jsonResponse({
          success: true,
          message: "Password set successfully. You can now log in.",
          userId: newAuthUserId
        }, 200);
      }

      // Local store fallback
      const user = await getUserByEmail(email);
      if (!user || user.id !== userId) {
        return jsonResponse({ error: "User not found." }, 404);
      }

      if (user.status !== "pending") {
        return jsonResponse({ error: "This account has already been set up." }, 400);
      }

      const updatedUser = await saveUser({
        ...user,
        status: "active",
        password_hash: await sha256(password)
      });

      return jsonResponse({
        success: true,
        message: "Password set successfully. You can now log in.",
        userId: updatedUser.id
      }, 200);
    }

    // 5. FORGOT PASSWORD REQUEST
    if (action === "forgot-password") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email) return jsonResponse({ error: "Please enter your registered email address." }, 400);

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        await supabase.auth.resetPasswordForEmail(email);
      }

      return jsonResponse({
        message: "Password reset instructions have been sent to your email address."
      }, 200);
    }

    return jsonResponse({ error: "Invalid action." }, 400);
  } catch (error) {
    console.error("user-auth error", error);
    return jsonResponse({ error: "Authentication failed." }, 500);
  }
};
