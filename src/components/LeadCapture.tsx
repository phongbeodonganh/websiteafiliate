'use client';

import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, Check, ShieldCheck, Mail } from 'lucide-react';

interface LeadCaptureProps {
  variant?: 'default' | 'editorial';
}

export default function LeadCapture({ variant = 'editorial' }: LeadCaptureProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
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
      setMessage({ text: 'Network connection error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="newsletter-section"
      data-motion="fade"
      className={editorial
        ? 'relative h-full overflow-hidden bg-white/[0.04] border border-white/15 p-6 md:p-8 text-white'
        : 'my-16 relative overflow-hidden bg-[#111111] border border-white/15 p-8 sm:p-12 lg:p-14 text-white'}
    >
      <div className={editorial ? 'h-full flex flex-col gap-7 relative z-10' : 'max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10'}>
        {/* ── Left Column: Value Proposition & Editorial Summary ── */}
        <div className={editorial ? 'space-y-4' : 'lg:col-span-7 space-y-5'}>
          <div className={`inline-flex items-center gap-2 border bg-white/5 px-3.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest ${editorial ? 'border-[#85DDD5]/35 text-[#85DDD5]' : 'border-white/20 text-neutral-300'}`}>
            <span>Weekly Intelligence Dispatch</span>
          </div>

          <h2 className={`${editorial ? 'text-2xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-extrabold tracking-tight leading-tight text-white font-['Plus_Jakarta_Sans',sans-serif]`}>
            Get the signal before the week gets noisy.
          </h2>

          <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed max-w-xl font-sans">
            Join tech leaders, founders, and developers receiving <strong className="text-white font-semibold">zero-noise tool audits</strong>, workflow blueprints, and editorial deal alerts.
          </p>

          {/* Key Editorial Highlights Grid */}
          <div className={`${editorial ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 sm:grid-cols-3 gap-3'} pt-3 text-xs text-neutral-300 border-t border-white/10`}>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-neutral-400 shrink-0" />
              <span>Zero-Noise Audits</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-neutral-400 shrink-0" />
              <span>Exclusive Deals</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-neutral-400 shrink-0" />
              <span>100% Free Access</span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Interactive Subscription Form Card ── */}
        <div className={`${editorial ? 'mt-auto bg-black/25 border-[#85DDD5]/20 p-5 md:p-6' : 'lg:col-span-5 bg-black/60 border-white/20 p-6 sm:p-8'} border space-y-4 relative`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <Mail size={15} className="text-neutral-400" />
              <span>Join Insider List</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Free Dispatch</span>
          </div>

          {message ? (
            <div
              className={`p-4 border text-xs font-mono font-bold tracking-wide flex items-center justify-center gap-2 transition-colors duration-200 ${
                message.type === 'success'
                  ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-400 bg-rose-950/40 text-rose-300'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div
                className={`relative flex items-center bg-black border transition-colors duration-200 ${
                  focused
                    ? editorial ? 'border-[#85DDD5] ring-1 ring-[#85DDD5]/25 bg-neutral-950' : 'border-white ring-1 ring-white/25 bg-neutral-950'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Enter your work email address..."
                  required
                  className="w-full bg-transparent px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none font-medium transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full group relative overflow-hidden font-extrabold text-xs uppercase tracking-wider py-3 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border ${editorial ? 'bg-[#85DDD5] border-[#85DDD5] text-[#071211] hover:bg-white hover:border-white' : 'bg-white text-black border-white hover:bg-neutral-200'}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-black" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe Now</span>
                    <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-1 border-t border-white/10">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-neutral-400" /> Confidential
            </span>
            <span>Unsubscribe Anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
