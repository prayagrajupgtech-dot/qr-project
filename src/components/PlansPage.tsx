import { useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>(resolve => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PlansPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const startSubscription = async () => {
    setMessage("");

    if (!name.trim() || name.trim().length < 3) {
      setMessage("Please enter your full name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""))) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!accepted) {
      setMessage("Please accept the recurring payment terms.");
      return;
    }

    setIsStarting(true);

    try {
      const checkoutLoaded = await loadRazorpayCheckout();
      if (!checkoutLoaded || !window.Razorpay) throw new Error("Razorpay Checkout could not be loaded.");

      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.replace(/\D/g, ""), password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start checkout.");

      const checkout = new window.Razorpay({
        description: "First 30 days free, then INR 99 per month",
        handler: async (payment: Record<string, string>) => {
          const verifyResponse = await fetch("/api/verify-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment)
          });
          const verification = await verifyResponse.json();
          if (!verifyResponse.ok) {
            setMessage(verification.error || "Payment verification failed.");
            return;
          }
          setSuccess(true);
          setMessage("Subscription active. Your account has been created. You can now sign in.");
        },
        key: result.keyId,
        modal: {
          ondismiss: () => {
            setMessage("Checkout was closed before completion.");
          }
        },
        name: "ResQRide",
        prefill: {
          contact: phone,
          name: name.trim()
        },
        subscription_id: result.subscriptionId,
        theme: { color: "#dc2626" }
      });
      checkout.on("payment.failed", response => {
        setMessage(response.error?.description || "Payment authorization failed.");
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start checkout.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="bg-[#111827] text-white border-b-4 border-red-600">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div>
            <p className="text-lg font-black uppercase">ResQRide</p>
            <p className="text-sm font-bold text-amber-400">Scan. Connect. Protect.</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs font-black uppercase tracking-[3px] text-red-600">Membership</p>
            <h1 className="text-3xl sm:text-4xl font-black mt-3">One simple monthly plan</h1>
            <p className="text-sm text-slate-500 mt-3">Authorize once and start with a 30-day free period.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-[0_20px_60px_rgba(15,23,42,0.1)] overflow-hidden">
            <div className="bg-red-600 text-white px-6 py-3 text-center text-xs font-black uppercase tracking-widest">
              First 30 days free
            </div>
            <div className="p-7 sm:p-9">
              <div className="flex items-end justify-center gap-2 mb-8">
                <span className="text-5xl font-black">₹99</span>
                <span className="text-sm font-bold text-slate-400 mb-2">/ month after trial</span>
              </div>

              {success ? (
                <div className="border border-emerald-200 bg-emerald-50 p-6 text-center rounded-lg">
                  <p className="font-black text-emerald-800">Account created</p>
                  <p className="text-sm text-emerald-700 mt-2">{message}</p>
                  <button
                    onClick={() => { window.location.hash = "#/user/login"; }}
                    className="mt-4 bg-[#111827] text-white px-6 py-3 rounded-md font-black uppercase tracking-widest text-xs"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Full name"
                    disabled={isStarting}
                    className="w-full border border-slate-300 px-4 py-3 rounded-md outline-none focus:border-red-500"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    placeholder="10-digit mobile number"
                    disabled={isStarting}
                    className="w-full border border-slate-300 px-4 py-3 rounded-md outline-none focus:border-red-500"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="Create password (min 6 characters)"
                      disabled={isStarting}
                      className="w-full border border-slate-300 px-4 py-3 pr-12 rounded-md outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    disabled={isStarting}
                    className="w-full border border-slate-300 px-4 py-3 rounded-md outline-none focus:border-red-500"
                  />

                  <label className="flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={event => setAccepted(event.target.checked)}
                      disabled={isStarting}
                      className="mt-0.5 w-4 h-4 accent-red-600"
                    />
                    <span>
                      I authorize recurring billing. The first 30 days are free; after that, ₹99 is charged monthly
                      for up to 60 billing cycles unless cancelled. Razorpay or the bank may perform a mandate
                      authorization transaction.
                    </span>
                  </label>

                  <button
                    onClick={startSubscription}
                    disabled={isStarting}
                    className="w-full bg-[#111827] text-white py-4 rounded-md font-black uppercase tracking-widest disabled:cursor-wait disabled:opacity-60"
                  >
                    {isStarting ? "Opening secure checkout..." : "Start free month"}
                  </button>
                  {message && <p className="text-sm text-center font-bold text-red-600">{message}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
            Payments and recurring mandate authorization are processed by Razorpay. Test the complete cancellation,
            webhook, refund, privacy, and customer-support workflow before enabling live credentials.
          </div>
        </div>
      </main>
    </div>
  );
}
