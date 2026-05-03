import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Send, CheckCircle, AlertCircle, History, ArrowRight } from 'lucide-react';
import { createWithdrawalRequest, subscribeToUserWithdrawals, getAppConfig } from '../firebase/services';
import { WithdrawalRequest, AppConfig } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export default function Withdraw() {
  const { profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [number, setNumber] = useState('');
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppConfig().then(setConfig);
    if (profile) {
      const unsub = subscribeToUserWithdrawals(profile.uid, setRequests);
      return () => unsub();
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !config) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < config.minWithdrawal) {
      setError(`Minimum withdrawal is ৳${config.minWithdrawal}`);
      return;
    }
    if (withdrawAmount > profile.balance) {
      setError('Insufficient balance.');
      return;
    }
    if (number.length < 11) {
      setError('Please enter a valid mobile number.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createWithdrawalRequest({
        uid: profile.uid,
        email: profile.email,
        amount: withdrawAmount,
        method,
        number,
        status: 'pending'
      });
      setSuccess(true);
      setAmount('');
      setNumber('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile || !config) return null;

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Withdraw Earnings</h1>
        <p className="text-gray-500">Fast and secure payouts to your mobile wallet.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-8 md:p-10 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                <Wallet size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available for Withdrawal</span>
                <span className="text-2xl font-mono font-bold leading-tight">৳{profile.balance.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 block">Select Payout Method</label>
                <div className="grid grid-cols-2 gap-4">
                  {(['bKash', 'Nagad'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={cn(
                        "py-4 rounded-2xl font-bold border-2 transition-all text-sm",
                        method === m 
                          ? "bg-black text-white border-black" 
                          : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 block">Mobile Wallet Number</label>
                <input
                  type="text"
                  placeholder="017XXXXXXXX"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl px-6 py-4 outline-none transition-all font-mono font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 block">Withdrawal Amount (Min. ৳{config.minWithdrawal})</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">৳</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-50 border-transparent focus:bg-white focus:border-black rounded-2xl pl-10 pr-6 py-4 outline-none transition-all font-mono font-semibold"
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 border border-red-100"
                  >
                    <AlertCircle size={18} />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-green-50 text-green-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 border border-green-100"
                  >
                    <CheckCircle size={18} />
                    Withdrawal request submitted successfully!
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                disabled={isLoading || profile.balance < config.minWithdrawal}
                type="submit"
                className="w-full bg-black text-white py-4 px-6 rounded-2xl font-bold hover:bg-gray-900 transition-all shadow-lg hover:shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    Submit Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* History Container */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <History size={20} className="text-gray-400" />
              <h2 className="font-bold">Recent Requests</h2>
            </div>

            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <History size={48} className="mb-4" />
                  <p className="text-sm font-medium">No withdrawal requests yet.</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="group p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-transparent hover:border-gray-200 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold">৳{req.amount.toFixed(2)}</span>
                        <span className={cn(
                          "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                          req.status === 'pending' ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                          req.status === 'approved' ? "bg-green-50 text-green-600 border-green-200" :
                          "bg-red-50 text-red-600 border-red-200"
                        )}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {req.number} • {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MMM dd, HH:mm') : 'Recently'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm">
                      {req.method[0]}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
