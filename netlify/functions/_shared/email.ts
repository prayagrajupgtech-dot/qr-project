const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendOtpEmail(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "noreply@mauryaandco.com";

  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured.");
    return { success: false, error: "Email service not configured." };
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#111827;padding:24px;text-align:center;">
      <p style="color:#ffffff;font-size:16px;font-weight:900;text-transform:uppercase;margin:0;">ResQRide</p>
      <p style="color:#facc15;font-size:12px;font-weight:bold;margin:4px 0 0 0;">Scan. Connect. Protect.</p>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <h1 style="font-size:20px;font-weight:900;color:#0f172a;margin:0 0 16px 0;">Verify your email</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 24px 0;line-height:1.6;">
        We've sent a 6-digit verification code to<br>
        <strong style="color:#0f172a;">${email}</strong>
      </p>
      <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin:0 0 24px 0;">
        <p style="font-size:32px;font-weight:900;color:#0f172a;letter-spacing:8px;margin:0;font-family:monospace;">${otp}</p>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:0;">
        This code expires in 5 minutes. If you didn't request this, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `ResQRide <${fromEmail}>`,
        to: [email],
        subject: "Your verification code",
        html: htmlContent
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Resend API error:", response.status, errorBody);
      return { success: false, error: "Failed to send verification email." };
    }

    return { success: true };
  } catch (error) {
    console.error("sendOtpEmail error:", error);
    return { success: false, error: "Failed to send verification email." };
  }
}
