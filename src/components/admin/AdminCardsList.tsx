import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import IDCard from "../IDCard";
import IDCardBack from "../IDCardBack";
import { useTheme } from "../../App";

interface CardRecord {
  id: string;
  card_number: string;
  name: string;
  phone: string;
  parent_phone?: string | null;
  date_of_birth: string;
  address: string;
  photo_url?: string | null;
  email?: string;
  status: string;
  created_at: string;
  user_id?: string | null;
}

export default function AdminCardsList() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewCard, setViewCard] = useState<CardRecord | null>(null);
  const [search, setSearch] = useState("");

  const getPublicBaseUrl = () => {
    return window.location.origin + window.location.pathname;
  };

  useEffect(() => {
    fetchCards();
  }, []);

  async function fetchCards() {
    try {
      const res = await fetch("/api/admin-cards");
      const data = await res.json();
      if (res.ok) setCards(data.cards || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCardAction(cardId: string, action: "activate" | "deactivate" | "delete") {
    if (action === "delete" && !confirm("Are you sure you want to delete this card? This cannot be undone.")) {
      return;
    }

    setActionLoading(cardId);
    try {
      if (action === "delete") {
        const res = await fetch(`/api/admin-cards?cardId=${encodeURIComponent(cardId)}`, { method: "DELETE" });
        if (res.ok) {
          setCards(prev => prev.filter(c => c.id !== cardId));
          if (viewCard?.id === cardId) setViewCard(null);
        }
      } else {
        const res = await fetch("/api/admin-cards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, action })
        });
        if (res.ok) {
          setCards(prev => prev.map(c => c.id === cardId ? { ...c, status: action === "activate" ? "active" : "blocked" } : c));
          if (viewCard?.id === cardId) {
            setViewCard(prev => prev ? { ...prev, status: action === "activate" ? "active" : "blocked" } : prev);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  const filteredCards = cards.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.card_number?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  const cardStyle = isDark ? "bg-white/5 border-white/10" : "bg-white border-[#bbf7d0]";
  const textMain = isDark ? "text-white" : "text-[#064e3b]";
  const textSub = isDark ? "text-white/40" : "text-[#047857]";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl sm:text-2xl font-black uppercase tracking-tight ${textMain}`}>Generated Cards</h2>
          <p className={`text-xs ${textSub}`}>View, print and manage all ID cards. Activate, deactivate, or delete.</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, card ID, mobile..."
          className={`w-full sm:w-64 px-4 py-2.5 rounded-xl text-xs font-bold outline-none border ${isDark ? "bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-amber-500/50" : "bg-white border-[#bbf7d0] text-[#064e3b] placeholder-[#059669]/50 focus:border-emerald-500"}`}
        />
      </div>

      <div className={`${cardStyle} border rounded-[2rem] overflow-hidden`}>
        {loading ? (
          <div className={`p-12 text-center text-xs font-black uppercase ${textSub} tracking-widest`}>
            Loading System Cards...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className={`p-12 text-center text-xs font-black uppercase ${textSub} tracking-widest`}>
            {cards.length === 0 ? "No cards generated yet." : "No cards match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className={`border-b ${isDark ? "border-white/10" : "border-[#bbf7d0]"}`}>
                  <th className={`text-left p-4 text-[10px] font-black ${textSub} uppercase tracking-widest`}>Card ID</th>
                  <th className={`text-left p-4 text-[10px] font-black ${textSub} uppercase tracking-widest`}>User Name</th>
                  <th className={`text-left p-4 text-[10px] font-black ${textSub} uppercase tracking-widest`}>Mobile</th>
                  <th className={`text-left p-4 text-[10px] font-black ${textSub} uppercase tracking-widest`}>Status</th>
                  <th className={`text-left p-4 text-[10px] font-black ${textSub} uppercase tracking-widest`}>Created</th>
                  <th className={`text-left p-4 text-[10px] font-black ${textSub} uppercase tracking-widest`}>QR</th>
                  <th className={`text-right p-4 text-[10px] font-black ${textSub} uppercase tracking-widest`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map(c => (
                  <tr key={c.id} className={`border-b ${isDark ? "border-white/5 hover:bg-white/5" : "border-[#f0fdf4] hover:bg-[#f0fdf4]"} transition-colors`}>
                    <td className="p-4 font-mono text-amber-500 font-bold">{c.card_number}</td>
                    <td className={`p-4 font-bold ${textMain}`}>{c.name}</td>
                    <td className={`p-4 ${isDark ? "text-white/70" : "text-[#047857]"}`}>{c.phone}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${
                        c.status === "active"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className={`p-4 ${textSub}`}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="bg-white p-1.5 rounded-lg inline-block">
                        <QRCodeCanvas value={`${getPublicBaseUrl()}#/verify/${c.card_number}`} size={36} />
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          onClick={() => setViewCard(c)}
                          className="px-2.5 py-1 bg-amber-500 text-black rounded-lg font-black text-[9px] uppercase hover:bg-amber-400 transition-all"
                        >
                          View / Print
                        </button>
                        {c.status === "active" ? (
                          <button
                            onClick={() => handleCardAction(c.id, "deactivate")}
                            disabled={actionLoading === c.id}
                            className="px-2.5 py-1 bg-red-500/10 text-red-400 rounded-lg font-black text-[9px] uppercase hover:bg-red-500/20 transition-all disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCardAction(c.id, "activate")}
                            disabled={actionLoading === c.id}
                            className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg font-black text-[9px] uppercase hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleCardAction(c.id, "delete")}
                          disabled={actionLoading === c.id}
                          className="px-2.5 py-1 bg-red-500/10 text-red-400 rounded-lg font-black text-[9px] uppercase hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View / Print Modal */}
      {viewCard && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-4" onClick={() => setViewCard(null)}>
          <div className="min-h-full flex">
          <div
            className={`m-auto w-full max-w-2xl rounded-[2rem] border p-6 sm:p-8 ${isDark ? "bg-slate-950 border-white/10" : "bg-white border-[#bbf7d0]"}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 no-print">
              <div>
                <h3 className={`text-lg font-black uppercase ${textMain}`}>{viewCard.name}</h3>
                <p className={`text-xs font-mono ${textSub}`}>{viewCard.card_number} • {viewCard.email || "No email"}</p>
              </div>
              <button
                onClick={() => setViewCard(null)}
                className={`w-9 h-9 rounded-xl font-black ${isDark ? "bg-white/10 text-white/60 hover:text-white" : "bg-[#f0fdf4] text-[#047857] hover:text-[#064e3b]"}`}
              >
                ✕
              </button>
            </div>

            {/* Printable card area - front + back + QR, each on its own print page */}
            <div id="admin-card-print" className="flex flex-col items-center gap-6">
              <div className="print-page w-full max-w-[500px] overflow-x-auto">
                <div className="min-w-[500px]">
                <IDCard
                  data={{
                    name: viewCard.name,
                    phone: viewCard.phone,
                    parentPhone: viewCard.parent_phone || undefined,
                    photo: viewCard.photo_url || "",
                    signature: "",
                    idNumber: viewCard.card_number,
                    dob: viewCard.date_of_birth,
                    address: viewCard.address
                  }}
                />
                </div>
              </div>
              <div className="print-page w-full max-w-[500px] overflow-x-auto">
                <div className="min-w-[500px]">
                <IDCardBack cardNumber={viewCard.card_number} subscriptionUrl={`${getPublicBaseUrl()}#/home`} />
                </div>
              </div>
              <div className="print-page bg-white p-4 rounded-2xl">
                <QRCodeCanvas value={`${getPublicBaseUrl()}#/verify/${viewCard.card_number}`} size={140} />
              </div>
            </div>

            {/* Details */}
            <div className={`grid grid-cols-2 gap-2 mt-6 text-xs no-print`}>
              <div className={`${isDark ? "bg-black/30" : "bg-[#f0fdf4]"} p-3 rounded-xl`}>
                <p className={`text-[10px] font-black ${textSub} uppercase`}>Mobile</p>
                <p className={`font-bold ${textMain}`}>{viewCard.phone}</p>
              </div>
              <div className={`${isDark ? "bg-black/30" : "bg-[#f0fdf4]"} p-3 rounded-xl`}>
                <p className={`text-[10px] font-black ${textSub} uppercase`}>Parent Mobile</p>
                <p className={`font-bold ${textMain}`}>{viewCard.parent_phone || "—"}</p>
              </div>
              <div className={`${isDark ? "bg-black/30" : "bg-[#f0fdf4]"} p-3 rounded-xl`}>
                <p className={`text-[10px] font-black ${textSub} uppercase`}>Date of Birth</p>
                <p className={`font-bold ${textMain}`}>{viewCard.date_of_birth}</p>
              </div>
              <div className={`${isDark ? "bg-black/30" : "bg-[#f0fdf4]"} p-3 rounded-xl`}>
                <p className={`text-[10px] font-black ${textSub} uppercase`}>Status</p>
                <p className={`font-bold ${textMain} uppercase`}>{viewCard.status}</p>
              </div>
              <div className={`${isDark ? "bg-black/30" : "bg-[#f0fdf4]"} p-3 rounded-xl col-span-2`}>
                <p className={`text-[10px] font-black ${textSub} uppercase`}>Address</p>
                <p className={`font-bold ${textMain}`}>{viewCard.address}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-amber-500 text-black py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-amber-400 transition-all"
              >
                🖨️ Print Card
              </button>
              <button
                onClick={() => setViewCard(null)}
                className={`px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest border ${isDark ? "bg-white/5 border-white/10 text-white/60" : "bg-[#f0fdf4] border-[#bbf7d0] text-[#047857]"}`}
              >
                Close
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
