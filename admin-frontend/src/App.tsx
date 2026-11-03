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
  Sparkles
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

  // Form New Tenant
  const [newStoreName, setNewStoreName] = useState<string>('');
  const [newOwnerName, setNewOwnerName] = useState<string>('');
  const [newOwnerPhone, setNewOwnerPhone] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newNotes, setNewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'duration_desc' | 'duration_asc' | 'newest'>('duration_desc');

  // Form Extend
  const [extendDays, setExtendDays] = useState<number>(30);
  const [extendNote, setExtendNote] = useState<string>('');

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
    if (!newStoreName || !newOwnerName || !newOwnerPhone || !newUsername) {
      showToast('Harap lengkapi semua data wajib!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: newStoreName,
          owner_name: newOwnerName,
          owner_phone: newOwnerPhone,
          username: newUsername,
          password: newPassword || 'toko12345',
          duration_days: newDuration,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Unit toko "${newStoreName}" berhasil didaftarkan!`);
        setIsAddModalOpen(false);
        // Reset form
        setNewStoreName('');
        setNewOwnerName('');
        setNewOwnerPhone('');
        setNewUsername('');
        setNewPassword('');
        setNewNotes('');
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/90">
                  <th className="py-3.5 px-4">Peringkat Sewa</th>
                  <th className="py-3.5 px-4">ID Unit & Toko</th>
                  <th className="py-3.5 px-4">No. WhatsApp</th>
                  <th className="py-3.5 px-4">Tier & Masa Sewa</th>
                  <th className="py-3.5 px-4">Status Layanan</th>
                  <th className="py-3.5 px-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                      Memuat data apartemen...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada data unit apartemen yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant, index) => {
                    const isExp = tenant.status === 'expired';
                    const isSusp = tenant.status === 'suspended';
                    const tierInfo = getRentalTierInfo(tenant.days_remaining || 0, tenant.status);

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Peringkat Sewa */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center justify-center font-mono font-bold text-xs w-7 h-7 rounded-lg border ${
                                index === 0 && tenant.status === 'active'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                                  : index === 1 && tenant.status === 'active'
                                  ? 'bg-slate-700/60 text-slate-200 border-slate-600'
                                  : index === 2 && tenant.status === 'active'
                                  ? 'bg-amber-700/20 text-amber-400 border-amber-700/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              #{index + 1}
                            </span>
                            {index === 0 && tenant.status === 'active' && (
                              <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-0.5">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Peringkat 1
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ID Unit & Toko */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{tenant.store_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                              {tenant.tenant_id}
                            </span>
                            <span className="text-[11px] text-slate-400">Owner: {tenant.owner_name} ({tenant.username})</span>
                          </div>
                        </td>

                        {/* No WA */}
                        <td className="py-3.5 px-4">
                          <a
                            href={`https://wa.me/${tenant.owner_phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 transition-colors font-mono"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                            <span>+{tenant.owner_phone}</span>
                          </a>
                        </td>

                        {/* Tier & Masa Sewa (Semua Bot Sama Rata, Peringkat Berdasarkan Masa Sewa) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${tierInfo.color}`}>
                              {tierInfo.tier}
                            </span>
                            <span className={`font-semibold text-xs ${isExp ? 'text-rose-400' : 'text-slate-200'}`}>
                              {tenant.days_remaining} Hari
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Aktif s/d {new Date(tenant.expires_at).toLocaleDateString('id-ID')}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {tenant.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Aktif
                            </span>
                          )}
                          {isSusp && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Ditangguhkan
                            </span>
                          )}
                          {isExp && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Expired
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Impersonate Button */}
                            <button
                              type="button"
                              onClick={() => handleImpersonate(tenant)}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                              title="Masuk sebagai tenant (1-klik)"
                            >
                              Buka Toko
                            </button>

                            {/* Extend Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setExtendDays(30);
                                setIsExtendModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                              title="Perpanjang sewa"
                            >
                              Perpanjang
                            </button>

                            {/* Suspend/Activate Toggle */}
                            <button
                              type="button"
                              onClick={() => setTenantToToggleStatus(tenant)}
                              className={`p-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center ${
                                tenant.status === 'active'
                                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
                                  : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
                              }`}
                              title={tenant.status === 'active' ? 'Bekukan (Suspend)' : 'Aktifkan'}
                            >
                              {tenant.status === 'active' ? (
                                <PauseCircle className="w-4 h-4" />
                              ) : (
                                <PlayCircle className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete Button (disabled for t_wanzt) */}
                            {tenant.tenant_id !== 't_wanzt' && (
                              <button
                                type="button"
                                onClick={() => setTenantToDelete(tenant)}
                                className="p-1.5 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/30 transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center"
                                title="Hapus tenant permanen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Tambah Unit Apartemen Toko</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nama Toko *</label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="Contoh: Berkah Store"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nama Pemilik *</label>
                  <input
                    type="text"
                    required
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="Nama lengkap owner"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">No. WhatsApp Pemilik *</label>
                <input
                  type="text"
                  required
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="628123456789"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username_toko"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Password Awal</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Default: toko12345"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Durasi Sewa Awal</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDuration(d)}
                      className={`py-2 text-center rounded-xl font-semibold border transition-all ${
                        newDuration === d
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500'
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
                  placeholder="Catatan internal pengelola apartemen..."
                  rows={2}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Mendaftarkan...' : 'Daftarkan Unit Toko'}
                </button>
              </div>
            </form>
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
                <div>Pemilik: <span className="text-slate-200">{tenantToDelete.owner_name} (+{tenantToDelete.owner_phone})</span></div>
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
    </div>
  );
}

