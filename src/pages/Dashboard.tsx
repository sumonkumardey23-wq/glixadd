import { useAuth } from '../App';
import { motion } from 'motion/react';
import { Megaphone, TrendingUp, Clock, Target, Calendar, ChevronRight, Play, Wallet, Send, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { differenceInHours } from 'date-fns';
import { useEffect, useState } from 'react';
import { resetDailyLimit, getAppConfig } from '../firebase/services';
import { AppConfig } from '../types';

export default function Dashboard() {
  const { profile } = useAuth();
  const [shouldReset, setShouldReset] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    getAppConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (profile?.lastAdResetAt) {
      const lastReset = profile.lastAdResetAt.toDate?.() || new Date(profile.lastAdResetAt);
      const hoursSinceReset = differenceInHours(new Date(), lastReset);
      if (hoursSinceReset >= 24) {
        setShouldReset(true);
      }
    }
  }, [profile]);

  const handleReset = async () => {
    if (profile) {
      await resetDailyLimit(profile.uid);
      setShouldReset(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 pb-32">
      {/* News Ticker */}
      {config?.announcement && (
        <div className="bg-black text-white py-3 overflow-hidden whitespace-nowrap relative flex items-center rounded-2xl shadow-xl">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-black z-10 flex items-center font-bold text-xs uppercase tracking-tighter border-r border-white/10 uppercase">
            <Megaphone size={14} className="mr-2 text-yellow-400" />
            Notice
          </div>
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{ 
              repeat: Infinity, 
              duration: 25, 
              ease: "linear" 
            }}
            className="pl-[100px] flex gap-20"
          >
            <span className="text-sm font-medium tracking-wide">
              {config.announcement}
            </span>
            <span className="text-sm font-medium tracking-wide">
              {config.announcement}
            </span>
            <span className="text-sm font-medium tracking-wide">
              {config.announcement}
            </span>
          </motion.div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Hi, {profile.displayName}</h1>
          <p className="text-gray-500 mt-1">Check out your earnings summary for today.</p>
        </div>
        <div className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm self-start md:self-auto">
          ID: {profile.uid.slice(0, 8)}...
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-black text-white p-8 rounded-[32px] shadow-2xl shadow-black/20 overflow-hidden relative"
        >
          <div className="relative z-10">
            <span className="text-white/60 text-sm font-semibold uppercase tracking-widest">Total Balance</span>
            <div className="text-5xl font-mono font-bold mt-2">৳{profile.balance.toFixed(2)}</div>
            <Link 
              to="/withdraw"
              className="mt-8 inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all text-sm group"
            >
              Withdraw Funds
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <TrendingUp className="absolute -bottom-6 -right-6 w-48 h-48 text-white/5 rotate-12" />
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
              <Target size={20} />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold mt-4">{profile.adsWatchedToday}/400</div>
              <p className="text-xs font-semibold text-gray-400 uppercase mt-1">Today's Ads</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold mt-4">{profile.totalAdsWatched}</div>
              <p className="text-xs font-semibold text-gray-400 uppercase mt-1">Lifetime Ads</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Alert */}
      {shouldReset && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-yellow-50 border border-yellow-200 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-bold text-yellow-900">New Day, New Rewards!</h3>
              <p className="text-sm text-yellow-800/80">Your daily limit of 400 ads has been reset. Refresh now to start earning.</p>
            </div>
          </div>
          <button 
            onClick={handleReset}
            className="bg-yellow-400 text-yellow-950 px-6 py-3 rounded-2xl font-bold hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-400/20"
          >
            Refresh Limit
          </button>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-1">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/watch" className="group">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group-hover:border-black transition-all group-hover:scale-[1.01]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                  <Play size={24} fill="currentColor" />
                </div>
                <div>
                  <h3 className="font-bold">Start Earning</h3>
                  <p className="text-xs text-gray-400">Earn ৳0.10 for every ad</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
          <Link to="/withdraw" className="group">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group-hover:border-black transition-all group-hover:scale-[1.01]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all">
                  <Wallet size={24} />
                </div>
                <div>
                  <h3 className="font-bold">Withdraw Balance</h3>
                  <p className="text-xs text-gray-400">Minimum ৳200 required</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>
      </div>

      {/* Community Links */}
      {(config?.telegramLink || config?.facebookLink) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold px-1 uppercase tracking-tight">Our Community</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config.telegramLink && (
              <a 
                href={config.telegramLink} 
                target="_blank" 
                rel="noreferrer"
                className="bg-[#0088cc] text-white p-6 rounded-[32px] flex items-center justify-between hover:scale-[1.02] transition-transform shadow-xl shadow-[#0088cc]/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Send size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Telegram Channel</h3>
                    <p className="text-xs text-white/80">Get the latest updates</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-white/60" />
              </a>
            )}
            {config.facebookLink && (
              <a 
                href={config.facebookLink} 
                target="_blank" 
                rel="noreferrer"
                className="bg-[#1877F2] text-white p-6 rounded-[32px] flex items-center justify-between hover:scale-[1.02] transition-transform shadow-xl shadow-[#1877F2]/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    <Facebook size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Facebook Group</h3>
                    <p className="text-xs text-white/80">Join the discussion</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-white/60" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
