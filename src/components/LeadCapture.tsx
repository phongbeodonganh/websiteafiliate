'use client';

import React, { useState } from 'react';
import { Mail, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LeadCapture() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/public/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setMessage({ text: data.message, type: 'success' });
        setEmail('');
      } else {
        setMessage({ text: data.message || 'Subscription failed.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network connection error.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="my-16 relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-amber-950/40 via-[#0a0a0c] to-slate-900 border border-amber-500/30 p-8 lg:p-14 shadow-2xl backdrop-blur-xl">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-widest">
          <Sparkles size={14} /> VIP Insider Research Newsletter
        </div>

        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
          Get Institutional Crypto & Cloud Strategy <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500">Delivered Weekly</span>
        </h2>

        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Join 25,000+ investors receiving zero-noise market analytics, cold storage guides, and exclusive verified partner discounts directly to their inbox.
        </p>

        {message ? (
          <div
            className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <CheckCircle2 size={18} /> {message.text}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email address..."
                required
                className="w-full bg-slate-950 border border-slate-700/80 rounded-full pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 text-slate-950 font-bold text-sm hover:scale-105 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {loading ? 'Joining...' : 'Join Insider List'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium pt-2">
          <ShieldCheck size={14} className="text-amber-400" />
          <span>No Spam. Unsubscribe at any time. Your email is 100% confidential.</span>
        </div>
      </div>
    </section>
  );
}
