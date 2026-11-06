import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  ExternalLink,
  Calendar,
  PauseCircle,
  PlayCircle,
  Trash2,
  RefreshCw,
  Store,
  CheckCircle2,
  XCircle,
  Phone,
  KeyRound,
  FileText,
  Award,
  ArrowUpDown,
  Sparkles,
  Check,
  Copy,
  Send,
  MessageSquare,
  MessageCircle,
  X
} from 'lucide-react';

interface Tenant {
  id: number;
  tenant_id: string;
  store_name: string;
  owner_name: string;
  owner_phone: string;
  username: string;
  package_name: string;
  status: 'active' | 'suspended' | 'expired';
  max_groups: number;
  created_at: string;
  expires_at: string;
  notes: string | null;
  days_remaining?: number;
  duration_days?: number;
  bot_status?: 'online' | 'offline';
}

interface Stats {
  totalTenants: number;
  activeTenants: number;
  expiredTenants: number;
  suspendedTenants: number;
  serverTime: string;
}

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState<boolean>(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [tenantToToggleStatus, setTenantToToggleStatus] = useState<Tenant | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedTenantForReset, setSelectedTenantForReset] = useState<Tenant | null>(null);
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [resetSuccessData, setResetSuccessData] = useState<{ username: string; new_password: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

  // Form New Tenant
  const [creationMode, setCreationMode] = useState<'auto' | 'custom'>('auto');
  const [newStoreName, setNewStoreName] = useState<string>('');
  const [newOwnerName, setNewOwnerName] = useState<string>('');
  const [newOwnerPhone, setNewOwnerPhone] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newDuration, setNewDuration] = useState<number>(365);
  const [newNotes, setNewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'duration_desc' | 'duration_asc' | 'newest'>('duration_desc');
  const [createdTenantResult, setCreatedTenantResult] = useState<{
    username: string;
    password?: string;
    tenant_id: string;
    store_name?: string;
    duration_days?: number;
  } | null>(null);
  const [copiedNewTenant, setCopiedNewTenant] = useState<boolean>(false);

  // Form Extend
  const [extendDays, setExtendDays] = useState<number>(30);
  const [extendNote, setExtendNote] = useState<string>('');

  // Form Send Message
  const [isSendMessageModalOpen, setIsSendMessageModalOpen] = useState<boolean>(false);
  const [selectedTenantForMessage, setSelectedTenantForMessage] = useState<Tenant | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/admin/stats'),
      ]);
      const tenantsData = await tenantsRes.json();
      const statsData = await statsRes.json();

      if (tenantsData.success) {
        setTenants(tenantsData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (err: any) {
      showToast('Gagal memuat data master: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const payload: any = {
        duration_days: newDuration,
        notes: newNotes,
      };

      if (creationMode === 'custom') {
        if (newStoreName.trim()) payload.store_name = newStoreName.trim();
        if (newOwnerName.trim()) payload.owner_name = newOwnerName.trim();
        if (newOwnerPhone.trim()) payload.owner_phone = formatIndonesianPhone(newOwnerPhone).cleanDigits;
        if (newUsername.trim()) payload.username = newUsername.trim();
        if (newPassword.trim()) payload.password = newPassword.trim();
      }

      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const result = data.data;
        setCreatedTenantResult({
          username: result.generated_username || result.username,
          password: result.generated_password || newPassword || 'toko12345',
          tenant_id: result.tenant_id,
          store_name: result.store_name || 'Toko Baru (Belum Diisi)',
          duration_days: newDuration,
        });
        showToast('Unit tenant baru berhasil dibuat!');
        // Reset form inputs
        setNewStoreName('');
        setNewOwnerName('');
        setNewOwnerPhone('');
        setNewUsername('');
        setNewPassword('');
        setNewNotes('');
        setCopiedNewTenant(false);
        fetchData();
      } else {
        showToast(data.message || 'Gagal mendaftarkan unit');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleExtendDuration = async () => {
    if (!selectedTenant) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.tenant_id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: extendDays,
          note: extendNote || `Perpanjangan sewa +${extendDays} hari`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setIsExtendModalOpen(false);
        fetchData();
      } else {
        showToast(data.message || 'Gagal memperpanjang sewa');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!tenantToToggleStatus) return;
    const nextStatus = tenantToToggleStatus.status === 'active' ? 'suspended' : 'active';
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantToToggleStatus.tenant_id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setTenantToToggleStatus(null);
        fetchData();
      } else {
        showToast(data.message || 'Gagal mengubah status');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuspend = async (tenant: Tenant) => {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          nextStatus === 'suspended'
            ? `Unit "${tenant.store_name}" dinonaktifkan (Suspend)!`
            : `Unit "${tenant.store_name}" aktif kembali!`
        );
        fetchData();
      } else {
        showToast(data.message || 'Gagal mengubah status suspend');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForReset) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenantForReset.tenant_id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_password: newResetPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccessData(data.data);
        showToast(`Password untuk ${selectedTenantForReset.store_name} berhasil direset!`);
      } else {
        showToast(data.message || 'Gagal mereset password');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let gen = 'pass_';
    for (let i = 0; i < 6; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewResetPassword(gen);
  };

  const confirmDeleteTenant = async () => {
    if (!tenantToDelete) return;
    if (tenantToDelete.tenant_id === 't_wanzt') {
      showToast('Unit default "t_wanzt" tidak boleh dihapus!');
      setTenantToDelete(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantToDelete.tenant_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setTenantToDelete(null);
        fetchData();
      } else {
        showToast(data.message || 'Gagal menghapus tenant');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSendMessageModal = (tenant: Tenant) => {
    setSelectedTenantForMessage(tenant);
    setMessageText('');
    setIsSendMessageModalOpen(true);
  };

  const handleApplyMessageTemplate = (type: 'extend' | 'maintenance' | 'warning') => {
    if (!selectedTenantForMessage) return;
    const owner = selectedTenantForMessage.owner_name || 'Owner';
    const store = selectedTenantForMessage.store_name || selectedTenantForMessage.tenant_id;

    if (type === 'extend') {
      setMessageText(
        `Halo Kak ${owner} (${store}), ini adalah pesan resmi dari Master Admin Wanzt Apartemen.\n\nKami menginformasikan bahwa masa sewa unit bot WhatsApp Anda akan segera berakhir. Silakan lakukan perpanjangan masa sewa agar bot tetap aktif melayani transaksi toko Anda.\n\nTerima kasih!`
      );
    } else if (type === 'maintenance') {
      setMessageText(
        `Halo Kak ${owner} (${store}), ini adalah pemberitahuan resmi dari Master Admin.\n\nAkan dilakukan pemeliharaan server berkala (maintenance). Layanan bot WhatsApp Anda mungkin mengalami jeda sejenak selama proses berlangsung. Terima kasih atas kerja samanya.`
      );
    } else if (type === 'warning') {
      setMessageText(
        `Halo Kak ${owner} (${store}), ini adalah pemberitahuan dari Master Admin terkait akun bot WhatsApp Anda. Mohon segera periksa dashboard toko Anda atau konfirmasi ke kami jika ada kendala. Terima kasih.`
      );
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantForMessage || !messageText.trim()) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenantForMessage.tenant_id}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pesan resmi berhasil dikirim via bot!');
        setIsSendMessageModalOpen(false);
        setMessageText('');
      } else {
        showToast(data.message || 'Gagal mengirim pesan');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.tenant_id}/impersonate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Membuka dashboard toko "${tenant.store_name}"...`);
        // Buka dashboard toko di tab/jendela yang sama
        window.location.href = data.redirectUrl || '/';
      } else {
        showToast(data.message || 'Gagal melakukan impersonasi');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  function formatIndonesianPhone(raw: string): { display: string; cleanDigits: string } {
    if (!raw) return { display: '-', cleanDigits: '' };
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
      digits = '62' + digits;
    } else if (!digits.startsWith('62') && digits.length > 0) {
      digits = '62' + digits;
    }
    return {
      display: `+${digits}`,
      cleanDigits: digits,
    };
  }

  function getRentalTierInfo(daysRemaining: number, status: string) {
    if (status === 'expired' || daysRemaining <= 0) {
      return {
        tier: 'Masa Sewa Habis',
        color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        badge: 'Kedaluwarsa',
      };
    }
    if (daysRemaining >= 90) {
      return {
        tier: 'Tier Panjang (90+ Hari)',
        color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
        badge: 'Prioritas Tinggi',
      };
    }
    if (daysRemaining >= 30) {
      return {
        tier: 'Tier Standar (30-89 Hari)',
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        badge: 'Aktif Reguler',
      };
    }
    return {
      tier: 'Tier Singkat (<30 Hari)',
      color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      badge: 'Mendekati Habis',
    };
  }

  // Filter & Urutkan Peringkat Tenants Berdasarkan Masa Sewa
  const filteredTenants = tenants
    .filter((t) => {
      const matchesSearch =
        t.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner_phone.includes(searchQuery) ||
        t.tenant_id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'all') return true;
      return t.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'duration_desc') {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return (b.days_remaining || 0) - (a.days_remaining || 0);
      }
      if (sortBy === 'duration_asc') {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return (a.days_remaining || 0) - (b.days_remaining || 0);
      }
      return b.id - a.id;
    });

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-100 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">WANZT APARTEMEN</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400">Pusat Kendali Multi-Tenant Bot WhatsApp (admin.wanma2.my.id)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = '/')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors active:scale-[0.98]"
              title="Kunjungi antarmuka toko pengguna biasa"
            >
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Buka Web Toko (dashboard.wanma2.my.id)</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors active:scale-[0.98]"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Metric Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Unit Terdaftar</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats?.totalTenants ?? tenants.length}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Seluruh penyewa toko</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Unit Aktif</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats?.activeTenants ?? 0}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Bot berjalan normal</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">Masa Sewa Habis</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats?.expiredTenants ?? 0}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Perlu perpanjangan</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Unit Ditangguhkan</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats?.suspendedTenants ?? 0}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Bot dinonaktifkan</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Action Header & Search */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Daftar Unit Apartemen Toko</h2>
            <p className="text-xs text-slate-400">Kelola lisensi, database terisolasi, dan akses bot WhatsApp setiap penyewa</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Unit Toko Baru</span>
            </button>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Tabs */}
          <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {(
              [
                { id: 'all', label: 'Semua Unit' },
                { id: 'active', label: 'Aktif' },
                { id: 'expired', label: 'Expired' },
                { id: 'suspended', label: 'Suspended' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls: Sorting & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Sorting Peringkat */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <label htmlFor="sort-select" className="text-slate-400 text-[11px] whitespace-nowrap">Urutan:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="duration_desc" className="bg-slate-900 text-white">Masa Sewa Terpanjang (#1)</option>
                <option value="duration_asc" className="bg-slate-900 text-white">Mendekati Kedaluwarsa</option>
                <option value="newest" className="bg-slate-900 text-white">Terbaru Didaftarkan</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari toko, pemilik, no WA..."
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Tenant Table Container */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1320px]">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/90 select-none">
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">ID Bot</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Toko</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Owner</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">No. WhatsApp</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Username</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Masa Sewa</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Expired</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Status Bot</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Pesan</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Perpanjang</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Suspend</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Reset</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap text-center">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                      Memuat data apartemen...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      Tidak ada data unit apartemen yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const isExp = tenant.status === 'expired';
                    const isSusp = tenant.status === 'suspended';

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* 1. Status Akun */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          {tenant.status === 'active' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Aktif
                            </span>
                          )}
                          {isSusp && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Suspend
                            </span>
                          )}
                          {isExp && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Expired
                            </span>
                          )}
                        </td>

                        {/* 2. ID Bot */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md bg-slate-800 text-indigo-300 border border-slate-700/80 select-all">
                            {tenant.tenant_id}
                          </span>
                        </td>

                        {/* 3. Toko */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-white">
                            <span>
                              {tenant.store_name ? (
                                tenant.store_name
                              ) : (
                                <span className="text-slate-500 italic font-normal text-[11px]">Belum diisi tenant</span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleImpersonate(tenant)}
                              className="text-slate-400 hover:text-emerald-400 p-0.5 rounded transition-colors cursor-pointer"
                              title="Masuk ke Dashboard Toko (Impersonasi)"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* 4. Owner */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <span className="text-slate-200 font-medium">
                            {tenant.owner_name ? (
                              tenant.owner_name
                            ) : (
                              <span className="text-slate-500 italic font-normal text-[11px]">-</span>
                            )}
                          </span>
                        </td>

                        {/* 5. No. WhatsApp */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          {(() => {
                            if (!tenant.owner_phone || !tenant.owner_phone.trim()) {
                              return <span className="text-slate-500 italic font-normal text-[11px]">-</span>;
                            }
                            const phone = formatIndonesianPhone(tenant.owner_phone);
                            return (
                              <a
                                href={`https://wa.me/${phone.cleanDigits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors font-mono text-xs"
                                title="Kirim WhatsApp ke Pemilik"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{phone.display}</span>
                              </a>
                            );
                          })()}
                        </td>

                        {/* 6. Username */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                            {tenant.username}
                          </span>
                        </td>

                        {/* 7. Masa Sewa */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">
                            {tenant.duration_days || tenant.days_remaining || 30} Hari
                          </div>
                          {tenant.days_remaining !== undefined && (
                            <div className="text-[10px] text-slate-400">
                              Sisa {tenant.days_remaining} Hari
                            </div>
                          )}
                        </td>

                        {/* 8. Expired */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="text-slate-300 font-medium text-xs">
                            {new Date(tenant.expires_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>

                        {/* 9. Status Bot Baileys */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          {tenant.bot_status === 'online' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                              Offline
                            </span>
                          )}
                        </td>

                        {/* 10. Pesan ke Owner */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenSendMessageModal(tenant)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                            title="Kirim Pesan WhatsApp Resmi ke Owner Toko"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Pesan</span>
                          </button>
                        </td>

                        {/* 11. Perpanjang */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setExtendDays(30);
                              setIsExtendModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                            title="Perpanjang Masa Sewa"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Perpanjang</span>
                          </button>
                        </td>

                        {/* 11. Suspend (Toggle Switch) */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                          <div className="inline-flex items-center justify-center">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={tenant.status === 'suspended'}
                              onClick={() => handleToggleSuspend(tenant)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                tenant.status === 'suspended' ? 'bg-amber-500' : 'bg-slate-700 hover:bg-slate-600'
                              }`}
                              title={
                                tenant.status === 'suspended'
                                  ? 'Suspend ON: Bot dinonaktifkan (Klik untuk mengaktifkan kembali)'
                                  : 'Suspend OFF: Bot aktif normal (Klik untuk men-suspend)'
                              }
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  tenant.status === 'suspended' ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </td>

                        {/* 12. Reset (Reset Password) */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenantForReset(tenant);
                              setNewResetPassword('');
                              setResetSuccessData(null);
                              setIsResetModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                            title="Reset Password Akun Tenant"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset</span>
                          </button>
                        </td>

                        {/* 13. Hapus */}
                        <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                          {tenant.tenant_id === 't_wanzt' ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-800/40 border border-slate-700/40 rounded-lg cursor-not-allowed opacity-50 whitespace-nowrap"
                              title="Tenant default sistem tidak dapat dihapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setTenantToDelete(tenant)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                              title="Hapus Akun Tenant Permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal: Tambah Tenant Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  {createdTenantResult ? 'Akun Tenant Berhasil Dibuat' : 'Tambah Unit Apartemen Toko'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setCreatedTenantResult(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {createdTenantResult ? (
              /* Tampilan Sukses Kredensial Baru */
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Unit Berhasil Terdaftar (Akses Penuh)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Data Nama Store, Nama Owner, dan Nomor WhatsApp dikosongkan terlebih dahulu. Saat penyewa login pertama kali, popup wajib isi profil toko akan muncul otomatis di dashboard mereka.
                  </p>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-700/80 space-y-2 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">ID Unit:</span>
                      <span className="text-indigo-400 font-bold">{createdTenantResult.tenant_id}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Username:</span>
                      <span className="text-white font-bold bg-slate-800 px-2 py-0.5 rounded">{createdTenantResult.username}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Password:</span>
                      <span className="text-amber-300 font-bold bg-slate-800 px-2 py-0.5 rounded">{createdTenantResult.password}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Masa Sewa:</span>
                      <span className="text-emerald-400 font-bold">{createdTenantResult.duration_days} Hari</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy = `Kredensial Akses Bot WhatsApp Store:\nUsername: ${createdTenantResult.username}\nPassword: ${createdTenantResult.password}\nDurasi: ${createdTenantResult.duration_days} Hari\nSilakan login dan lengkapi profil toko Anda.`;
                      navigator.clipboard.writeText(textToCopy);
                      setCopiedNewTenant(true);
                      showToast('Kredensial berhasil disalin ke clipboard!');
                      setTimeout(() => setCopiedNewTenant(false), 3000);
                    }}
                    className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedNewTenant ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Kredensial Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-white" />
                        <span>Salin Kredensial untuk Tenant</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setCreatedTenantResult(null);
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              /* Form Pembuatan Tenant */
              <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
                {/* Switcher Mode: Otomatis Instan vs Kustom */}
                <div className="flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCreationMode('auto')}
                    className={`flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer ${
                      creationMode === 'auto'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Otomatis Instan (Rekomendasi)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMode('custom')}
                    className={`flex-1 py-2 text-center rounded-lg font-semibold transition-all cursor-pointer ${
                      creationMode === 'custom'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ✍️ Input Manual (Kustom)
                  </button>
                </div>

                {creationMode === 'auto' ? (
                  /* Mode Otomatis Instan */
                  <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
                    <div className="flex items-start gap-2.5 text-slate-300">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        <p className="font-semibold text-white">Sistem Otomatis:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-400 mt-1">
                          <li>Username acak terstruktur akan dibuat otomatis (misal: <code className="text-indigo-300 font-mono">tenant_4829</code>).</li>
                          <li>Password acak aman akan dibuat otomatis (misal: <code className="text-amber-300 font-mono">pass_k72x</code>).</li>
                          <li>Nama Toko, Nama Owner, dan Nomor WhatsApp dikosongkan agar diisi mandiri oleh tenant via popup modal saat pertama kali login.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mode Input Kustom */
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Nama Toko (Opsional)</label>
                        <input
                          type="text"
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          placeholder="Kosongkan jika diisi penyewa"
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Nama Pemilik (Opsional)</label>
                        <input
                          type="text"
                          value={newOwnerName}
                          onChange={(e) => setNewOwnerName(e.target.value)}
                          placeholder="Kosongkan jika diisi penyewa"
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">No. WhatsApp Pemilik (Opsional)</label>
                      <input
                        type="text"
                        value={newOwnerPhone}
                        onChange={(e) => setNewOwnerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="08123456789 (Kosongkan jika diisi penyewa)"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Username Login (Opsional)</label>
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="Kosongkan untuk auto-generate"
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">Password Awal (Opsional)</label>
                        <input
                          type="text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Kosongkan untuk auto-generate"
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Pilih Masa Sewa Awal *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 365].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setNewDuration(d)}
                        className={`py-2 text-center rounded-xl font-semibold border transition-all cursor-pointer ${
                          newDuration === d
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-2xs'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {d === 365 ? '1 Tahun' : `${d} Hari`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Catatan Sewa (Opsional)</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Catatan pengelola..."
                    rows={2}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isSubmitting ? 'Membuat Unit...' : 'Buat Akun Unit Baru'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}


      {/* Modal: Perpanjang Sewa */}
      {isExtendModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Perpanjang Masa Sewa</h3>
              </div>
              <button
                onClick={() => setIsExtendModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-1">
              <div className="text-slate-400">Unit: <span className="font-semibold text-white">{selectedTenant.store_name} ({selectedTenant.tenant_id})</span></div>
              <div className="text-slate-400">Kedaluwarsa Saat Ini: <span className="font-semibold text-emerald-400">{new Date(selectedTenant.expires_at).toLocaleDateString('id-ID')}</span></div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-400 font-medium">Pilih Durasi Tambahan:</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 30, 90, 365].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`py-2 text-center rounded-xl font-semibold border transition-all ${
                      extendDays === d
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    +{d === 365 ? '1 Thn' : `${d} H`}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Catatan Pembayaran:</label>
                <input
                  type="text"
                  value={extendNote}
                  onChange={(e) => setExtendNote(e.target.value)}
                  placeholder="Contoh: Lunas via transfer BCA Rp 100.000"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExtendDuration}
                className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Memproses...' : `Perpanjang +${extendDays} Hari`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Tenant */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-white">Hapus Unit Apartemen Toko</h3>
              </div>
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2">
              <p className="font-semibold text-rose-300">
                Apakah Anda yakin ingin menghapus unit toko ini secara permanen?
              </p>
              <div className="text-slate-300 space-y-1">
                <div>Nama Toko: <span className="font-semibold text-white">{tenantToDelete.store_name}</span></div>
                <div>ID Unit: <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">{tenantToDelete.tenant_id}</span></div>
                <div>Pemilik: <span className="text-slate-200">{tenantToDelete.owner_name} ({formatIndonesianPhone(tenantToDelete.owner_phone).display})</span></div>
              </div>
              <p className="text-[11px] text-rose-400/90 pt-1">
                Peringatan: Seluruh data transaksi, database SQLite tenant, dan riwayat sesi WhatsApp akan dihapus secara fisik dari server.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                disabled={isSubmitting}
                className="px-4 py-2 font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirmDeleteTenant}
                className="px-5 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Menghapus...' : 'Ya, Hapus Permanen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Toggle Status (Suspend / Aktifkan) */}
      {tenantToToggleStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-white">
                  {tenantToToggleStatus.status === 'active' ? 'Bekukan (Suspend) Unit Toko' : 'Aktifkan Kembali Unit Toko'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTenantToToggleStatus(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-2">
              <p className="text-slate-300">
                {tenantToToggleStatus.status === 'active'
                  ? `Unit toko "${tenantToToggleStatus.store_name}" akan ditangguhkan. Bot WhatsApp toko ini akan dinonaktifkan sementara waktu.`
                  : `Unit toko "${tenantToToggleStatus.store_name}" akan diaktifkan kembali. Bot WhatsApp toko dapat melanjutkan operasional.`}
              </p>
              <div className="text-slate-400 space-y-0.5 text-[11px]">
                <div>Unit: <span className="font-semibold text-white">{tenantToToggleStatus.store_name} ({tenantToToggleStatus.tenant_id})</span></div>
                <div>Status Saat Ini: <span className="uppercase font-semibold text-slate-300">{tenantToToggleStatus.status}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTenantToToggleStatus(null)}
                disabled={isSubmitting}
                className="px-4 py-2 font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={confirmToggleStatus}
                className={`px-5 py-2 font-semibold text-white rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5 ${
                  tenantToToggleStatus.status === 'active'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                }`}
              >
                {tenantToToggleStatus.status === 'active' ? (
                  <>
                    <PauseCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'Memproses...' : 'Bekukan Unit'}</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'Memproses...' : 'Aktifkan Unit'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password Tenant */}
      {isResetModalOpen && selectedTenantForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Reset Password Tenant</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetSuccessData(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-1.5">
              <div className="text-slate-400">
                Toko: <span className="font-semibold text-white">{selectedTenantForReset.store_name}</span>
              </div>
              <div className="text-slate-400">
                ID Unit: <span className="font-mono text-indigo-300 font-semibold">{selectedTenantForReset.tenant_id}</span>
              </div>
              <div className="text-slate-400">
                Username: <span className="font-mono text-slate-200 font-semibold">{selectedTenantForReset.username}</span>
              </div>
            </div>

            {resetSuccessData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Password Berhasil Diperbarui</span>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-300 mb-1.5">Kredensial login baru untuk tenant:</p>
                    <div className="flex items-center justify-between p-2.5 bg-slate-900/90 rounded-lg border border-slate-700 font-mono text-xs">
                      <div className="space-y-1">
                        <div>
                          <span className="text-slate-400">Username: </span>
                          <span className="text-white font-bold">{resetSuccessData.username}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Password: </span>
                          <span className="text-amber-300 font-bold">{resetSuccessData.new_password}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(resetSuccessData.new_password)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-600 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer shrink-0"
                        title="Salin password"
                      >
                        {copiedPassword ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetModalOpen(false);
                      setResetSuccessData(null);
                      fetchData();
                    }}
                    className="px-5 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-medium">Password Baru</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Buat Acak Otomatis</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru atau klik Buat Acak"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tenant dapat menggunakan kata sandi ini untuk login ke dashboard tokonya.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newResetPassword.trim()}
                    className="px-5 py-2 font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 6: Kirim Pesan WhatsApp ke Owner Tenant */}
      {isSendMessageModalOpen && selectedTenantForMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Kirim Pesan ke Owner Toko</h3>
                  <p className="text-[11px] text-slate-400">
                    Pesan resmi Master Admin dikirim otomatis oleh bot WhatsApp unit penyewa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendMessageModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Info Card */}
            {(() => {
              const phoneInfo = formatIndonesianPhone(selectedTenantForMessage.owner_phone);
              const isOnline = selectedTenantForMessage.bot_status === 'online';
              const hasPhone = Boolean(selectedTenantForMessage.owner_phone && selectedTenantForMessage.owner_phone.trim());

              return (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80 grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Unit Toko</span>
                      <span className="font-semibold text-slate-200 truncate block">
                        {selectedTenantForMessage.store_name || selectedTenantForMessage.tenant_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Nama Owner</span>
                      <span className="font-semibold text-slate-200 truncate block">
                        {selectedTenantForMessage.owner_name || '(Belum Diisi)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">No. WhatsApp Tujuan</span>
                      {hasPhone ? (
                        <span className="font-mono text-emerald-400 font-medium">{phoneInfo.display}</span>
                      ) : (
                        <span className="text-rose-400 font-semibold italic text-[11px]">Nomor belum diisi</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Status Bot Toko</span>
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Online (Socket Siap)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {!hasPhone && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>
                        Nomor WhatsApp pemilik belum diisi oleh tenant. Pesan tidak dapat dikirim sampai tenant melengkapi nomor telepon di dashboard toko.
                      </span>
                    </div>
                  )}

                  {!isOnline && hasPhone && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="space-y-1.5">
                        <p>
                          Bot WhatsApp toko ini sedang <strong className="text-amber-200">Offline</strong>. Socket bot tidak dapat mengirim pesan otomatis saat ini.
                        </p>
                        <p className="text-[11px] text-amber-400/90">
                          Anda dapat menggunakan tombol cadangan di bawah untuk mengirim pesan langsung via WhatsApp pribadi Anda.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Template Pesan Cepat */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Pilih Template Pesan Cepat:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyMessageTemplate('extend')}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer active:scale-95"
                      >
                        Perpanjangan Sewa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyMessageTemplate('maintenance')}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer active:scale-95"
                      >
                        Maintenance Server
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyMessageTemplate('warning')}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer active:scale-95"
                      >
                        Peringatan Akun
                      </button>
                      {messageText && (
                        <button
                          type="button"
                          onClick={() => setMessageText('')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700/50 transition-colors cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form Input Pesan */}
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-300 font-medium">Isi Pesan Resmi</label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {messageText.length} karakter
                        </span>
                      </div>
                      <textarea
                        required
                        rows={5}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Ketik pesan resmi Master Admin yang ingin disampaikan ke pemilik toko..."
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs leading-relaxed"
                      />
                    </div>

                    {/* Tombol Aksi Bawah */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsSendMessageModalOpen(false)}
                        className="w-full sm:w-auto px-4 py-2 font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                      >
                        Tutup
                      </button>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Fallback WhatsApp Web langsung saat bot offline */}
                        {!isOnline && hasPhone && (
                          <a
                            href={`https://wa.me/${phoneInfo.cleanDigits}?text=${encodeURIComponent(messageText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                            title="Kirim pesan langsung melalui WhatsApp Web/App pribadi Anda"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Buka Chat WhatsApp (wa.me)</span>
                          </a>
                        )}

                        {/* Tombol Kirim via Bot Toko jika Bot Online */}
                        {isOnline && (
                          <button
                            type="submit"
                            disabled={isSendingMessage || !messageText.trim() || !hasPhone}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSendingMessage ? 'Mengirim Pesan...' : 'Kirim via Bot Toko'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

