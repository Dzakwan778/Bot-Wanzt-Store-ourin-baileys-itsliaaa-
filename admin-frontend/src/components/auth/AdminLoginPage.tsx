import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { MasterAdminProfile } from '../../utils/adminAuth.ts';

interface AdminLoginPageProps {
  initialNotice?: string | null;
  onLoginSuccess: (token: string, admin: MasterAdminProfile) => void;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function AdminLoginPage({ initialNotice, onLoginSuccess }: AdminLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || lockoutSeconds > 0) return;

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setErrorMessage('Username dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.token) {
        if (res.status === 429 && typeof data.remainingSeconds === 'number' && data.remainingSeconds > 0) {
          setLockoutSeconds(Math.ceil(data.remainingSeconds));
        }
        setErrorMessage(data.message || 'Username atau password tidak valid.');
        return;
      }

      onLoginSuccess(data.token, data.admin);
    } catch {
      setErrorMessage('Gagal terhubung ke server autentikasi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLocked = lockoutSeconds > 0;

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-800 flex flex-col justify-center items-center px-4 py-10 font-sans antialiased">
      <div className="w-full max-w-md space-y-6">
        {/* Identitas Brand */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0084D1] to-sky-400 text-white flex items-center justify-center shadow-md shadow-[#0084D1]/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/80 text-[11px] font-semibold text-[#0084D1] mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Terproteksi Master Admin</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Wanzt Apartemen
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Masuk untuk mengelola tenant, bot, dan pengaturan sistem pusat
            </p>
          </div>
        </div>

        {/* Kartu Login */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-7 space-y-5">
          {initialNotice && !errorMessage && !isLocked && (
            <div
              role="status"
              className="px-3.5 py-2.5 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-800 text-xs flex items-start gap-2.5"
            >
              <Info className="w-4 h-4 text-[#0084D1] shrink-0 mt-0.5" />
              <span>{initialNotice}</span>
            </div>
          )}

          {isLocked ? (
            <div
              role="alert"
              data-testid="admin-login-lockout"
              className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5"
            >
              <div className="flex items-center gap-2 font-bold">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Akses Login Dikunci Sementara</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Terlalu banyak percobaan login gagal. Silakan tunggu hingga penghitung waktu selesai sebelum mencoba kembali.
              </p>
              <div className="pt-1 font-mono text-sm font-bold text-amber-950">
                Sisa waktu: {formatCountdown(lockoutSeconds)}
              </div>
            </div>
          ) : (
            errorMessage && (
              <div
                role="alert"
                data-testid="admin-login-error"
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-login-username"
                className="block text-xs font-semibold text-slate-700"
              >
                Username Master Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-login-username"
                  data-testid="admin-login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={submitting || isLocked}
                  placeholder="Masukkan username"
                  className="w-full h-10 pl-10 pr-3.5 text-sm text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 outline-hidden transition disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="admin-login-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-login-password"
                  data-testid="admin-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={submitting || isLocked}
                  placeholder="Masukkan password"
                  className="w-full h-10 pl-10 pr-10 text-sm text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/15 outline-hidden transition disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={submitting || isLocked}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="admin-login-submit"
              disabled={submitting || isLocked}
              className="w-full h-10 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-semibold shadow-sm shadow-[#0084D1]/20 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.99] disabled:opacity-55 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : isLocked ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Terkunci ({formatCountdown(lockoutSeconds)})</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk ke Dashboard Master</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sesi berlaku otomatis 7 hari</span>
            <span>Maks. 5x gagal login</span>
          </div>
        </div>

        {/* Tautan kembali ke Web Toko */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0084D1] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard Web Toko</span>
          </a>
        </div>
      </div>
    </div>
  );
}
