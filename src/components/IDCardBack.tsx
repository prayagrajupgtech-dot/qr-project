import { forwardRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface IDCardBackProps {
  cardNumber: string;
  subscriptionUrl: string;
}

const IDCardBack = forwardRef<HTMLDivElement, IDCardBackProps>(({ cardNumber, subscriptionUrl }, ref) => (
  <div
    ref={ref}
    className="w-[500px] h-[300px] rounded-xl overflow-hidden relative select-none"
    style={{
      background: "linear-gradient(135deg, #0a1628 0%, #111d35 40%, #0d2847 100%)",
      color: "#dcfce7",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
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

    {/* Main content */}
    <div className="absolute top-[85px] inset-x-0 px-6 flex justify-between gap-6">
      {/* Left side - Plan info */}
      <div className="flex-1">
        <p className="text-[8px] font-bold uppercase tracking-[3px] mb-1" style={{ color: "rgba(220, 252, 231, 0.4)" }}>
          Membership Plan
        </p>
        <p className="text-[16px] font-black" style={{ color: "#dcfce7" }}>FIRST 30 DAYS FREE</p>
        <p className="text-[10px] font-bold mt-1" style={{ color: "#166534" }}>THEN INR 99 / MONTH</p>

        <div className="mt-3">
          <p className="text-[7px] font-bold uppercase tracking-[2px] mb-1" style={{ color: "rgba(220, 252, 231, 0.4)" }}>
            Open this URL
          </p>
          <p className="text-[8px] font-bold break-all leading-tight" style={{ color: "rgba(220, 252, 231, 0.8)" }}>
            {subscriptionUrl}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(22, 101, 52, 0.5)" }}>
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor" style={{ color: "#dcfce7" }}>
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </div>
          <p className="text-[8px] font-black" style={{ color: "#166534" }}>
            HELPLINE: 9616494204
          </p>
        </div>
      </div>

      {/* Right side - QR Code */}
      <div className="shrink-0 text-center">
        <div className="p-2 rounded-lg" style={{ backgroundColor: "#dcfce7" }}>
          <QRCodeCanvas value={subscriptionUrl} size={100} level="M" marginSize={1} />
        </div>
        <p className="text-[7px] font-bold uppercase tracking-widest mt-2" style={{ color: "rgba(220, 252, 231, 0.5)" }}>
          Scan for plans
        </p>
      </div>
    </div>

    {/* Footer */}
    <div
      className="absolute bottom-0 inset-x-0 h-10 flex items-center justify-between px-5"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <p className="text-[8px] tracking-wider" style={{ color: "rgba(220, 252, 231, 0.4)" }}>
        Card: {cardNumber}
      </p>
      <p className="text-[8px] tracking-wider" style={{ color: "rgba(220, 252, 231, 0.4)" }}>
        Cancel anytime
      </p>
    </div>
  </div>
));

IDCardBack.displayName = "IDCardBack";
export default IDCardBack;
