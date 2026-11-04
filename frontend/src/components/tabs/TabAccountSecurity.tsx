import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface TabAccountSecurityProps {
  currentUsername?: string;
  onUsernameUpdated?: (newUsername: string) => void;
  showToast: (msg: string) => void;
}

export const TabAccountSecurity: React.FC<TabAccountSecurityProps> = ({
  currentUsername = 'admin',
  onUsernameUpdated,
  showToast,
}) => {
  // State Form 1: Ubah Username
  const [newUsername, setNewUsername] = useState<string>(currentUsername);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState<boolean>(false);
  const [usernameMessage, setUsernameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State Form 2: Ubah Password (3 Form Input Sesuai Instruksi)
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handler Submit Ubah Username
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameMessage(null);

    const cleanUsername = newUsername.trim();
    if (!cleanUsername) {
      setUsernameMessage({ type: 'error', text: 'Username baru tidak boleh kosong.' });
      return;
    }

    if (cleanUsername === currentUsername) {
      setUsernameMessage({ type: 'error', text: 'Username baru sama dengan username saat ini.' });
      return;
    }

    if (cleanUsername.length < 3) {
      setUsernameMessage({ type: 'error', text: 'Username minimal terdiri dari 3 karakter.' });
      return;
    }

    setIsUpdatingUsername(true);
    try {
      const res = await fetch('/api/auth/profile/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername: cleanUsername }),
      });

      const data = await res.json();
      if (data.success) {
        const updatedUser = data.username || cleanUsername;
        setUsernameMessage({ type: 'success', text: data.message || 'Username berhasil diperbarui!' });
        showToast(`Username berhasil diubah menjadi "${updatedUser}"`);
        if (onUsernameUpdated) {
          onUsernameUpdated(updatedUser);
        }
      } else {
        setUsernameMessage({ type: 'error', text: data.error || 'Gagal mengubah username.' });
      }
    } catch {
      setUsernameMessage({ type: 'error', text: 'Terjadi gangguan jaringan saat menghubungi server.' });
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  // Handler Submit Ubah Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Password saat ini wajib diisi untuk verifikasi keamanan.' });
      return;
    }

    if (!newPassword) {
      setPasswordMessage({ type: 'error', text: 'Password baru wajib diisi.' });
      return;
    }

    if (!confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi password baru wajib diisi.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Password baru dan konfirmasi password tidak cocok!' });
      return;
    }

    if (newPassword.length < 5) {
      setPasswordMessage({ type: 'error', text: 'Password baru minimal 5 karakter.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/profile/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordMessage({
          type: 'success',
          text: data.message || 'Password berhasil diperbarui! Gunakan password baru ini untuk login berikutnya.',
        });
        showToast('Password toko Anda berhasil diperbarui!');
        // Reset kolom form password
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({
          type: 'error',
          text: data.error || 'Password saat ini tidak valid! Perubahan password gagal.',
        });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Terjadi gangguan jaringan saat menghubungi server.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isPasswordMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const isPasswordMismatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-50 text-[#0084D1] border border-sky-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Keamanan & Kredensial Akun</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kustomisasi nama pengguna (username) dan kata sandi (password) untuk login ke dashboard toko Anda.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Login Saat Ini: <strong className="text-slate-900 font-semibold">{currentUsername}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ======================================================== */}
        {/* 1. FORM UBAH USERNAME */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ubah Username Akun</h3>
                <p className="text-[11px] text-slate-500">Ganti nama pengguna yang digunakan saat masuk ke dashboard</p>
              </div>
            </div>

            {/* Pesan Feedback Username */}
            {usernameMessage && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  usernameMessage.type === 'success'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50/80 border-rose-200 text-rose-800'
                }`}
              >
                {usernameMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span className="leading-relaxed">{usernameMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUsername} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="font-mono text-xs font-bold">@</span>
                  </div>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Contoh: tokoberkah, dzakwanstore"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0084D1]/20 focus:border-[#0084D1] font-mono text-slate-800 bg-slate-50/50 hover:bg-white transition"
                    autoComplete="username"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Minimal 3 karakter. Hanya huruf, angka, titik, strip (-), atau underscore (_).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">Catatan:</p>
                <p>
                  Setelah username diubah, Anda dapat langsung login menggunakan username baru ini pada sesi berikutnya.
                </p>
              </div>

              <button
                type="submit"
                disabled={isUpdatingUsername || newUsername.trim() === currentUsername}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0084D1] hover:bg-[#0074B7] disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                {isUpdatingUsername ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan Username...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Username</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. FORM UBAH PASSWORD (3 KOLOM INPUT) */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ubah Password Akun</h3>
                <p className="text-[11px] text-slate-500">Wajib verifikasi password saat ini sebelum menentukan password baru</p>
              </div>
            </div>

            {/* Pesan Feedback Password */}
            {passwordMessage && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50/80 border-rose-200 text-rose-800'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span className="leading-relaxed">{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="mt-5 space-y-3.5">
              {/* Kolom 1: Password Saat Ini (Verifikasi) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Password Saat Ini <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password yang aktif saat ini"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0084D1]/20 focus:border-[#0084D1] text-slate-800 bg-slate-50/50 hover:bg-white transition"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showCurrentPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Verifikasi keamanan: jika password saat ini salah, password baru gagal diubah.
                </p>
              </div>

              {/* Kolom 2: Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru (min. 5 karakter)"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0084D1]/20 focus:border-[#0084D1] text-slate-800 bg-slate-50/50 hover:bg-white transition"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Kolom 3: Konfirmasi Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Konfirmasi Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru Anda"
                    className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 text-slate-800 transition ${
                      isPasswordMismatch
                        ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-400 bg-rose-50/30'
                        : isPasswordMatch
                        ? 'border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-200 focus:ring-[#0084D1]/20 focus:border-[#0084D1] bg-slate-50/50 hover:bg-white'
                    }`}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Indikator Kecocokan Password */}
                {isPasswordMismatch && (
                  <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Konfirmasi password belum cocok dengan password baru.
                  </p>
                )}
                {isPasswordMatch && (
                  <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Konfirmasi password cocok.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={
                  isUpdatingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  newPassword !== confirmPassword
                }
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                {isUpdatingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memverifikasi & Menyimpan Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Simpan Password Baru</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
