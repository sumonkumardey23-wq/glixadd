import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { motion } from 'motion/react';
import { TrendingUp, Mail } from 'lucide-react';
import { useAuth } from '../App';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user } = useAuth();
  
  if (user) return <Navigate to="/" />;

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-[calc(100-64px)] flex items-center justify-center p-6 bg-gradient-to-b from-[#f5f5f5] to-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white mb-8 shadow-xl shadow-black/20">
          <TrendingUp size={32} />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight mb-3">Welcome to GlixAdd</h1>
        <p className="text-gray-500 mb-10 text-balance leading-relaxed">
          Start earning money today by watching short advertisements. 
          The most reliable ad-earning platform in Bangladesh.
        </p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 px-6 rounded-2xl font-bold hover:bg-gray-900 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/10 group"
        >
          <Mail size={20} className="group-hover:rotate-12 transition-transform" />
          Continue with Google
        </button>

        <p className="mt-8 text-xs text-gray-400 max-w-[280px]">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
