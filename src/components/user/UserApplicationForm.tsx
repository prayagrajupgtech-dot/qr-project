import { useState, useEffect } from "react";
import { countries } from "../../utils/countries";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  card_limit: number;
  features?: string[];
  status: string;
}

interface Application {
  id: string;
  plan_id: string;
  full_name: string;
  phone: string;
  parent_phone: string | null;
  country: string;
  country_code: string;
  date_of_birth: string;
  address: string;
  email: string;
  photo_url: string;
  status: string;
  completion_percentage: number;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, handler: () => void) => void;
};

function loadRazorpayCheckout(): Promise<boolean> {
  if ((window as typeof window & { Razorpay?: RazorpayConstructor }).Razorpay) return Promise.resolve(true);

  return new Promise(resolve => {
    const selector = 'script[src="https://checkout.razorpay.com/v1/checkout.js"]';
    const existingScript = document.querySelector<HTMLScriptElement>(selector);
    if (existingScript?.dataset.loadFailed === "true") existingScript.remove();
    const script = document.querySelector<HTMLScriptElement>(selector) || document.createElement("script");
    const finish = () => resolve(Boolean((window as typeof window & { Razorpay?: RazorpayConstructor }).Razorpay));

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => {
      script.dataset.loadFailed = "true";
      resolve(false);
    }, { once: true });
    if (!script.isConnected) {
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export default function UserApplicationForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [application, setApplication] = useState<Application | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [country, setCountry] = useState("IN");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("maurya_user_token") || "";
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const selectedCountryData = countries.find(c => c.code === country);
  const callingCode = selectedCountryData?.callingCode || "+91";

  // Start loading checkout early, but wait for it before creating a payment order.
  useEffect(() => {
    void loadRazorpayCheckout();
  }, []);

  // Fetch plans and existing application on mount
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [plansRes, appsRes] = await Promise.all([
          fetch("/api/plans"),
          fetch("/api/user-applications", { headers: getAuthHeaders() })
        ]);

        let fetchedPlans: Plan[] = [];
        if (plansRes.ok) {
          const plansData = await plansRes.json();
          fetchedPlans = plansData.plans || (Array.isArray(plansData) ? plansData : []);
          setPlans(fetchedPlans);
        }

        let selectedId = "";
        if (appsRes.ok) {
          const appsData = await appsRes.json();
          const apps = appsData.applications || (Array.isArray(appsData) ? appsData : []);
          if (apps.length > 0) {
            const app = apps[0];
            setApplication(app);
            setFullName(app.full_name || "");
            setEmail(app.email || "");
            setPhone(app.phone || "");
            setParentPhone(app.parent_phone || "");
            if (app.country) {
              const found = countries.find(c => c.name === app.country || c.code === app.country_code);
              if (found) setCountry(found.code);
            }
            setDateOfBirth(app.date_of_birth ? String(app.date_of_birth).slice(0, 10) : "");
            setAddress(app.address || "");
            setPhoto(app.photo_url || "");
            if (app.plan_id) selectedId = app.plan_id;
          }
        }
        if (!selectedId && fetchedPlans.length > 0) {
          selectedId = fetchedPlans[0].id;
        }
        if (selectedId) setSelectedPlanId(selectedId);
      } catch {
        setError("Failed to load initial data.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Progress calculation - MUST match backend weights.
  const calculateProgress = (): number => {
    let total = 0;
    if (fullName.trim()) total += 15;
    if (phone.trim()) total += 15;
    if (country.trim()) total += 10;
    if (dateOfBirth.trim()) total += 15;
    if (address.trim()) total += 15;
    if (email.trim()) total += 10;
    if (selectedPlanId) total += 10;
    if (photo) total += 10;
    return Math.min(total, 100);
  };

  const progress = calculateProgress();

  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    if (!fullName.trim()) missing.push("Full Name");
    if (!phone.trim()) missing.push("Phone Number");
    if (!country.trim()) missing.push("Country");
    if (!dateOfBirth.trim()) missing.push("Date of Birth");
    if (!address.trim()) missing.push("Address");
    if (!email.trim()) missing.push("Email");
    if (!selectedPlanId) missing.push("Plan Selection");
    if (!photo) missing.push("Photo");
    return missing;
  };

  const isComplete = progress === 100;

  const getStatusLabel = (): string => {
    if (application?.status === "card_issued") return "Card Issued";
    if (application?.status === "payment_success") return "Payment Success";
    if (application?.status === "payment_pending") return "Payment Pending";
    if (application?.status === "submitted") return "Submitted";
    if (isComplete) return "Completed";
    if (progress >= 50) return "Incomplete";
    return "Draft";
  };

  const getStatusColor = (): string => {
    if (application?.status === "card_issued") return "bg-emerald-500/10 text-emerald-400";
    if (application?.status === "payment_success") return "bg-emerald-500/10 text-emerald-400";
    if (application?.status === "payment_pending") return "bg-amber-500/10 text-amber-400";
    if (application?.status === "submitted") return "bg-blue-500/10 text-blue-400";
    if (isComplete) return "bg-emerald-500/10 text-emerald-400";
    if (progress >= 50) return "bg-amber-500/10 text-amber-400";
    return "bg-white/5 text-white/50";
  };

  const handlePhotoUpload = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB.");
      return;
    }
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      setError("Photo must be PNG, JPG, or WebP.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openRazorpay = (orderId: string, amount: number, key: string) => {
    const Razorpay = (window as typeof window & { Razorpay?: RazorpayConstructor }).Razorpay;
    if (!Razorpay) {
      setError("Secure payment checkout could not be loaded. Please check your internet connection and try again.");
      return;
    }

    const options = {
      key,
      // The server already returns Razorpay's smallest currency unit (paise).
      amount,
      currency: "INR",
      name: "Maurya Generator",
      description: "Card Issuance Payment",
      order_id: orderId,
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch("/api/user-payment?action=verify", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            setSuccess("Payment successful! Your card has been issued.");
            const appsRes = await fetch("/api/user-applications", { headers: getAuthHeaders() });
            if (appsRes.ok) {
              const appsData = await appsRes.json();
              const apps = appsData.applications || appsData || [];
              if (apps.length > 0) setApplication(apps[0]);
            }
          } else {
            setError(verifyData.error || "Payment verification failed.");
          }
        } catch {
          setError("Payment verification network error.");
        }
      },
      prefill: { contact: phone, email },
      theme: { color: "#f59e0b" },
      modal: {
        ondismiss: () => {
          setError("Payment was cancelled. You can try again when ready.");
        }
      }
    };
    const rzp = new Razorpay(options);
    rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
    rzp.open();
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body: any = {
        plan_id: selectedPlanId || null,
        full_name: fullName,
        phone,
        parent_phone: parentPhone || null,
        country: selectedCountryData?.name || "India",
        country_code: callingCode,
        date_of_birth: dateOfBirth,
        address,
        email,
        photo_url: photo || null,
      };
      if (application?.id) body.id = application.id;

      const res = await fetch("/api/user-applications", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setApplication(data.application);
        setSuccess("Draft saved successfully.");
      } else {
        setError(data.error || "Failed to save.");
      }
    } catch {
      setError("Network error saving draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitApplication = async () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      setError(`Please complete all required fields: ${missing.join(", ")}`);
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const body: any = {
        plan_id: selectedPlanId,
        full_name: fullName,
        phone,
        parent_phone: parentPhone || null,
        country: selectedCountryData?.name || "India",
        country_code: callingCode,
        date_of_birth: dateOfBirth,
        address,
        email,
        photo_url: photo,
        status: "submitted",
      };
      if (application?.id) body.id = application.id;

      const res = await fetch("/api/user-applications", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setApplication(data.application);
        setSuccess("Application submitted successfully!");
      } else {
        setError(data.error || "Failed to submit.");
      }
    } catch {
      setError("Network error submitting application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueCard = async () => {
    if (!application?.id && !isComplete) {
      setError("Please complete all required fields before issuing a card.");
      return;
    }
    setIssuing(true);
    setError("");
    setSuccess("");
    try {
      // Auto-save the draft first to make sure application exists and is up-to-date
      let appId = application?.id;
      if (!appId || (application?.status !== "submitted" && application?.status !== "completed")) {
        const body: any = {
          plan_id: selectedPlanId || null,
          full_name: fullName,
          phone,
          parent_phone: parentPhone || null,
          country: selectedCountryData?.name || "India",
          country_code: callingCode,
          date_of_birth: dateOfBirth,
          address,
          email,
          photo_url: photo || null,
          status: "submitted",
        };
        if (appId) body.id = appId;

        const saveRes = await fetch("/api/user-applications", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok) {
          setError(saveData.error || "Failed to save application before payment.");
          setIssuing(false);
          return;
        }
        appId = saveData.application?.id;
        if (saveData.application) setApplication(saveData.application);
      }

      if (!appId) {
        setError(saveData?.error || "Could not create application. Please try again.");
        setIssuing(false);
        return;
      }

      const checkoutLoaded = await loadRazorpayCheckout();
      if (!checkoutLoaded) {
        setError("Secure payment checkout could not be loaded. Please check your internet connection and try again.");
        return;
      }

      const res = await fetch("/api/user-payment", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "create", applicationId: appId }),
      });
      const data = await res.json();
      if (res.ok) {
        openRazorpay(data.orderId, data.amount, data.key);
      } else {
        setError(data.error || "Could not create payment order.");
      }
    } catch {
      setError("Network error creating payment.");
    } finally {
      setIssuing(false);
    }
  };

  // Issue card is enabled when form is 100% complete or already submitted/completed, and not already issued/pending
  const canIssueCard =
    isComplete &&
    application?.status !== "card_issued" &&
    application?.status !== "payment_pending";

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-xl w-1/3" />
          <div className="h-64 bg-white/5 rounded-[2.5rem]" />
          <div className="h-48 bg-white/5 rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 px-5 py-3 rounded-xl">
          <p className="text-xs font-bold text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 rounded-xl">
          <p className="text-xs font-bold text-emerald-400">{success}</p>
        </div>
      )}

      {/* Step 1: Plan Selection */}
      <div className="border border-white/10 bg-white/5 rounded-[2.5rem] p-8">
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[5px]">Step 1</span>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">Select Your Plan</h2>

        {selectedPlan && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Selected Plan</p>
              <p className="font-black text-white text-lg mt-1">{selectedPlan.name}</p>
              <p className="text-xs text-white/40">₹{selectedPlan.price} / {selectedPlan.duration_days} days</p>
            </div>
            <span className="text-2xl">💎</span>
          </div>
        )}

        {plans.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans
              .filter(p => !p.status || p.status.toLowerCase() === "active")
              .map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all ${
                    selectedPlanId === plan.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-sm uppercase">{plan.name}</span>
                    {selectedPlanId === plan.id && (
                      <span className="text-[10px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-md uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-black text-amber-500">
                    ₹{plan.price}
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-white/50 font-bold">
                      {plan.duration_days} days validity
                    </p>
                    <p className="text-xs text-white/50 font-bold">
                      {plan.card_limit === -1 ? "Unlimited" : plan.card_limit} cards
                    </p>
                  </div>
                </button>
              ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-white/40">No plans available. Please contact administrator.</p>
        )}
      </div>

      {/* Step 2: Personal Information */}
      <div className="border border-white/10 bg-white/5 rounded-[2.5rem] p-8">
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[5px]">Step 2</span>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">Personal Information</h2>

        <div className="mt-6 space-y-5">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Full Name *</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60"
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60"
              placeholder="your@email.com"
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Country *</label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60 appearance-none"
            >
              {countries.map(c => (
                <option key={c.code} value={c.code} className="bg-[#020617] text-white">
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Mobile Number *</label>
            <div className="flex gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white/50 flex items-center min-w-[80px]">
                {callingCode}
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60"
                placeholder="Enter phone number"
                maxLength={15}
              />
            </div>
          </div>

          {/* Parent / Guardian Phone Number */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Parent / Guardian Mobile Number</label>
            <div className="flex gap-2">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white/50 flex items-center min-w-[80px]">
                {callingCode}
              </div>
              <input
                type="tel"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value.replace(/\D/g, ""))}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60"
                placeholder="Enter parent or guardian number"
                maxLength={15}
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Date of Birth *</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60 [color-scheme:dark]"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Address *</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/60 min-h-[80px] resize-none"
              placeholder="House no, street, city, state"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Photo *</label>
            <div className="p-6 border-2 border-dashed border-white/10 rounded-2xl flex flex-col sm:flex-row items-center text-center sm:text-left gap-5 hover:bg-white/5 transition-all">
              <div className="w-24 h-32 bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {photo ? (
                  <img src={photo} alt="Photo preview" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/10" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-black text-sm">Upload Photo</p>
                <p className="text-xs text-white/30 font-bold mt-1">JPG, PNG, or WebP. Max 5MB.</p>
                <div className="flex gap-2 mt-3">
                  <label className="cursor-pointer inline-block bg-white text-black text-[10px] font-black uppercase tracking-[3px] px-5 py-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all">
                    Select Photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={e => handlePhotoUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto("")}
                      className="bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-[3px] px-4 py-2.5 rounded-xl hover:bg-red-500/20 transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Progress & Actions */}
      <div className="border border-white/10 bg-white/5 rounded-[2.5rem] p-8">
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[5px]">Step 3</span>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">Progress</h2>

        <div className="mt-6 space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-white/50 uppercase tracking-widest">Completion</span>
              <span className="text-xs font-black text-amber-500">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Status:</span>
            <span className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${getStatusColor()}`}>
              {getStatusLabel()}
            </span>
          </div>

          {/* Missing fields */}
          {!isComplete && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[3px] mb-2">Missing Fields</p>
              <div className="flex flex-wrap gap-2">
                {getMissingFields().map(field => (
                  <span
                    key={field}
                    className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-lg"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Selected Plan Summary */}
          {selectedPlan && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-[3px] mb-1">Selected Plan</p>
              <p className="font-black text-white">{selectedPlan.name} — ₹{selectedPlan.price}</p>
              <p className="text-xs text-white/40">{selectedPlan.duration_days} days validity</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="flex-1 bg-white/10 text-white border border-white/10 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "SAVING..." : "SAVE DRAFT"}
        </button>

        <button
          onClick={handleSubmitApplication}
          disabled={submitting || !isComplete || application?.status === "submitted" || application?.status === "card_issued"}
          className="flex-1 bg-white/10 text-white border border-white/10 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "SUBMITTING..." : application?.status === "submitted" ? "ALREADY SUBMITTED" : "SUBMIT APPLICATION"}
        </button>

        <button
          onClick={handleIssueCard}
          disabled={issuing || !canIssueCard}
          className="flex-1 bg-amber-500 text-black py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
        >
          {issuing ? "PROCESSING..." : application?.status === "card_issued" ? "CARD ISSUED" : "ISSUE CARD"}
        </button>
      </div>
    </div>
  );
}
