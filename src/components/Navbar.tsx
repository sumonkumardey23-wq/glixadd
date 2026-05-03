import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { Home, Play, Wallet, Shield, LogOut, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { user, profile } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Earn', path: '/watch', icon: Play, primary: true },
    { name: 'Wallet', path: '/withdraw', icon: Wallet },
  ];

  if (profile?.isAdmin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <TrendingUp size={20} />
          </div>
          <span className="font-bold tracking-tight text-lg">GlixAdd</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end px-3 py-1 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-0.5">Your Balance</span>
            <span className="text-sm font-mono font-bold leading-tight text-black">৳{profile?.balance.toFixed(2)}</span>
          </div>
          
          <button 
            onClick={() => auth.signOut()}
            className="p-2.5 hover:bg-red-50 hover:text-red-600 rounded-2xl text-gray-400 transition-all border border-transparent hover:border-red-100"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Bottom Navigation (TikTok Style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto px-6 h-20 flex items-center justify-between">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center gap-1 transition-all duration-300 px-4",
                location.pathname === item.path ? "text-black scale-110" : "text-gray-300 hover:text-gray-500"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                item.primary && "bg-black text-white shadow-lg shadow-black/20 -mt-8 border-4 border-white p-4 scale-110",
                !item.primary && location.pathname === item.path && "bg-gray-100"
              )}>
                <item.icon size={item.primary ? 28 : 22} fill={location.pathname === item.path && !item.primary ? "currentColor" : "none"} />
              </div>
              {!item.primary && (
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  location.pathname === item.path ? "opacity-100" : "opacity-0"
                )}>
                  {item.name}
                </span>
              )}
              {item.primary && (
                <span className="text-[10px] font-black uppercase tracking-tighter text-black mt-1">EARN</span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
