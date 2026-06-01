export function Header({ meta, username, isLive, onLeaveRoom, isDark }) {
  return (
    <header className={`sticky top-0 z-50 transition-colors duration-300 ${isDark ? 'bg-[#3b1278] border-b border-white/10' : 'bg-white border-b border-slate-100 shadow-sm'}`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl shadow-md ${isDark ? 'bg-white/20 shadow-black/20' : 'bg-emerald-600 text-white shadow-emerald-200'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isDark ? 'text-white' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className={`font-bold text-base md:text-lg leading-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span>{meta.title}</span>
              {isLive && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase animate-pulse">Live</span>
              )}
            </h1>
            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{meta.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {username && (
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${isDark ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-violet-300' : 'bg-emerald-500'}`}></span>
              <span>{username}</span>
            </div>
          )}
          {isLive && (
            <button
              onClick={onLeaveRoom}
              className={`px-3 py-1.5 rounded-xl transition text-xs font-medium ${isDark ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              Quitter le Salon
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
