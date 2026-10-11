interface PersonData {
  name: string;
  phone: string;
  photo: string;
  signature: string;
  idNumber: string;
  dob: string;
  address: string;
}

interface PlanInfo {
  name: string;
  card_limit: number;
}

interface UserFormPageProps {
  formData: PersonData;
  updateFormData: (field: keyof PersonData, value: string) => void;
  errors: Partial<Record<"name" | "phone" | "dob" | "address", string>>;
  onGenerate: () => void;
  isGenerating: boolean;
  formError: string;
  assignedPlan: PlanInfo | null;
  cardsCount: number;
}

export default function UserFormPage({
  formData,
  updateFormData,
  errors,
  onGenerate,
  isGenerating,
  formError,
  assignedPlan,
  cardsCount
}: UserFormPageProps) {
  const isLimitReached =
    assignedPlan &&
    assignedPlan.card_limit !== -1 &&
    cardsCount >= assignedPlan.card_limit;

  const loadImageFile = (field: "photo" | "signature", file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => updateFormData(field, reader.result as string);
    reader.readAsDataURL(file);
  };

  const fieldClassName = (field: keyof typeof errors) =>
    `w-full bg-white/5 border rounded-2xl px-5 py-4 outline-none focus:border-amber-500/50 font-bold ${
      errors[field] ? "border-red-500/70" : "border-white/10"
    }`;

  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 sm:p-12 space-y-8">
      {/* Header & Assigned Plan (Read-Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">ResQRide</h2>
          <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mt-1">ID Card Generation Form</p>
        </div>

        {/* Read-Only Assigned Plan Banner */}
        <div className="bg-black/30 border border-white/10 px-5 py-3 rounded-2xl">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Assigned Account Plan</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-black text-amber-400 text-sm uppercase">
              Current Plan: {assignedPlan?.name || "Basic"}
            </span>
            <span className="text-xs text-white/40 font-mono">
              ({assignedPlan?.card_limit === -1 ? "Unlimited" : `${cardsCount} / ${assignedPlan?.card_limit || 100} Cards`})
            </span>
          </div>
        </div>
      </div>

      {/* Card Limit Warning */}
      {isLimitReached && (
        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl text-center space-y-1">
          <p className="text-sm font-black uppercase tracking-wider text-red-400">Limit Reached</p>
          <p className="text-xs font-semibold text-red-300">
            You have reached your card generation limit. Please contact the administrator.
          </p>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Full Name</label>
            <input
              value={formData.name}
              onChange={e => updateFormData("name", e.target.value)}
              className={fieldClassName("name")}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-xs font-bold text-red-300">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => updateFormData("phone", e.target.value)}
              className={fieldClassName("phone")}
              placeholder="10-digit mobile number"
            />
            {errors.phone && <p className="text-xs font-bold text-red-300">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Date of Birth</label>
            <input
              type="date"
              value={formData.dob}
              onChange={e => updateFormData("dob", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className={`${fieldClassName("dob")} [color-scheme:dark]`}
            />
            {errors.dob && <p className="text-xs font-bold text-red-300">{errors.dob}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[3px]">Address</label>
            <textarea
              value={formData.address}
              onChange={e => updateFormData("address", e.target.value)}
              className={`${fieldClassName("address")} min-h-28 resize-none`}
              placeholder="House no, street, city, state"
            />
            {errors.address && <p className="text-xs font-bold text-red-300">{errors.address}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-6 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center gap-5 hover:bg-white/5 transition-all">
            <div className="w-24 h-32 bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
              {formData.photo ? (
                <img src={formData.photo} alt="Passport preview" className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/10" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-black text-lg mb-1">Passport Photo</p>
              <p className="text-xs text-white/30 font-bold mb-4">Shown on the downloaded ID card.</p>
              <label className="cursor-pointer bg-white text-black text-[10px] font-black uppercase tracking-[3px] px-6 py-3 rounded-xl inline-block hover:scale-105 active:scale-95 transition-all">
                Select Photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => loadImageFile("photo", e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="p-6 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center text-center gap-5 hover:bg-white/5 transition-all">
            <div className="w-40 h-20 bg-white rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-3">
              {formData.signature ? (
                <img src={formData.signature} alt="Signature preview" className="w-full h-full object-contain" />
              ) : (
                <div className="w-28 border-b-2 border-slate-300" />
              )}
            </div>
            <div>
              <p className="font-black text-lg mb-1">Signature</p>
              <p className="text-xs text-white/30 font-bold mb-4">Use a clear PNG, JPG, or WebP image.</p>
              <label className="cursor-pointer bg-white text-black text-[10px] font-black uppercase tracking-[3px] px-6 py-3 rounded-xl inline-block hover:scale-105 active:scale-95 transition-all">
                Select Signature
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => loadImageFile("signature", e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating || Boolean(isLimitReached)}
          className="w-full bg-amber-500 text-black font-black py-5 rounded-[2rem] text-lg hover:bg-amber-400 hover:scale-[1.01] transition-all shadow-2xl shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "SAVING VERIFICATION RECORD..." : "GENERATE ID & QR"}
        </button>

        {formError && (
          <p className="text-center text-sm font-bold text-red-300">{formError}</p>
        )}
      </div>
    </div>
  );
}
