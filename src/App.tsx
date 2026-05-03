import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { UserProfile } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WatchAds from './pages/WatchAds';
import Withdraw from './pages/Withdraw';
import AdminDashboard from './pages/AdminDashboard';
import AdminSupport from './pages/AdminSupport';
import Navbar from './components/Navbar';
import SupportChat from './components/SupportChat';
import { motion, AnimatePresence } from 'motion/react';
import { getUserProfile, createUserProfile } from './firebase/services';
import { updateDoc } from 'firebase/firestore';

// --- Session Security Helper ---
const getDeviceId = () => {
  let id = localStorage.getItem('earn_rewards_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('earn_rewards_device_id', id);
  }
  return id;
};

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isMultiSession: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, isMultiSession: false });

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMultiSession, setIsMultiSession] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const deviceId = getDeviceId();
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Sync profile from Firestore
        const unsubProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            
            // Check if another device logged in
            if (data.lastLoginDeviceId && data.lastLoginDeviceId !== deviceId && !data.isAdmin) {
              setIsMultiSession(true);
            } else {
              setIsMultiSession(false);
            }

            // Update device ID if not set or different (only if we just logged in or session started)
            if (data.lastLoginDeviceId !== deviceId) {
              await updateDoc(userRef, { lastLoginDeviceId: deviceId });
            }
          } else {
            // New user, create profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              balance: 0,
              adsWatchedToday: 0,
              totalAdsWatched: 0,
              lastAdResetAt: new Date(),
              isBanned: false,
              isAdmin: firebaseUser.email === 'sumonkumardey23@gmail.com',
              createdAt: new Date(),
              lastLoginDeviceId: deviceId
            };
            await createUserProfile(newProfile);
            setProfile(newProfile);
          }
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
        setIsMultiSession(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isMultiSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Protected Route ---
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading, isMultiSession } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full"
      />
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} />;

  if (isMultiSession) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-semibold text-red-600 mb-2">Multiple Devices Detected</h1>
        <p className="text-gray-500 mb-6">Your account is logged in on another device. For security, please log out from other devices to continue.</p>
        <button onClick={() => auth.signOut()} className="bg-black text-white px-6 py-2 rounded-xl font-bold">Logout</button>
      </div>
    </div>
  );

  if (profile?.isBanned) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-semibold text-red-600 mb-2">Account Banned</h1>
        <p className="text-gray-500">Your account has been suspended for violating terms of service (VPN use or invalid activity detected).</p>
      </div>
    </div>
  );
  if (adminOnly && !profile?.isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-8 pb-32 max-w-4xl mx-auto"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
          <Navbar />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <PageWrapper><Dashboard /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/watch" element={
                <ProtectedRoute>
                  <PageWrapper><WatchAds /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/withdraw" element={
                <ProtectedRoute>
                  <PageWrapper><Withdraw /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <PageWrapper><AdminDashboard /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="/admin/support" element={
                <ProtectedRoute adminOnly>
                  <PageWrapper><AdminSupport /></PageWrapper>
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
          <SupportChat />
        </div>
      </AuthProvider>
    </Router>
  );
}
