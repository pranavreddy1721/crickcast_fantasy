import { Outlet, Link, useLocation } from "react-router";
import { Trophy, Settings } from "lucide-react";

export default function RootLayout() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-cyan-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  CrickCast Fantasy
                </h1>
                <p className="text-xs text-slate-400">Auction League</p>
              </div>
            </div>
            
            <nav className="flex gap-2">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg transition-all ${
                  location.pathname === "/"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50"
                }`}
              >
                Leaderboard
              </Link>
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  location.pathname === "/admin"
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50"
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800 bg-slate-950/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          <p>© 2026 CrickCast Fantasy Auction. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
