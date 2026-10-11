interface LoginSelectionPageProps {
  onSelectAdmin: () => void;
  onSelectUser: () => void;
  onRegister: () => void;
}

export default function LoginSelectionPage({ onSelectAdmin, onSelectUser, onRegister }: LoginSelectionPageProps) {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 selection:bg-amber-500/30">
      <div className="w-full max-w-xl text-center space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center font-black text-black text-2xl shadow-xl shadow-amber-500/20">
            ID
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
            ResQRide
          </h1>
          <p className="text-amber-500 text-xs sm:text-sm font-bold uppercase tracking-[4px]">
            Vehicle QR Safety System
          </p>
          <p className="text-white/40 text-xs sm:text-sm max-w-md mx-auto pt-2">
            Scan. Connect. Protect.
          </p>
          <p className="text-white/40 text-xs sm:text-sm max-w-md mx-auto">
            Please select your login type to continue to the system.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          {/* Admin Login Card */}
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between hover:border-amber-500/40 transition-all group">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-xl">
                ⚙️
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-amber-400 transition-colors">
                ADMIN LOGIN
              </h2>
              <p className="text-xs text-white/50 leading-relaxed">
                Manage users, plans & ID cards across the entire system console.
              </p>
            </div>
            <div className="pt-8">
              <button
                onClick={onSelectAdmin}
                className="w-full bg-amber-500 text-black font-black uppercase text-xs tracking-widest py-3.5 rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                LOGIN
              </button>
            </div>
          </div>

          {/* User Login Card */}
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between hover:border-amber-500/40 transition-all group">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-xl">
                👤
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-amber-400 transition-colors">
                USER LOGIN
              </h2>
              <p className="text-xs text-white/50 leading-relaxed">
                Create and manage your own digital ID card and verification QR codes.
              </p>
            </div>
            <div className="pt-8 space-y-3">
              <button
                onClick={onSelectUser}
                className="w-full bg-white text-black font-black uppercase text-xs tracking-widest py-3.5 rounded-xl hover:bg-white/90 transition-all shadow-lg active:scale-95"
              >
                LOGIN
              </button>
              <button
                onClick={onRegister}
                className="w-full bg-white/10 text-white font-black uppercase text-xs tracking-widest py-3.5 rounded-xl hover:bg-white/20 transition-all border border-white/10"
              >
                REGISTER
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] font-black uppercase tracking-[3px] text-white/20">
          ResQRide © Vehicle Safety Platform
        </p>
      </div>
    </div>
  );
}
