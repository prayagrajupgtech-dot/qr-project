interface LoginSelectionPageProps {
  onSelectAdmin: () => void;
  onSelectUser: () => void;
  onRegister: () => void;
}

export default function LoginSelectionPage({ onSelectAdmin, onSelectUser, onRegister }: LoginSelectionPageProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden bg-[#020617] text-white selection:bg-sky-500/20 font-inter antialiased">
      {/* ========== Background Layers ========== */}
      <div className="fixed inset-0 -z-20" aria-hidden="true">
        {/* Base radial gradient - deep navy to black */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#051022] via-[#020617] to-[#000000]" />
        
        {/* Mountain road atmosphere - large soft glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_80%,rgba(14,165,233,0.06)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_20%,rgba(249,115,22,0.04)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_70%,rgba(14,165,233,0.03)_0%,transparent_60%)]" />
        
        {/* Subtle road surface texture */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[linear-gradient(to_top,rgba(15,23,42,0.9)_0%,transparent_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-[linear-gradient(90deg,rgba(14,165,233,0.02)_0%,transparent_50%,rgba(249,115,22,0.015)_100%)]" />
        
        {/* Distant vehicle light streaks - subtle */}
        <div className="absolute bottom-20 left-10 w-4 h-0.5 bg-sky-400/20 blur-[4px] animate-pulse-slow" style={{animationDuration: '4s'}} />
        <div className="absolute bottom-24 right-15 w-6 h-0.5 bg-orange-400/15 blur-[4px] animate-pulse-slow" style={{animationDuration: '3.5s', animationDelay: '1s'}} />
        <div className="absolute bottom-18 left-1/4 w-3 h-0.5 bg-sky-400/15 blur-[4px] animate-pulse-slow" style={{animationDuration: '4.5s', animationDelay: '0.5s'}} />
      </div>

      {/* Foreground vignette */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-t from-[#020617]/80 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

      {/* ========== Main Content ========== */}
      <main className="relative z-10 w-full max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="text-center mb-10 sm:mb-14">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-[0_8px_32px_rgba(14,165,233,0.3)] mb-6 animate-fade-in-down">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>

          {/* Brand Name */}
          <h1 className="font-manrope text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-white mb-3 animate-fade-in-up" style={{animationDelay: '100ms'}}>
            ResQRide
          </h1>

          {/* Subtitle */}
          <p className="font-manrope text-xs sm:text-sm font-semibold uppercase tracking-[6px] text-sky-400 mb-3 animate-fade-in-up" style={{animationDelay: '200ms'}}>
            Vehicle QR Safety Platform
          </p>

          {/* New Tagline */}
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{animationDelay: '300ms'}}>
            Your vehicle. Your emergency contact. One scan away.
          </p>

          {/* Divider */}
          <div className="mt-6 flex items-center justify-center gap-4 animate-fade-in" style={{animationDelay: '400ms'}}>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
            <span className="text-[10px] font-medium uppercase tracking-[4px] text-white/30">SELECT ACCESS</span>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
          </div>
        </header>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-12">
          {/* ========== Admin Card ========== */}
          <article className="group relative bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-7 sm:p-8 lg:p-10 flex flex-col transition-all duration-500 hover:border-sky-500/30 hover:bg-white/7 hover:shadow-[0_20px_60px_rgba(14,165,233,0.12)] animate-slide-up" style={{animationDelay: '200ms'}}>
            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-3/4 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent transition-all duration-500 rounded-full" aria-hidden="true" />
            
            {/* Icon */}
            <div className="relative w-12 h-12 bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:border-sky-400/40 group-hover:shadow-[0_0_24px_rgba(14,165,233,0.2)] transition-all duration-300">
              <svg className="w-6 h-6 text-sky-400 group-hover:text-sky-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>

            {/* Content */}
            <div className="space-y-3 flex-1">
              <h2 className="font-manrope text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white group-hover:text-sky-300 transition-colors duration-300">
                ADMIN LOGIN
              </h2>
              <p className="text-sm text-white/50 leading-relaxed">
                Manage users, plans & ID cards across the entire system console.
              </p>
            </div>

            {/* Button */}
            <div className="pt-6">
              <button
                onClick={onSelectAdmin}
                className="relative w-full bg-gradient-to-r from-sky-500 to-sky-600 text-white font-bold uppercase text-xs sm:text-sm tracking-widest py-3.5 sm:py-4 rounded-xl shadow-[0_8px_24px_rgba(14,165,233,0.3)] hover:shadow-[0_12px_32px_rgba(14,165,233,0.4)] hover:from-sky-400 hover:to-sky-500 active:scale-[0.98] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              >
                <span className="relative z-10">LOGIN</span>
                {/* Shimmer overlay */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-xl pointer-events-none" aria-hidden="true" />
              </button>
            </div>
          </article>

          {/* ========== User Card ========== */}
          <article className="group relative bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-7 sm:p-8 lg:p-10 flex flex-col transition-all duration-500 hover:border-orange-500/30 hover:bg-white/7 hover:shadow-[0_20px_60px_rgba(249,115,22,0.12)] animate-slide-up" style={{animationDelay: '300ms'}}>
            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-3/4 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent transition-all duration-500 rounded-full" aria-hidden="true" />
            
            {/* Icon */}
            <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 rounded-xl flex items-center justify-center mb-5 group-hover:border-orange-400/40 group-hover:shadow-[0_0_24px_rgba(249,115,22,0.2)] transition-all duration-300">
              <svg className="w-6 h-6 text-orange-400 group-hover:text-orange-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            {/* Content */}
            <div className="space-y-3 flex-1">
              <h2 className="font-manrope text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white group-hover:text-orange-300 transition-colors duration-300">
                USER LOGIN
              </h2>
              <p className="text-sm text-white/50 leading-relaxed">
                Create and manage your own digital ID card and verification QR codes.
              </p>
            </div>

            {/* Buttons */}
            <div className="pt-6 space-y-3">
              <button
                onClick={onSelectUser}
                className="relative w-full bg-white text-[#020617] font-bold uppercase text-xs sm:text-sm tracking-widest py-3.5 sm:py-4 rounded-xl shadow-[0_8px_24px_rgba(255,255,255,0.15)] hover:bg-white/90 hover:shadow-[0_12px_32px_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              >
                <span className="relative z-10">LOGIN</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-xl pointer-events-none" aria-hidden="true" />
              </button>
              <button
                onClick={onRegister}
                className="relative w-full bg-white/5 text-white font-bold uppercase text-xs sm:text-sm tracking-widest py-3.5 sm:py-4 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]"
              >
                <span className="relative z-10">REGISTER</span>
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 rounded-xl pointer-events-none" aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-[10px] sm:text-xs font-semibold uppercase tracking-[3px] text-white/30">
            <span className="flex items-center gap-1.5 group">
              <span className="relative">Safer Journeys</span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-sky-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" aria-hidden="true" />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />
            <span className="flex items-center gap-1.5 group">
              <span className="relative">Instant Help</span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-orange-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" aria-hidden="true" />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />
            <span className="flex items-center gap-1.5 group">
              <span className="relative">Stronger Communities</span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-emerald-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" aria-hidden="true" />
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}