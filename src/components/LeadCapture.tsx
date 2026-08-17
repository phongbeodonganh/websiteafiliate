'use client';

import React, { useState } from 'react';
import { Mail, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface LeadCaptureProps {
  variant?: 'default' | 'editorial';
}

export default function LeadCapture({ variant = 'default' }: LeadCaptureProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const editorial = variant === 'editorial';

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
    } catch {
      setMessage({ text: 'Network connection error.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={editorial
      ? 'relative overflow-hidden bg-[#111111] border border-[#222222] rounded-xl px-8 py-12 lg:px-14 lg:py-16 text-white shadow-md'
      : 'my-16 relative rounded-[2.5rem] overflow-hidden bg-white border border-slate-100 p-8 lg:p-14 shadow-xl shadow-slate-200/50'}>
      {/* Soft Glow */}
      {!editorial && <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/60 rounded-full blur-[100px] pointer-events-none"></div>}

      <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
        <div className={editorial
          ? 'inline-flex items-center gap-2 border border-white px-4 py-1.5 text-xs font-semibold uppercase tracking-widest'
          : 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#0056B3] text-xs font-semibold uppercase tracking-widest'}>
          <Sparkles size={14} /> VIP AI Insider Research Newsletter
        </div>

        <h2 className={`text-3xl md:text-5xl font-extrabold leading-tight ${editorial ? 'text-white' : 'text-slate-900'}`}>
          Get Cutting-Edge AI Tools & Automation Case Studies <span className={editorial ? 'underline underline-offset-8' : 'bg-clip-text text-transparent bg-gradient-to-r from-[#0056B3] via-indigo-600 to-[#4F46E5]'}>Delivered Weekly</span>
        </h2>

        <p className={`${editorial ? 'text-neutral-300' : 'text-slate-600'} text-sm md:text-base max-w-xl mx-auto leading-relaxed`}>
          Join 25,000+ creators, marketers, and developers receiving zero-noise AI tool reviews, prompt frameworks, and exclusive partner discounts directly to their inbox.
        </p>

        {message ? (
          <div
            className={`p-4 border text-sm font-medium flex items-center justify-center gap-2 ${
              editorial
                ? 'border-white bg-white text-black'
                : message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <CheckCircle2 size={18} /> {message.text}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your work email address..."
                required
                className={editorial
                  ? 'w-full bg-white border border-white pl-12 pr-4 py-3.5 text-sm text-black placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black'
                  : 'w-full bg-slate-50 border border-slate-200 rounded-full pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0056B3] focus:bg-white shadow-inner'}
              />
            </div>
            {/* Coral Orange (#FF6B6B) CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className={editorial
                ? 'px-8 py-3.5 border border-white bg-white text-black font-bold text-sm hover:-translate-y-0.5 hover:scale-[1.02] disabled:opacity-50 transition-transform duration-150 flex items-center justify-center gap-2 cursor-pointer shrink-0'
                : 'px-8 py-3.5 rounded-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold text-sm hover:scale-105 shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0'}
            >
              {loading ? 'Joining...' : 'Join Insider List'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        <div className={`flex items-center justify-center gap-2 text-xs font-medium pt-2 ${editorial ? 'text-neutral-400' : 'text-slate-500'}`}>
          <ShieldCheck size={14} className={editorial ? 'text-white' : 'text-[#20C997]'} />
          <span>No Spam. Unsubscribe at any time. Your email is 100% confidential.</span>
        </div>
      </div>
    </section>
  );
}
