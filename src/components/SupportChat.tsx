import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { sendMessage, subscribeToMessages } from '../firebase/services';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

export default function SupportChat() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for user and profile to load
    if (!user || !profile || profile.isAdmin) return;
    
    const unsub = subscribeToMessages(user.uid, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [user, profile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !profile) return;

    const userText = input.trim();
    setInput('');
    
    try {
      // 1. Send user message to Firestore
      await sendMessage(user.uid, userText, 'user', profile);
      setIsTyping(true);

      // 2. AI Response
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("AI Key is missing.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const appKnowledge = `
        Platform: GlixAdd (Bangladeshi Ad-Earning Platform)
        Reward: 0.10 BDT (৳) per ad. Daily Limit: 400 ads (Max 40 ৳/day).
        Min Withdrawal: 200 BDT (৳). Methods: bKash, Nagad.
        Troubleshoot: If ads don't show, tell users to "Disable AdBlockers".
        Rules: 1 account per person. Bots = Ban.
        Current User: Balance ${profile.balance} ৳, Ads today ${profile.adsWatchedToday}/400.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Context: ${appKnowledge}\nUser Question: ${userText}\n\nRespond politely in Bengali. Be very concise.`,
      });

      const aiText = response.text || "দুঃখিত, আমি ঠিক বুঝতে পারছি না। একজন এডমিন শীঘ্রই আপনার সাথে যোগাযোগ করবে।";
      await sendMessage(user.uid, aiText, 'ai', profile);
    } catch (error) {
      console.error("Chat Error:", error);
      await sendMessage(user.uid, "এই মুহূর্তে এআই সংযোগ বিচ্ছিন্ন আছে। দয়া করে এডমিনের উত্তরের জন্য অপেক্ষা করুন।", 'ai', profile);
    } finally {
      setIsTyping(false);
    }
  };

  if (!user || !profile || profile.isAdmin) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] h-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-black p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold">AI Support</h3>
                  <p className="text-[10px] text-white/60 uppercase tracking-widest leading-none mt-1">Always Active</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50"
            >
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <MessageCircle size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">How can I help you today?</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    m.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    m.sender === 'user' ? "bg-black text-white rounded-br-none" : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-none"
                  )}>
                    {m.text}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">
                    {m.sender === 'ai' ? 'AI Assistant' : m.sender === 'admin' ? 'Admin' : 'You'}
                  </span>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 italic text-xs flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    AI is thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 ring-black"
                disabled={isTyping}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90",
          isOpen ? "bg-white text-black rotate-90" : "bg-black text-white"
        )}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
}
