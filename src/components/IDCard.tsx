import { forwardRef } from "react";

interface PersonData {
  name: string;
  phone: string;
  parentPhone?: string;
  photo: string;
  signature: string;
  idNumber: string;
  dob: string;
  address: string;
}

const IDCard = forwardRef<HTMLDivElement, { data: PersonData }>(({ data }, ref) => {
  const addressFontSize = data.address.length > 80 ? "8px" : data.address.length > 45 ? "9px" : "10px";

  return (
    <div
      ref={ref}
      className="w-[500px] h-[300px] rounded-xl overflow-hidden relative select-none"
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
            {data.photo ? (
              <img src={data.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: "rgba(220, 252, 231, 0.2)" }}
              >
                <svg viewBox="0 0 24 24" className="w-12 h-12" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
          {/* Name and designation */}
          <p className="text-[13px] font-black uppercase tracking-wide mt-2" style={{ color: "#dcfce7" }}>
            {data.name || "-"}
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
              {data.phone || "-"}
            </p>
          </div>

          {/* Parent Phone */}
          {data.parentPhone && (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(220, 38, 38, 0.3)" }}
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" style={{ color: "#dc2626" }}>
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
              <p className="text-[9px] font-bold tracking-wide" style={{ color: "rgba(220, 252, 231, 0.6)" }}>
                P: {data.parentPhone}
              </p>
            </div>
          )}

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
                fontSize: addressFontSize,
                lineHeight: "1.3"
              }}
            >
              {data.address || "-"}
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
              {data.dob || "-"}
            </p>
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
          ID: {data.idNumber}
        </p>
      </div>
    </div>
  );
});

IDCard.displayName = "IDCard";
export default IDCard;
