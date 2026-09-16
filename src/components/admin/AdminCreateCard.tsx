import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  planId: string | null;
  planName: string;
}

interface PlanItem {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  card_limit: number;
  status?: string;
}

export default function AdminCreateCard() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState("");
  const [signature, setSignature] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const qrSectionRef = useRef<HTMLDivElement>(null);

  // Generated Card State
  const [generatedCard, setGeneratedCard] = useState<{
    id: string;
    cardNumber: string;
    name: string;
    phone: string;
    dob: string;
    address: string;
    photo: string;
    signature: string;
    planName: string;
  } | null>(null);

  // QR State
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [usersRes, plansRes] = await Promise.all([
          fetch("/api/admin-users"),
          fetch("/api/admin-plans")
        ]);
        const usersData = await usersRes.json();
        const plansData = await plansRes.json();

        if (usersRes.ok) setUsers(usersData.users || []);
        if (plansRes.ok) {
          const availablePlans = (plansData.plans || []) as PlanItem[];
          setPlans(availablePlans);
          const firstActivePlan = availablePlans.find(plan => !plan.status || plan.status === "active");
          if (firstActivePlan) setSelectedPlanId(firstActivePlan.id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleSelectUserChange = (userId: string) => {
    setSelectedUserId(userId);
    const u = users.find(x => x.id === userId);
    if (u) {
      setEmail(u.email);
      setName(u.name);
      setPhone(u.phone || "");
      if (u.planId) setSelectedPlanId(u.planId);
    }
  };

  const handleImageFile = (field: "photo" | "signature", file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (field === "photo") setPhoto(reader.result as string);
      else setSignature(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !name || !dob || !address || !selectedPlanId) {
      setError("Please select a plan and complete email, name, date of birth, and address.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/admin-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          planId: selectedPlanId || null,
          name,
          phone,
          dateOfBirth: dob,
          address,
          photo_url: photo || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        const planName = plans.find(p => p.id === selectedPlanId)?.name || "Basic";
        setGeneratedCard({
          id: data.id,
          cardNumber: data.cardNumber,
          name,
          phone,
          dob,
          address,
          photo,
          signature,
          planName
        });
        setSuccessMessage(`Card ${data.cardNumber} created successfully. ${data.isNewAccount ? "New user account created." : "Card linked to existing account."}`);
        setQrGenerated(false);
        setQrCopied(false);
      } else {
        setError(data.error || "Could not generate card.");
      }
    } catch {
      setError("Network error generating card.");
    } finally {
      setGenerating(false);
    }
  };

  const getVerificationUrl = () => {
    if (!generatedCard) return "";
    return `${window.location.origin}${window.location.pathname}#/verify/${generatedCard.cardNumber}`;
  };

  const handleCopyLink = () => {
    const url = getVerificationUrl();
    navigator.clipboard.writeText(url).then(() => {
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    });
  };

  const handleDownloadCard = async () => {
    const el = cardRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      await document.fonts.ready;
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(res => res ? resolve(res) : reject(new Error("Image failed")), "image/png");
      });
      const objectUrl = URL.createObjectURL(blob);
      const safeName = generatedCard?.name.trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "id";
      const link = document.createElement("a");
      link.download = `card-${safeName}.png`;
      link.href = objectUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.alert("Card download failed.");
    }
  };

  const handlePrintCard = () => {
    const el = cardRef.current;
    if (!el) return;
    const printWindow = window.open("", "_blank", "width=600,height=400");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Print ID Card</title>
      <style>
        body { margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#111; }
        img { max-width:100%; height:auto; }
      </style></head><body></body></html>
    `);
    printWindow.document.close();
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true }).then(canvas => {
        const img = printWindow.document.createElement("img");
        img.src = canvas.toDataURL("image/png");
        printWindow.document.body.appendChild(img);
        setTimeout(() => { printWindow.print(); }, 300);
      });
    });
  };

  const handleBackToCards = () => {
    window.location.hash = "#/admin/cards";
  };

  const handleResetForm = () => {
    setGeneratedCard(null);
    setQrGenerated(false);
    setQrCopied(false);
    setSuccessMessage("");
    setError("");
    setEmail("");
    setName("");
    setPhone("");
    setDob("");
    setAddress("");
    setPhoto("");
    setSignature("");
    setSelectedUserId("");
    setSelectedPlanId(plans.find(plan => !plan.status || plan.status === "active")?.id || "");
  };

  const selectedPlan = plans.find(plan => plan.id === selectedPlanId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs font-black uppercase tracking-[3px] text-white/40">Loading Admin Card Creator...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Admin Create ID Card</h2>
        <p className="text-xs text-white/40">Create an official ID and QR verification record directly, including for people who do not have a mobile number.</p>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-black text-emerald-400 uppercase">{successMessage}</p>
            <button onClick={handleResetForm} className="text-[10px] text-white/40 hover:text-white underline mt-1">Create Another Card</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-xs font-bold text-red-300">
          {error}
        </div>
      )}

      {/* Form Steps */}
      <form onSubmit={handleGenerate} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
        {/* Step 1: Plan Selection — mirrors the user application flow. */}
        <div className="border-b border-white/10 pb-6 space-y-4">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-[4px]">Step 1: Select Plan</span>
          <h3 className="text-xl font-black uppercase tracking-tight">Choose the Card Plan</h3>

          {selectedPlan && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Selected Plan</p>
                <p className="font-black text-white text-lg mt-1">{selectedPlan.name}</p>
                <p className="text-xs text-white/40">₹{selectedPlan.price} / {selectedPlan.duration_days} days</p>
              </div>
              <span className="text-2xl">💎</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.filter(plan => !plan.status || plan.status === "active").map(plan => (
              <button
                type="button"
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
                  {selectedPlanId === plan.id && <span className="text-[10px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-md uppercase">Selected</span>}
                </div>
                <p className="text-3xl font-black text-amber-500">₹{plan.price}</p>
                <div className="mt-3 space-y-1 text-xs text-white/50 font-bold">
                  <p>{plan.duration_days} days validity</p>
                  <p>{plan.card_limit === -1 ? "Unlimited" : plan.card_limit} cards</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Account and personal information */}
        <div className="space-y-4">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-[4px]">Step 2: Personal Information</span>
          <div>
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Existing User (Optional)</label>
            <select
              value={selectedUserId}
              onChange={e => handleSelectUserChange(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/50 text-white"
            >
              <option value="">-- New / direct card creation --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email}) - {u.planName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-2">User Email Address *</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com (account will be created if new)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500/50"
            />
            <p className="text-[10px] text-white/30 mt-1">First-time users will set their own password on first login.</p>
          </div>
        </div>

        <div className="space-y-4">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[4px]">Complete Card Information</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Full Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Leave blank if unavailable"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Date of Birth</label>
              <input
                required
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-500/50 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Address</label>
              <input
                required
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Full Street Address"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-bold outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Photo Upload</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleImageFile("photo", e.target.files?.[0])}
                className="text-xs text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-white file:text-black hover:file:bg-white/80"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Signature Upload</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleImageFile("signature", e.target.files?.[0])}
                className="text-xs text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-white file:text-black hover:file:bg-white/80"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={generating}
          className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase text-sm tracking-wider hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50"
        >
          {generating ? "Generating Card Record..." : "Step 4: Issue ID Card"}
        </button>
      </form>

      {/* ========================================
          GENERATED ID CARD RESULT
          ======================================== */}
      {generatedCard && (
        <div className="space-y-8">
          {/* ID Card Preview */}
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Success</span>
                <h3 className="text-xl font-black uppercase mt-1">Generated ID Card</h3>
              </div>
              <span className="font-mono text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl font-bold">
                {generatedCard.cardNumber}
              </span>
            </div>

            {/* The Actual ID Card */}
            <div className="flex justify-center">
              <div
                ref={cardRef}
                className="w-[500px] h-[300px] rounded-xl overflow-hidden relative select-none shadow-2xl shadow-black/50"
                style={{
                  background: "linear-gradient(135deg, #0a1628 0%, #111d35 40%, #0d2847 100%)",
                  color: "#dcfce7",
                  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                }}
              >
                {/* Red geometric triangles - top right */}
                <div className="absolute top-0 right-0 w-[180px] h-[140px] overflow-hidden">
                  <svg viewBox="0 0 200 160" className="w-full h-full" style={{ opacity: 0.9 }}>
                    <polygon points="200,0 120,0 200,80" fill="#dc2626" />
                    <polygon points="200,30 150,0 200,0" fill="#b91c1c" />
                    <polygon points="200,60 170,30 200,30" fill="#991b1b" />
                    <polygon points="180,0 100,0 140,50" fill="#ef4444" />
                    <polygon points="200,90 180,60 200,60" fill="#7f1d1d" />
                    <polygon points="160,0 80,0 120,60" fill="#dc2626" opacity="0.7" />
                    <polygon points="200,120 190,90 200,90" fill="#450a0a" />
                  </svg>
                </div>

                {/* Company logo centered */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center border-2 mb-1"
                    style={{
                      backgroundColor: "rgba(220, 38, 38, 0.3)",
                      borderColor: "#dc2626"
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" style={{ color: "#166534" }}>
                      <path d="M12 2L14 10H22L16 14L18 22L12 18L6 22L8 14L2 10H10Z" />
                    </svg>
                  </div>
                  <p className="text-[10px] tracking-widest font-black uppercase" style={{ color: "#dcfce7" }}>
                    Maurya and Company
                  </p>
                  <p className="text-[8px] tracking-widest font-bold" style={{ color: "#166534" }}>
                    समस्या निवारण
                  </p>
                </div>

                {/* Main content area */}
                <div className="absolute top-[80px] inset-x-0 px-6 flex gap-5">
                  {/* Left side - Photo */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div
                      className="w-[100px] h-[100px] rounded-full border-[3px] overflow-hidden"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.3)",
                        borderColor: "#dc2626"
                      }}
                    >
                      {generatedCard.photo ? (
                        <img src={generatedCard.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: "rgba(220, 252, 231, 0.2)" }}>
                          <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Name and designation */}
                    <p className="text-[13px] font-black uppercase tracking-wide mt-2" style={{ color: "#dcfce7" }}>
                      {generatedCard.name || "-"}
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "rgba(220, 252, 231, 0.5)" }}>
                      Member
                    </p>
                  </div>

                  {/* Right side - Contact info */}
                  <div className="flex-1 flex flex-col justify-center gap-2 pt-1">
                    {/* Phone */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(220, 38, 38, 0.3)" }}
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" style={{ color: "#dc2626" }}>
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold tracking-wide" style={{ color: "#dcfce7" }}>
                        {generatedCard.phone || "-"}
                      </p>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: "rgba(220, 38, 38, 0.3)" }}
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" style={{ color: "#dc2626" }}>
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      </div>
                      <p
                        className="font-semibold break-words"
                        style={{
                          color: "rgba(220, 252, 231, 0.7)",
                          fontSize: generatedCard.address.length > 80 ? "8px" : generatedCard.address.length > 45 ? "9px" : "10px",
                          lineHeight: "1.3"
                        }}
                      >
                        {generatedCard.address || "-"}
                      </p>
                    </div>

                    {/* DOB */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "rgba(220, 38, 38, 0.3)" }}
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" style={{ color: "#dc2626" }}>
                          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                        </svg>
                      </div>
                      <p className="text-[10px] font-bold tracking-wide" style={{ color: "#dcfce7" }}>
                        {generatedCard.dob || "-"}
                      </p>
                    </div>

                    {/* Plan & Status */}
                    <div className="flex gap-4 pt-1">
                      <div>
                        <p className="text-[7px] uppercase tracking-widest mb-0.5" style={{ color: "rgba(220, 252, 231, 0.4)" }}>Plan</p>
                        <p className="text-[9px] font-black tracking-wider" style={{ color: "#166534" }}>{generatedCard.planName}</p>
                      </div>
                      <div>
                        <p className="text-[7px] uppercase tracking-widest mb-0.5" style={{ color: "rgba(220, 252, 231, 0.4)" }}>Status</p>
                        <p className="text-[9px] font-black tracking-wider" style={{ color: "#4ade80" }}>ACTIVE</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="absolute bottom-0 inset-x-0 h-10 flex items-center justify-between px-5"
                  style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                >
                  <p className="text-[8px] tracking-wider" style={{ color: "rgba(220, 252, 231, 0.4)" }}>
                    Please check if you need
                  </p>
                  <p className="text-[7px] tracking-widest uppercase" style={{ color: "rgba(220, 252, 231, 0.3)" }}>
                    ID: {generatedCard.cardNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Download & Print Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleDownloadCard}
                className="bg-white text-black font-black uppercase tracking-[2px] px-6 py-3 rounded-2xl text-[10px] hover:bg-white/80 transition-all"
              >
                Download ID Card
              </button>
              <button
                onClick={handlePrintCard}
                className="bg-white/10 text-white font-black uppercase tracking-[2px] px-6 py-3 rounded-2xl text-[10px] hover:bg-white/20 transition-all border border-white/10"
              >
                Print ID Card
              </button>
            </div>
          </div>

          {/* ========================================
              QR VERIFICATION SECTION
              ======================================== */}
          <div ref={qrSectionRef} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
            <div>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">QR Verification</span>
              <h3 className="text-xl font-black uppercase mt-1">Verify This ID Card</h3>
              <p className="text-xs text-white/40 mt-1">Scan this QR code to verify the ID card on any device.</p>
            </div>

            {!qrGenerated ? (
              <button
                onClick={() => setQrGenerated(true)}
                className="bg-amber-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20"
              >
                Generate QR Code
              </button>
            ) : (
              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-6 rounded-3xl shadow-xl">
                    <QRCodeCanvas
                      value={getVerificationUrl()}
                      size={200}
                      level="M"
                    />
                  </div>
                </div>

                {/* Verification URL */}
                <div className="bg-black/30 border border-white/10 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Verification URL</p>
                  <p className="font-mono text-xs text-amber-400 break-all">{getVerificationUrl()}</p>
                </div>

                {/* Copy Button */}
                <button
                  onClick={handleCopyLink}
                  className={`w-full font-black uppercase tracking-[2px] px-6 py-3 rounded-2xl text-[10px] transition-all ${
                    qrCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-white border border-white/10 hover:bg-white/20"
                  }`}
                >
                  {qrCopied ? "Verification Link Copied." : "Copy Verification Link"}
                </button>
              </div>
            )}
          </div>

          {/* Back to Cards */}
          <div className="text-center">
            <button
              onClick={handleBackToCards}
              className="text-xs font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
            >
              Back to Generated Cards
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
