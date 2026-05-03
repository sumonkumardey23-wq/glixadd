import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  ShieldCheck, 
  Clock, 
  ChevronRight,
  Inbox,
  Filter
} from 'lucide-react';
import { 
  subscribeToAllSupportTickets, 
  subscribeToMessages, 
  sendMessage 
} from '../firebase/services';
import { cn, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminSupport() {
  const { profile: adminProfile, loading } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !adminProfile?.isAdmin) return;

    const unsub = subscribeToAllSupportTickets((data) => {
      setTickets(data);
    });
    return () => unsub();
  }, [adminProfile, loading]);

  useEffect(() => {
    if (loading || !selectedTicket || !adminProfile?.isAdmin) return;
    const unsub = subscribeToMessages(selectedTicket.uid, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [selectedTicket, adminProfile, loading]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    await sendMessage(selectedTicket.uid, replyText.trim(), 'admin');
    setReplyText('');
  };

  const filteredTickets = tickets.filter(t => 
    t.userName.toLowerCase().includes(search.toLowerCase()) || 
    t.userEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 -mt-4">
      {/* Sidebar: Ticket List */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Support Inbox</h2>
            <div className="bg-gray-50 px-3 py-1 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Filter size={10} /> Active
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-3 text-sm focus:ring-2 ring-black transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-10 text-center space-y-4 opacity-30">
              <Inbox size={48} className="mx-auto" />
              <p className="text-sm font-bold uppercase tracking-widest">No messages found</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "w-full text-left p-6 transition-all border-b border-gray-50 hover:bg-gray-50/50 flex flex-col gap-2 relative",
                  selectedTicket?.id === ticket.id ? "bg-black text-white" : "text-black"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <User size={14} className={selectedTicket?.id === ticket.id ? "text-white/40" : "text-gray-400"} />
                    <span className="text-sm font-bold truncate max-w-[150px]">{ticket.userName}</span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
                    ticket.status === 'open' ? "bg-red-500 text-white" : "bg-green-500 text-white"
                  )}>
                    {ticket.status}
                  </span>
                </div>
                <p className={cn(
                  "text-xs line-clamp-1",
                  selectedTicket?.id === ticket.id ? "text-white/60" : "text-gray-400"
                )}>
                  {ticket.lastMessage}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-tighter",
                    selectedTicket?.id === ticket.id ? "text-white/30" : "text-gray-300"
                  )}>
                    {ticket.userEmail}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock size={10} className={selectedTicket?.id === ticket.id ? "text-white/30" : "text-gray-300"} />
                    <span className={cn("text-[9px] font-bold uppercase tracking-tighter", selectedTicket?.id === ticket.id ? "text-white/30" : "text-gray-300")}>
                      {ticket.updatedAt && format(ticket.updatedAt.toDate(), 'HH:mm')}
                    </span>
                  </div>
                </div>
                {selectedTicket?.id === ticket.id && (
                  <motion.div layoutId="active-indicator" className="absolute right-0 top-0 bottom-0 w-1 bg-white" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Support Window */}
      <div className="flex-1 flex flex-col bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold">
                  {selectedTicket.userName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold">{selectedTicket.userName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{selectedTicket.userEmail}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID: {selectedTicket.uid}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-xl border border-gray-100 text-gray-400 hover:text-black transition-colors">
                  <ShieldCheck size={20} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-10 space-y-6"
            >
              <div className="flex flex-col items-center mb-10">
                <div className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Chat started on {selectedTicket.createdAt && format(selectedTicket.createdAt.toDate(), 'MMM dd, yyyy')}
                </div>
              </div>

              {messages.map((m, i) => (
                <div 
                  key={i}
                  className={cn(
                    "flex flex-col max-w-[70%]",
                    m.sender === 'admin' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-5 rounded-[28px] text-sm leading-relaxed shadow-sm",
                    m.sender === 'admin' ? "bg-black text-white rounded-br-none" : 
                    m.sender === 'ai' ? "bg-blue-50 text-blue-800 border border-blue-100 rounded-bl-none" :
                    "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                  )}>
                    {m.text}
                  </div>
                  <span className="text-[9px] text-gray-300 mt-2 uppercase font-black tracking-tighter flex items-center gap-2">
                    {m.sender === 'admin' ? <ShieldCheck size={10} /> : m.sender === 'ai' ? <Bot size={10} /> : <User size={10} />}
                    {m.sender.toUpperCase()} • {m.createdAt && format(m.createdAt.toDate(), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>

            {/* Admin Input */}
            <form onSubmit={handleReply} className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
              <input 
                type="text"
                placeholder="Type reply to user..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-white border-none rounded-3xl px-8 py-5 text-sm focus:ring-2 ring-black shadow-sm transition-all"
              />
              <button 
                type="submit"
                disabled={!replyText.trim()}
                className="w-16 h-16 bg-black text-white rounded-3xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-black/10"
              >
                <Send size={24} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-20">
            <MessageSquare size={100} className="mb-6 stroke-[1]" />
            <h2 className="text-3xl font-black uppercase tracking-tighter">Support Console</h2>
            <p className="max-w-[300px] font-bold text-xs uppercase tracking-widest mt-4">Select a ticket from the left to start responding to user queries.</p>
          </div>
        )}
      </div>
    </div>
  );
}
