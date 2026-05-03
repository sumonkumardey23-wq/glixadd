import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { 
  Users, 
  Wallet, 
  Settings, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Search,
  ExternalLink,
  ChevronDown,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getAppConfig, 
  updateAppConfig, 
  subscribeToAllUsers, 
  subscribeToAllWithdrawals,
  updateWithdrawalStatus,
  toggleUserBan,
  subscribeToAllSupportTickets
} from '../firebase/services';
import { AppConfig, UserProfile, WithdrawalRequest } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { profile: adminProfile, loading } = useAuth();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'withdrawals' | 'settings'>('withdrawals');
  const [search, setSearch] = useState('');
  const [supportCount, setSupportCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !adminProfile?.isAdmin) return;
    
    getAppConfig().then(setConfig);
    const unsubUsers = subscribeToAllUsers(setUsers);
    const unsubWithdrawals = subscribeToAllWithdrawals(setWithdrawals);
    const unsubSupport = subscribeToAllSupportTickets((tickets) => {
      setSupportCount(tickets.filter(t => t.status === 'open').length);
    });
    return () => {
      unsubUsers();
      unsubWithdrawals();
      unsubSupport();
    };
  }, [adminProfile, loading]);

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config) {
      setSaving(true);
      try {
        await updateAppConfig(config);
        alert('Settings updated successfully!');
      } catch (error) {
        console.error("Save Error:", error);
        alert('Failed to update settings. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    u.uid.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWithdrawals = withdrawals.filter(w => 
    w.email.toLowerCase().includes(search.toLowerCase()) || 
    w.number.includes(search)
  );

  if (!adminProfile?.isAdmin) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Admin Control</h1>
          <p className="text-gray-500 font-mono text-sm italic py-1 opacity-60 uppercase tracking-widest text-[10px]">Secure Core / System Oversight</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('withdrawals')}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              activeTab === 'withdrawals' ? "bg-black text-white" : "bg-white text-gray-400 hover:text-black"
            )}
          >
            Withdrawals
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              activeTab === 'users' ? "bg-black text-white" : "bg-white text-gray-400 hover:text-black"
            )}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 rounded-xl font-bold text-sm transition-all",
              activeTab === 'settings' ? "bg-black text-white" : "bg-white text-gray-400 hover:text-black"
            )}
          >
            Settings
          </button>
          <Link 
            to="/admin/support"
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
          >
            <MessageSquare size={16} />
            Support {supportCount > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{supportCount}</span>}
          </Link>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'settings' && config && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
               <Settings size={24} className="text-gray-400" />
               <h2 className="text-2xl font-bold">System Configuration</h2>
            </div>
            
            <form onSubmit={handleUpdateConfig} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Monetag Ad Unit ID</label>
                <input 
                  type="text" 
                  value={config.monetagAdUnitId}
                  onChange={e => setConfig({...config, monetagAdUnitId: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 ring-black font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Reward Per Ad (BDT)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={config.rewardPerAd || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, rewardPerAd: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 ring-black font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Min. Withdrawal (BDT)</label>
                <input 
                  type="number" 
                  value={config.minWithdrawal || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setConfig({...config, minWithdrawal: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 ring-black font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Daily Ad Limit</label>
                <input 
                  type="number" 
                  value={config.dailyAdLimit || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    setConfig({...config, dailyAdLimit: isNaN(val) ? 0 : val});
                  }}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 ring-black font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Telegram Channel/Page Link</label>
                <input 
                  type="url" 
                  placeholder="https://t.me/..."
                  value={config.telegramLink || ''}
                  onChange={e => setConfig({...config, telegramLink: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 ring-black font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Facebook Group/Page Link</label>
                <input 
                  type="url" 
                  placeholder="https://facebook.com/..."
                  value={config.facebookLink || ''}
                  onChange={e => setConfig({...config, facebookLink: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 ring-black font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">News Ticker / Announcement</label>
                <textarea 
                  placeholder="Enter news text here (e.g. নতুন আপডেট আসছে! ২৫ তারিখ পেমেন্ট করা হবে...)"
                  value={config.announcement || ''}
                  onChange={e => setConfig({...config, announcement: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 ring-black font-medium h-24"
                />
              </div>
              <div className="md:col-span-2 pt-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-900 transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Saving...
                    </>
                  ) : (
                    'Save All Changes'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {(activeTab === 'users' || activeTab === 'withdrawals') && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[32px] pl-16 pr-6 py-6 shadow-sm outline-none focus:border-black transition-all font-medium"
              />
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-gray-50 border-b border-gray-100">
                     <tr>
                       {activeTab === 'withdrawals' ? (
                         <>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">User / Contact</th>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Amount</th>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Method</th>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Status</th>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Actions</th>
                         </>
                       ) : (
                         <>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">User</th>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Balance</th>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Stats</th>
                           <th className="px-8 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Status</th>
                         </>
                       )}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {activeTab === 'withdrawals' ? (
                       filteredWithdrawals.map(w => (
                         <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-8 py-6">
                             <div className="font-bold">{w.email}</div>
                             <div className="text-xs text-gray-400 font-mono">{w.number}</div>
                           </td>
                           <td className="px-8 py-6 font-mono font-bold text-lg">৳{w.amount.toFixed(2)}</td>
                           <td className="px-8 py-6">
                             <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold">{w.method}</span>
                           </td>
                           <td className="px-8 py-6">
                             <div className={cn(
                               "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
                               w.status === 'pending' ? "bg-yellow-50 text-yellow-600" :
                               w.status === 'approved' ? "bg-green-50 text-green-600" :
                               "bg-red-50 text-red-600"
                             )}>
                               <span className="w-2 h-2 rounded-full bg-current" />
                               {w.status.toUpperCase()}
                             </div>
                           </td>
                           <td className="px-8 py-6">
                              {w.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => updateWithdrawalStatus(w.id!, 'approved')}
                                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Approve"
                                  >
                                    <CheckCircle size={20} />
                                  </button>
                                  <button 
                                    onClick={() => updateWithdrawalStatus(w.id!, 'rejected', w.uid, w.amount)}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Reject & Refund"
                                  >
                                    <XCircle size={20} />
                                  </button>
                                </div>
                              )}
                           </td>
                         </tr>
                       ))
                     ) : (
                       filteredUsers.map(u => (
                         <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                           <td className="px-8 py-6">
                             <div className="font-bold">{u.displayName}</div>
                             <div className="text-xs text-gray-400 font-mono">{u.email}</div>
                           </td>
                           <td className="px-8 py-6 font-mono font-bold">৳{u.balance.toFixed(2)}</td>
                           <td className="px-8 py-6">
                             <div className="text-xs font-medium">Daily: <span className="text-black font-bold font-mono">{u.adsWatchedToday}</span></div>
                             <div className="text-xs font-medium text-gray-400">Total: {u.totalAdsWatched}</div>
                           </td>
                           <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                               {u.isBanned ? (
                                 <span className="text-red-600 flex items-center gap-1 font-bold text-xs">
                                   <ShieldAlert size={14} /> BANNED
                                 </span>
                               ) : (
                                 <span className="text-green-600 font-bold text-xs uppercase tracking-widest">Active</span>
                               )}
                               
                               {!u.isAdmin && (
                                <button 
                                  onClick={() => toggleUserBan(u.uid, !u.isBanned)}
                                  className={cn(
                                    "px-3 py-1 rounded-lg text-[10px] font-bold transition-colors",
                                    u.isBanned ? "bg-black text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
                                  )}
                                >
                                  {u.isBanned ? 'UNBAN' : 'BAN USER'}
                                </button>
                               )}
                             </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
               
               {(activeTab === 'users' ? filteredUsers : filteredWithdrawals).length === 0 && (
                 <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="font-semibold uppercase tracking-widest text-[10px]">No Record Found</p>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
