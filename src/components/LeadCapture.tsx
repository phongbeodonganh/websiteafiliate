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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/public/insider', {
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
      className="my-16 relative overflow-hidden bg-[#111111] border border-white/15 p-8 sm:p-12 lg:p-14 text-white shadow-2xl transition-all duration-300"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* ── Left Column: Value Proposition & Editorial Summary ── */}
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 px-3.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-300">
            <span>Daily Intelligence Dispatch</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Stay Ahead of the AI Industry With a Daily Briefing
          </h2>

          <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed max-w-xl font-sans">
            Get a concise daily summary of the latest and hottest AI stories, plus selected editorial deal alerts.
          </p>

          {/* Key Editorial Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-neutral-300 border-t border-white/10">
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
        <div className="lg:col-span-5 bg-black/60 border border-white/20 p-6 sm:p-8 space-y-4 relative shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <Mail size={15} className="text-neutral-400" />
              <span>Join Insider List</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Free Dispatch</span>
          </div>

          {message ? (
            <div
              className={`p-4 border text-xs font-mono font-bold tracking-wide flex items-center justify-center gap-2 transition-all animate-in fade-in zoom-in-95 duration-200 ${
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
                className={`relative flex items-center bg-black border transition-all duration-300 ${
                  focused
                    ? 'border-white ring-2 ring-white/20 shadow-[0_0_25px_rgba(255,255,255,0.15)] bg-neutral-950'
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
                className="w-full group relative overflow-hidden bg-white text-black font-extrabold text-xs uppercase tracking-wider py-3 transition-all duration-200 hover:bg-neutral-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border border-white"
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
