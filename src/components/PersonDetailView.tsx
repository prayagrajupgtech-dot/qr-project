interface VerificationData {
  databaseVerified: boolean;
  idNumber: string;
  name: string;
  phone: string;
  parentPhone?: string | null;
  photoUrl?: string;
  dateOfBirth?: string;
  address?: string;
  planName?: string;
  status: "active" | "expired" | "blocked" | "legacy";
}

export default function PersonDetailView({ data }: { data: VerificationData }) {
  const scanDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric"
  });

  const isActive = data.databaseVerified && data.status === "active";
  const isBlocked = data.status === "blocked";
  const isExpired = data.status === "expired";

  const statusLabel = isActive
    ? "VERIFIED ID CARD"
    : isBlocked
      ? "CARD INACTIVE"
      : isExpired
        ? "CARD EXPIRED"
        : "LEGACY QR";

  const statusDescription = isActive
    ? "This card is verified and active in the issuer database."
    : isBlocked
      ? "This ID card is currently inactive."
      : isExpired
        ? "This ID card has expired."
        : "Legacy QR - Not database verified.";

  const headerBg = isActive
    ? "bg-emerald-500"
    : isBlocked
      ? "bg-red-500"
      : "bg-amber-500";

  const phoneDigits = data.phone?.replace(/\D/g, "") || "";
  const callHref = phoneDigits ? `tel:${phoneDigits}` : "#";
  const parentDigits = data.parentPhone?.replace(/\D/g, "") || "";
  const parentCallHref = parentDigits ? `tel:${parentDigits}` : "#";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
            <span className="text-xl font-black text-black">M</span>
          </div>
          <h1 className="text-lg font-black tracking-tight uppercase text-white">Maurya Generator</h1>
          <p className="text-amber-500 font-bold text-[10px] mt-0.5 tracking-[3px]">VEHICLE EMERGENCY ID</p>
        </div>

        {/* Status Bar */}
        <div className={`${headerBg} py-2.5 px-4 flex items-center justify-center gap-2 mb-6 rounded-xl`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
            {isActive ? (
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            ) : (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            )}
          </svg>
          <span className="text-[10px] font-black text-white uppercase tracking-[3px]">{statusLabel}</span>
        </div>

        {/* Emergency Message */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 text-center">
          <p className="text-xs font-bold text-amber-300">
            Have you found this vehicle or is the owner involved in an accident?
          </p>
          <p className="text-[10px] text-amber-300/60 mt-1">
            Please contact the registered emergency contact below.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl overflow-hidden">
          {/* Photo Section */}
          <div className="p-8 flex flex-col items-center border-b border-white/5">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/10 mb-4 bg-white/5 flex items-center justify-center">
              {data.photoUrl ? (
                <img src={data.photoUrl} alt={data.name} className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-14 h-14 text-white/10" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Full Name</p>
            <p className="text-2xl font-black text-white uppercase tracking-tight mt-1 text-center">
              {data.name || "UNAVAILABLE"}
            </p>
          </div>

          {/* Details Section */}
          <div className="p-6 space-y-5">
            {/* CALL OWNER BUTTON - MOST PROMINENT */}
            {isActive && data.phone && (
              <a
                href={callHref}
                className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                CALL OWNER
              </a>
            )}

            {/* Mobile Number */}
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Mobile Number</p>
              <p className="text-xl font-black text-amber-400 tracking-widest">{data.phone || "UNAVAILABLE"}</p>
            </div>

            {/* Parent / Guardian Number */}
            {data.parentPhone && (
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Parent / Guardian Number</p>
                <p className="text-xl font-black text-amber-400 tracking-widest">{data.parentPhone}</p>
                {isActive && (
                  <a
                    href={parentCallHref}
                    className="mt-3 flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    CALL PARENT
                  </a>
                )}
              </div>
            )}

            {/* Plan */}
            {data.planName && (
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Plan</p>
                <p className="text-sm font-black text-white uppercase">{data.planName}</p>
              </div>
            )}

            {data.dateOfBirth && (
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Date of Birth</p>
                <p className="text-sm font-bold text-white">{data.dateOfBirth}</p>
              </div>
            )}

            {data.address && (
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Address</p>
                <p className="text-sm font-bold text-white">{data.address}</p>
              </div>
            )}

            {/* Card Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Card ID</p>
                <p className="text-xs font-mono font-bold text-amber-400 break-all">{data.idNumber}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${
                  isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {isActive ? "ACTIVE" : isBlocked ? "INACTIVE" : "EXPIRED"}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 p-4 text-center">
            <p className="text-[10px] text-white/20 uppercase tracking-widest">{statusDescription}</p>
            <p className="text-[9px] text-white/10 mt-2 uppercase tracking-wider">Scanned at {scanDate}</p>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
            Verified through Maurya Generator
          </p>
        </div>
      </div>
    </div>
  );
}
