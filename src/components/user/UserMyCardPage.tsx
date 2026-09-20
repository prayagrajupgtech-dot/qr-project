import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import IDCard from "../IDCard";
import IDCardBack from "../IDCardBack";
import { useAuth } from "../../contexts/AuthContext";

interface UserCardData {
  id: string;
  cardNumber: string;
  name: string;
  phone: string;
  parentPhone: string | null;
  dateOfBirth: string;
  address: string;
  photoUrl: string | null;
  status: string;
  planId: string | null;
  createdAt: string;
}

function getPublicBaseUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;
  const url = new URL(window.location.href);
  if (url.hostname.endsWith(".netlify.app") && url.hostname.includes("--")) {
    url.hostname = url.hostname.split("--").pop() || url.hostname;
  }
  return url.origin + url.pathname;
}

export default function UserMyCardPage() {
  const { session } = useAuth();
  const [card, setCard] = useState<UserCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState("");
  const [showFixForm, setShowFixForm] = useState(false);
  const [fixPaymentId, setFixPaymentId] = useState("");
  const [fixOrderId, setFixOrderId] = useState("");

  const getToken = () => session?.access_token || localStorage.getItem("maurya_user_token") || "";

  useEffect(() => {
    async function fetchMyCard() {
      try {
        const token = getToken();
        const res = await fetch("/api/user-card", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.status === 403) {
          setError(data.error || "Your account has been blocked.");
        } else if (res.ok) {
          setCard(data.card);
        } else {
          setError(data.error || "Could not load your card.");
        }
      } catch {
        setError("Network error loading your card.");
      } finally {
        setLoading(false);
      }
    }
    fetchMyCard();
  }, []);

  async function handleRecover() {
    setRecovering(true);
    try {
      const token = getToken();
      const res = await fetch("/api/user-payment?action=recover", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.recovered && data.recovered.length > 0) {
        window.location.reload();
      } else if (res.ok && data.debug) {
        setError(`No payments found. Debug: ${data.debug.totalPayments} total payments in DB. Your User ID: ${data.debug.userId}`);
      } else if (res.ok) {
        setError(data.message || "No pending payments found to recover.");
      } else {
        setError(data.error || "Could not recover card.");
      }
    } catch {
      setError("Recovery request failed.");
    } finally {
      setRecovering(false);
    }
  }

  async function handleFixPayment() {
    if (!fixPaymentId.trim() || !fixOrderId.trim()) {
      setFixResult("Please enter both Payment ID and Order ID.");
      return;
    }
    setFixing(true);
    setFixResult("");
    try {
      const token = getToken();
      const res = await fetch("/api/fix-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          paymentId: fixPaymentId.trim(),
          orderId: fixOrderId.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.reload();
      } else {
        setFixResult(data.error || "Fix failed.");
      }
    } catch {
      setFixResult("Fix request failed.");
    } finally {
      setFixing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs font-black uppercase tracking-[3px] text-white/40">Loading Your Card...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] text-center space-y-4 pb-20 sm:pb-8">
        <h2 className="text-lg sm:text-xl font-black uppercase text-red-400">Error</h2>
        <p className="text-sm text-white/70">{error}</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-12 text-center space-y-6 pb-20 sm:pb-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/20" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10-4h2v2h-2zm-6-4h8v2h-8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black uppercase text-white/60">No ID Card Yet</h2>
          <p className="text-xs sm:text-sm text-white/30 mt-2">
            Your ID card has not been created yet. Please contact the administrator.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              onClick={handleRecover}
              disabled={recovering}
              className="bg-amber-500 text-black text-xs font-black uppercase tracking-[2px] px-6 py-3 rounded-xl disabled:opacity-40"
            >
              {recovering ? "Recovering..." : "Recover Card"}
            </button>
            <button
              onClick={() => setShowFixForm(v => !v)}
              disabled={fixing}
              className="bg-emerald-500 text-black text-xs font-black uppercase tracking-[2px] px-6 py-3 rounded-xl disabled:opacity-40"
            >
              {showFixForm ? "Cancel" : "Fix Payment"}
            </button>
          </div>
          {showFixForm && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={fixPaymentId}
                onChange={e => setFixPaymentId(e.target.value)}
                placeholder="Razorpay Payment ID (e.g. pay_...)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500/60"
              />
              <input
                type="text"
                value={fixOrderId}
                onChange={e => setFixOrderId(e.target.value)}
                placeholder="Razorpay Order ID (e.g. order_...)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500/60"
              />
              <button
                onClick={handleFixPayment}
                disabled={fixing || !fixPaymentId.trim() || !fixOrderId.trim()}
                className="w-full bg-emerald-500 text-black text-xs font-black uppercase tracking-[2px] px-6 py-2.5 rounded-xl disabled:opacity-40"
              >
                {fixing ? "Verifying & Creating..." : "Submit Payment Details"}
              </button>
            </div>
          )}
          {fixResult && <p className="text-red-400 text-xs mt-2">{fixResult}</p>}
        </div>
      </div>
    );
  }

  const isActive = card.status === "active";

  return (
    <div className="space-y-6 sm:space-y-10 pb-20 sm:pb-0">
      {/* Status Banner */}
      <div className={`flex items-center justify-center gap-3 py-3 rounded-2xl ${isActive ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
        <span className={`text-xs font-black uppercase tracking-[2px] ${isActive ? "text-emerald-400" : "text-red-400"}`}>
          Card {isActive ? "Active" : card.status}
        </span>
      </div>

      {/* ID Card Display */}
      <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 flex flex-col items-center">
        <div className="w-full flex items-center justify-between gap-4 mb-6 sm:mb-10">
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[5px]">Your Digital ID Card</span>
          <button
            onClick={() => setIsCardFlipped(v => !v)}
            className="bg-amber-500 text-black text-[10px] font-black uppercase tracking-[2px] px-4 py-2 rounded-xl"
          >
            Flip Card
          </button>
        </div>

        <div className="w-full max-w-[340px] sm:max-w-[500px] aspect-[5/3]">
          <div className="w-[500px] h-[300px] scale-[0.6] sm:scale-100 origin-top-left" style={{ perspective: "1200px" }}>
            <div
              className="relative w-full h-full transition-transform duration-700"
              style={{
                transform: isCardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transformStyle: "preserve-3d"
              }}
            >
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                <IDCard
                  data={{
                    name: card.name,
                    phone: card.phone,
                    parentPhone: card.parentPhone || undefined,
                    photo: card.photoUrl || "",
                    signature: "",
                    idNumber: card.cardNumber,
                    dob: card.dateOfBirth,
                    address: card.address
                  }}
                />
              </div>
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <IDCardBack cardNumber={card.cardNumber} subscriptionUrl={`${getPublicBaseUrl()}#/home`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[3rem] p-6 sm:p-10 flex flex-col items-center">
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[5px] mb-6 sm:mb-8">Verification QR</span>
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem]">
          <QRCodeCanvas value={`${getPublicBaseUrl()}#/verify/${card.cardNumber}`} size={180} />
        </div>
        <p className="text-white/30 text-[10px] font-bold mt-4 uppercase">Scan opens public verification page</p>
      </div>

      {/* Card Details */}
      <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 space-y-4">
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[5px]">Card Details</span>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs">
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Card ID</p>
            <p className="font-mono text-amber-400 mt-1">{card.cardNumber}</p>
          </div>
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Status</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-md font-black uppercase text-[10px] ${isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {card.status}
            </span>
          </div>
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Full Name</p>
            <p className="font-bold mt-1">{card.name}</p>
          </div>
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Mobile</p>
            <p className="font-bold mt-1">{card.phone}</p>
          </div>
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Date of Birth</p>
            <p className="font-bold mt-1">{card.dateOfBirth}</p>
          </div>
          <div className="bg-black/30 p-4 rounded-xl">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Created</p>
            <p className="font-bold mt-1">{new Date(card.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="bg-black/30 p-4 rounded-xl">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Address</p>
          <p className="font-bold mt-1">{card.address}</p>
        </div>
      </div>
    </div>
  );
}
