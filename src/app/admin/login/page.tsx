'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/admin');
      } else {
        setError('Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu.');
      }
    } catch {
      setError('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] font-sans text-slate-300 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
              <span className="font-bold text-2xl">G</span>
            </div>
            <div className="text-left">
              <span className="text-2xl font-bold tracking-tighter text-white block">
                GOOD<span className="text-emerald-400 font-light">PICK</span> <span className="text-[9px] tracking-widest text-slate-500">CMS</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                Trung tâm quản trị affiliate
              </span>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-[#0a0a0c]/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Khu vực bảo mật
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Đăng nhập trang quản trị</h1>
            <p className="text-xs text-slate-400">
              Dùng tài khoản quản trị viên hoặc biên tập viên để quản lý sản phẩm, ưu đãi và nội dung tiếp thị.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 hover:scale-[1.02] disabled:opacity-50 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all mt-6 cursor-pointer"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Đăng nhập quản trị</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
