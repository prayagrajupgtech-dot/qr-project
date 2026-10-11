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

// Print stylesheet injected into the dedicated print document.
// Page 1 = front + back card. Page 2 = QR code. Each `.print-page` is a
// fixed-height A4 sheet with `overflow: hidden`, so content can never spill
// onto a third page.
const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm; }

html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
}

#admin-card-print {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
}

/* Only the QR page's heading/caption show in print, never on screen. */
.admin-print-only { display: none !important; }
@media print { .admin-print-only { display: block !important; } }

.print-page {
  box-sizing: border-box !important;
  width: 180mm !important;
  height: 264mm !important;
  margin: 0 auto !important;
  padding: 0 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8mm !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
/* Start the QR on the second sheet, and never emit a trailing blank page. */
.print-page + .print-page {
  break-before: page !important;
  page-break-before: always !important;
}
.print-page:last-child {
  break-after: auto !important;
  page-break-after: auto !important;
}

.print-card {
  width: 500px !important;
  max-width: 100% !important;
  overflow: visible !important;
  margin: 0 !important;
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

.print-qr-page { gap: 6mm !important; }

.admin-print-qr-box {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.admin-print-qr-box img,
.admin-print-qr-box canvas {
  width: 58mm !important;
  height: 58mm !important;
}

* {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
`;

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

  // Collects every stylesheet the app is using. In dev Vite injects CSS as
  // <style> tags; in production builds the CSS is a <link rel="stylesheet">.
  // Both must be copied or the print document renders unstyled (the original
  // cause of the card spilling across ~13 pages).
  const collectAppCss = async () => {
    const parts: string[] = [];
    document.querySelectorAll("style").forEach(s => {
      if (s.textContent) parts.push(s.textContent);
    });
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    await Promise.all(links.map(async link => {
      try {
        const res = await fetch(link.href);
        if (res.ok) parts.push(await res.text());
      } catch {
        /* ignore stylesheets we cannot read */
      }
    }));
    return parts.join("\n");
  };

  const waitForImages = (win: Window) => new Promise<void>(resolve => {
    const imgs = Array.from(win.document.images || []);
    const pending = imgs.filter(img => !img.complete);
    if (pending.length === 0) {
      resolve();
      return;
    }
    let remaining = pending.length;
    let settled = false;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0 && !settled) {
        settled = true;
        resolve();
      }
    };
    pending.forEach(img => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
    // Safety net so a broken image URL can never block the print dialog.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve();
      }
    }, 3000);
  });

  // Builds a fully self-contained print document and prints it in an isolated
  // context so the dashboard/sidebar/table are never part of the print job.
  const printDocument = async (html: string) => {
    // Preferred: a dedicated window.
    const w = window.open("", "_blank", "width=900,height=700");
    if (w) {
      w.document.write(html);
      w.document.close();
      await waitForImages(w);
      w.focus();
      w.print();
      return;
    }
    // Fallback: a hidden iframe, used when the popup is blocked.
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(frame);
    const fdoc = frame.contentDocument;
    if (!fdoc) {
      frame.remove();
      return;
    }
    fdoc.open();
    fdoc.write(html);
    fdoc.close();
    await waitForImages(frame.contentWindow as Window);
    const fwin = frame.contentWindow;
    if (fwin) {
      fwin.focus();
      fwin.print();
    }
    // Keep the frame alive long enough for the print dialog, then drop it.
    setTimeout(() => frame.remove(), 60000);
  };

  // Prints the selected card as exactly two pages:
  //   page 1 = card front + card back, page 2 = the QR code.
  const handlePrint = async () => {
    const node = document.getElementById("admin-card-print");
    if (!node) return;
    const clone = node.cloneNode(true) as HTMLElement;

    // Canvas (QR codes) do not survive document.write - convert to <img>.
    // Keep the canvas' intrinsic resolution (sharp QR) at its display size.
    const origCanvases = node.querySelectorAll("canvas");
    const cloneCanvases = clone.querySelectorAll("canvas");
    cloneCanvases.forEach((c, i) => {
      const orig = origCanvases[i] as HTMLCanvasElement | undefined;
      if (!orig) return;
      try {
        const img = document.createElement("img");
        img.src = orig.toDataURL("image/png");
        const displayW = orig.clientWidth || orig.width;
        const displayH = orig.clientHeight || orig.height;
        img.width = orig.width;
        img.height = orig.height;
        img.style.width = `${displayW}px`;
        img.style.height = `${displayH}px`;
        c.replaceWith(img);
      } catch {
        /* keep canvas as-is on failure */
      }
    });

    const appCss = await collectAppCss();
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>ResQRide Card - ${viewCard?.card_number || ""}</title>
<style>${appCss}</style>
<style>${PRINT_CSS}</style>
</head>
<body>${clone.outerHTML}</body>
</html>`;
    await printDocument(html);
  };

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
        <div className="print-modal-overlay fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-4" onClick={() => setViewCard(null)}>
          <div className="print-modal-scroll min-h-full flex">
          <div
            className={`print-modal-box m-auto w-full max-w-2xl rounded-[2rem] border p-6 sm:p-8 ${isDark ? "bg-slate-950 border-white/10" : "bg-white border-[#bbf7d0]"}`}
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

            {/* Printable area — page 1: front + back, page 2: QR */}
            <div id="admin-card-print" className="flex flex-col items-center gap-6 w-full">
              <section className="print-page w-full flex flex-col items-center gap-6">
                <div className="print-card w-full max-w-[500px] overflow-x-auto">
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
                <div className="print-card w-full max-w-[500px] overflow-x-auto">
                  <div className="min-w-[500px]">
                    <IDCardBack cardNumber={viewCard.card_number} subscriptionUrl={`${getPublicBaseUrl()}#/home`} />
                  </div>
                </div>
              </section>

              <section className="print-page print-qr-page bg-white p-4 rounded-2xl flex flex-col items-center justify-center gap-3">
                <p className="admin-print-only text-lg font-black uppercase tracking-[0.25em] text-slate-900">ResQRide</p>
                <p className="admin-print-only text-[10px] font-black uppercase tracking-[0.35em] text-red-600">QR Code</p>
                <div className="admin-print-qr-box">
                  <QRCodeCanvas
                    value={`${getPublicBaseUrl()}#/verify/${viewCard.card_number}`}
                    size={280}
                    level="M"
                    marginSize={2}
                    style={{ width: 140, height: 140, display: "block" }}
                  />
                </div>
                <p className="admin-print-only text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Scan for emergency contact</p>
              </section>
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
                onClick={handlePrint}
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
