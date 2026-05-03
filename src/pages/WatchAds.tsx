import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Timer, Trophy, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { recordAdWatch, getAppConfig } from '../firebase/services';
import { AppConfig } from '../types';

export default function WatchAds() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isRewarded, setIsRewarded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getAppConfig().then(setConfig);
  }, []);

  const startAd = () => {
    if (!profile || (profile.adsWatchedToday >= (config?.dailyAdLimit || 400))) {
      setError('You have reached your daily limit of 400 ads.');
      return;
    }
    
    setIsPlaying(true);
    setTimeLeft(config?.adTimerSeconds || 15);
    setIsRewarded(false);
    setError(null);

    // Inject Monetag Script
    const script = document.createElement('script');
    script.src = `https://alwingulla.com/88/tag.min.js`; 
    script.dataset.zone = config.monetagAdUnitId || '2849746';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    document.body.appendChild(script);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAdComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up script after some time
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  };

  const handleAdComplete = async () => {
    if (profile && config) {
      try {
        await recordAdWatch(profile.uid, config.rewardPerAd);
        setIsRewarded(true);
        setTimeout(() => {
          setIsPlaying(false);
          setIsRewarded(false);
        }, 3000);
      } catch (err) {
        setError('Failed to record reward. Please try again.');
        setIsPlaying(false);
      }
    }
  };

  const cancelAd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setError('Ad interrupted. No reward granted.');
  };

  if (!profile || !config) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-balance">Watch Ads & Earn</h1>
        <p className="text-gray-500">Earn ৳{config.rewardPerAd.toFixed(2)} by watching short ads.</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col items-center">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-full" />
          <div 
            className="absolute inset-0 border-4 border-black rounded-full transition-all duration-300" 
            style={{ clipPath: `inset(0 0 0 ${Math.max(0, 100 - (profile.adsWatchedToday / config.dailyAdLimit) * 100)}%)` }}
          />
          <Trophy size={40} className="text-black" />
        </div>
        
        <div className="text-center">
          <div className="text-4xl font-mono font-bold leading-none">{profile.adsWatchedToday} / {config.dailyAdLimit}</div>
          <p className="text-xs font-semibold text-gray-400 uppercase mt-2 tracking-widest">Daily Limit Status</p>
        </div>

        <div className="w-full mt-10 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-3xl text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Per Ad</span>
            <span className="text-sm font-bold">৳0.10</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-3xl text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Max Daily</span>
            <span className="text-sm font-bold">৳40.00</span>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex flex-col items-center gap-4">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100 mb-2"
          >
            <AlertTriangle size={18} />
            {error}
          </motion.div>
        )}

        <button
          disabled={isPlaying || profile.adsWatchedToday >= config.dailyAdLimit}
          onClick={startAd}
          className="group relative w-full sm:w-64 h-64 bg-black text-white rounded-[64px] flex flex-col items-center justify-center gap-4 overflow-hidden shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:bg-gray-200 disabled:text-gray-400"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play size={40} fill="currentColor" />
          </div>
          <span className="text-lg font-bold">Show Ad</span>
        </button>
        
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
          Please stay on page for 15 seconds
        </p>
      </div>

      {/* Ad Modal Overlay */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="absolute top-8 right-8">
               <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full font-mono font-bold flex items-center gap-3 border border-white/10">
                 <Timer size={20} className="text-yellow-400" />
                 <span className="text-xl">{timeLeft}s</span>
               </div>
            </div>

            <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[48px] p-12 flex flex-col items-center">
              {isRewarded ? (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/50">
                    <CheckCircle size={56} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold">Reward Given!</h2>
                    <p className="text-green-400 font-mono font-bold">+৳0.10 Added</p>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="w-24 h-24 border-4 border-white/10 border-t-white rounded-full animate-spin mb-10" />
                  <h2 className="text-2xl font-bold mb-4">Ad Processing...</h2>
                  <p className="text-white/40 text-sm leading-relaxed mb-8">
                    Do not close this window. Your reward will be added automatically when the timer ends.
                  </p>
                  
                  <div className="bg-white/10 p-6 rounded-3xl border border-white/5 space-y-3">
                    <p className="text-xs font-bold text-white/60 uppercase">Trouble seeing the ad?</p>
                    <p className="text-[10px] text-white/30">If the ad doesn't appear, please disable AdBlocker or try opening the app in a <strong>New Tab</strong>.</p>
                  </div>
                </>
              )}
            </div>

            {timeLeft > 0 && !isRewarded && (
              <button 
                onClick={cancelAd}
                className="mt-12 text-sm font-bold text-white/20 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
              >
                Cancel & Close
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
