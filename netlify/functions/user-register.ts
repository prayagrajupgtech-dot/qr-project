import { jsonResponse, readJsonBody, sha256 } from "./_shared/http.js";
import { getUserByEmail, saveUser, saveNotification } from "./_shared/store.js";
import { isSupabaseConfigured, getSupabaseAdmin } from "./_shared/supabase.js";

export default async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const body = await readJsonBody(request);

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "";
    const country_code = typeof body.country_code === "string" ? body.country_code.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    // Validation
    if (!email) {
      return jsonResponse({ error: "Email is required." }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Please enter a valid email address." }, 400);
    }

    if (!password || password.length < 8) {
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

    if (!display_name) {
      return jsonResponse({ error: "Display name is required." }, 400);
    }

    // Check for duplicate email
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return jsonResponse({ error: "An account with this email already exists." }, 409);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();

      // Check for duplicate email in Supabase user_profiles
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        return jsonResponse({ error: "An account with this email already exists." }, 409);
      }

      // Create Supabase auth user — or link password to an auth user that
      // already exists (e.g. created moments ago via "Sign up with Google",
      // which only pre-fills email and leaves profile creation to this form).
      let authUserId: string;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: display_name }
      });

      if (authError) {
        const msg = (authError.message || "").toLowerCase();
        const alreadyExists = msg.includes("already") || msg.includes("exists") || msg.includes("taken") || msg.includes("duplicate");
        if (!alreadyExists) {
          console.error("user-register createUser error", authError);
          return jsonResponse({ error: authError.message || "Failed to create account." }, 500);
        }

        // Find the existing auth user by email and set the password on it
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (listError) {
          console.error("user-register listUsers error", listError);
          return jsonResponse({ error: "Failed to create account." }, 500);
        }
        const existingAuth = (listData?.users || []).find((u: any) => (u.email || "").toLowerCase() === email);
        if (!existingAuth) {
          return jsonResponse({ error: "Failed to create account." }, 500);
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuth.id, {
          password,
          email_confirm: true,
          user_metadata: { name: display_name }
        });
        if (updateError) {
          console.error("user-register updateUser error", updateError);
          return jsonResponse({ error: "Failed to create account." }, 500);
        }
        authUserId = existingAuth.id;
      } else {
        authUserId = authData.user.id;
      }

      // Create user_profiles record
      await supabase.from("user_profiles").insert({
        id: authUserId,
        email,
        display_name,
        phone,
        country,
        country_code,
        role: "user",
        status: "active",
        password_configured: true,
        password_hash: await sha256(password),
        last_login_at: new Date().toISOString()
      });

      // Create notification
      await saveNotification({
        type: "new_user",
        title: "New User Registered",
        message: `${display_name} (${email}) has registered a new account.`,
        related_user_id: authUserId,
        read: false
      });

      return jsonResponse({
        success: true,
        user: {
          id: authUserId,
          email,
          display_name
        }
      }, 201);
    }

    // Local store fallback
    const newUser = await saveUser({
      email,
      display_name,
      phone,
      country,
      country_code,
      role: "user",
      status: "active",
      password_hash: await sha256(password)
    });

    // Create notification
    await saveNotification({
      type: "new_user",
      title: "New User Registered",
      message: `${display_name} (${email}) has registered a new account.`,
      related_user_id: newUser.id,
      read: false
    });

    return jsonResponse({
      success: true,
      user: {
        id: newUser.id,
        email,
        display_name
      }
    }, 201);
  } catch (error: any) {
    console.error("user-register error", error);
    return jsonResponse({ error: error?.message || "Registration failed." }, 500);
  }
};
