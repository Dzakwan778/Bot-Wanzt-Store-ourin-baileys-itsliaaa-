import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tenant, Stats } from './types/admin.types.ts';
import { AdminSidebar, AdminNavTab } from './components/layout/AdminSidebar.tsx';
import { AdminHeader } from './components/layout/AdminHeader.tsx';
import { StatCards } from './components/dashboard/StatCards.tsx';
import { TableControls } from './components/dashboard/TableControls.tsx';
import { TenantTable } from './components/dashboard/TenantTable.tsx';
import { AddTenantModal } from './components/modals/AddTenantModal.tsx';
import { ExtendTenantModal } from './components/modals/ExtendTenantModal.tsx';
import { ResetPasswordModal } from './components/modals/ResetPasswordModal.tsx';
import { SendMessageModal } from './components/modals/SendMessageModal.tsx';
import { DeleteTenantModal } from './components/modals/DeleteTenantModal.tsx';
import { ToggleSuspendModal } from './components/modals/ToggleSuspendModal.tsx';
import { TabTemplates } from './components/dashboard/tabs/TabTemplates.tsx';
import { TabTelegramAdmin } from './components/dashboard/tabs/TabTelegramAdmin.tsx';
import { TabTokenManagement } from './components/dashboard/tabs/TabTokenManagement.tsx';
import { TabPartnerApi } from './components/dashboard/tabs/TabPartnerApi.tsx';
import { TabMasterSettings } from './components/dashboard/tabs/TabMasterSettings.tsx';
import { TabBroadcast } from './components/dashboard/tabs/TabBroadcast.tsx';
import { TabReports } from './components/dashboard/tabs/TabReports.tsx';
import { AdminLoginPage } from './components/auth/AdminLoginPage.tsx';
import {
  MasterAdminProfile,
  adminFetch,
  clearAdminToken,
  getAdminToken,
  onAdminUnauthorized,
  setAdminToken,
} from './utils/adminAuth.ts';
import {
  BarChart3,
  Server,
  MessageSquare,
  Loader2,
} from 'lucide-react';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'unauthenticated' | 'authenticated'>('checking');
  const [adminUser, setAdminUser] = useState<MasterAdminProfile | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [selectedNavTab, setSelectedNavTab] = useState<AdminNavTab>('units');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'duration_desc' | 'duration_asc' | 'newest'>('duration_desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedTenantForExtend, setSelectedTenantForExtend] = useState<Tenant | null>(null);
  const [selectedTenantForReset, setSelectedTenantForReset] = useState<Tenant | null>(null);
  const [selectedTenantForMessage, setSelectedTenantForMessage] = useState<Tenant | null>(null);
  const [selectedTenantForDelete, setSelectedTenantForDelete] = useState<Tenant | null>(null);
  const [selectedTenantForSuspend, setSelectedTenantForSuspend] = useState<Tenant | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantsRes, statsRes, reportsRes] = await Promise.all([
        adminFetch('/api/admin/tenants'),
        adminFetch('/api/admin/stats'),
        adminFetch('/api/admin/reports?status=all'),
      ]);
      const tenantsData = await tenantsRes.json();
      const statsData = await statsRes.json();
      const reportsData = await reportsRes.json().catch(() => ({}));

      if (tenantsData.success) {
        setTenants(tenantsData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
      if (reportsData.success && reportsData.counts) {
        setPendingReportsCount(Number(reportsData.counts.terkirim) || 0);
      }
    } catch (err: any) {
      showToast('Gagal memuat data dari server: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const unsubscribe = onAdminUnauthorized(() => {
      setAdminUser(null);
      setTenants([]);
      setStats(null);
      setAuthNotice('Sesi Master Admin Anda telah berakhir. Silakan login kembali.');
      setAuthStatus('unauthenticated');
    });

    const verifyExistingSession = async () => {
      const token = getAdminToken();
      if (!token) {
        setAuthStatus('unauthenticated');
        setLoading(false);
        return;
      }

      try {
        const res = await adminFetch('/api/admin/auth/me');
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.authenticated && data.admin) {
          setAdminUser(data.admin);
          setAuthStatus('authenticated');
          await fetchData();
        } else {
          clearAdminToken();
          setAdminUser(null);
          setAuthStatus('unauthenticated');
          setLoading(false);
        }
      } catch {
        clearAdminToken();
        setAdminUser(null);
        setAuthStatus('unauthenticated');
        setLoading(false);
      }
    };

    verifyExistingSession();

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  const handleLoginSuccess = (token: string, admin: MasterAdminProfile) => {
    setAdminToken(token);
    setAdminUser(admin);
    setAuthNotice(null);
    setAuthStatus('authenticated');
    fetchData();
  };

  const handleLogout = async () => {
    try {
      await adminFetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Tetap lanjut bersihkan sesi lokal jika request logout gagal
    }
    clearAdminToken();
    setAdminUser(null);
    setTenants([]);
    setStats(null);
    setSelectedNavTab('units');
    setAuthNotice('Anda telah keluar dari sesi Master Admin.');
    setAuthStatus('unauthenticated');
  };

  const handleImpersonate = async (tenant: Tenant) => {
    try {
      const res = await adminFetch(`/api/admin/tenants/${tenant.tenant_id}/impersonate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
      } else {
        showToast(data.message || 'Gagal membuat sesi impersonasi');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  // Filter & Sorting Logic
  const filteredTenants = useMemo(() => {
    let result = [...tenants];

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.store_name.toLowerCase().includes(q) ||
          t.owner_name.toLowerCase().includes(q) ||
          t.owner_phone.includes(q) ||
          t.tenant_id.toLowerCase().includes(q) ||
          t.username.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'duration_desc') {
      result.sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime());
    } else if (sortBy === 'duration_asc') {
      result.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [tenants, statusFilter, searchQuery, sortBy]);

  if (authStatus === 'checking') {
    return (
      <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin text-[#0084D1]" />
        <p className="text-xs font-medium">Memverifikasi sesi Master Admin...</p>
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return (
      <AdminLoginPage
        initialNotice={authNotice}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-800 flex font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigasi Master */}
      <AdminSidebar
        selectedTab={selectedNavTab}
        setSelectedTab={setSelectedNavTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        totalTenants={tenants.length}
        activeTenants={stats?.activeTenants ?? 0}
        pendingReportsCount={pendingReportsCount}
        loading={loading}
        onRefresh={fetchData}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        adminUsername={adminUser?.username}
        onLogout={handleLogout}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader
          selectedTab={selectedNavTab}
          loading={loading}
          onRefresh={fetchData}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onLogout={handleLogout}
        />

        {/* Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {selectedNavTab === 'units' && (
            <>
              {/* Metric Cards */}
              <StatCards stats={stats} tenants={tenants} />

              {/* Table Controls (Filter, Sort, Search, Add Button) */}
              <TableControls
                tenants={tenants}
                stats={stats}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />

              {/* 14-Column Tenants Table */}
              <TenantTable
                tenants={filteredTenants}
                loading={loading}
                onImpersonate={handleImpersonate}
                onOpenSendMessage={(tenant) => setSelectedTenantForMessage(tenant)}
                onOpenExtend={(tenant) => setSelectedTenantForExtend(tenant)}
                onToggleSuspend={(tenant) => setSelectedTenantForSuspend(tenant)}
                onOpenResetPassword={(tenant) => setSelectedTenantForReset(tenant)}
                onOpenDelete={(tenant) => setSelectedTenantForDelete(tenant)}
              />
            </>
          )}

          {selectedNavTab === 'reports' && (
            <TabReports
              showToast={showToast}
              onCountsUpdated={(counts) => setPendingReportsCount(Number(counts.terkirim) || 0)}
            />
          )}

          {selectedNavTab === 'templates' && (
            <TabTemplates onRefreshParent={fetchData} />
          )}

          {selectedNavTab === 'telegram' && (
            <TabTelegramAdmin showToast={showToast} />
          )}

          {selectedNavTab === 'tokens' && (
            <TabTokenManagement showToast={showToast} />
          )}

          {selectedNavTab === 'partners' && (
            <TabPartnerApi showToast={showToast} />
          )}

          {selectedNavTab === 'stats' && (
            <div className="space-y-6">
              <StatCards stats={stats} tenants={tenants} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#0084D1]/10 text-[#0084D1] flex items-center justify-center">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Distribusi Status Sewa Apartemen</h3>
                      <p className="text-xs text-slate-500">Perbandingan unit aktif, kedaluwarsa, dan suspended</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Unit Aktif Beroperasi</span>
                        <span className="text-emerald-600">
                          {stats?.activeTenants ?? 0} dari {tenants.length} unit
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${tenants.length > 0 ? ((stats?.activeTenants ?? 0) / tenants.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Masa Sewa Habis (Expired)</span>
                        <span className="text-rose-600">
                          {stats?.expiredTenants ?? 0} unit
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${tenants.length > 0 ? ((stats?.expiredTenants ?? 0) / tenants.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-slate-600">Unit Ditangguhkan (Suspended)</span>
                        <span className="text-amber-600">
                          {stats?.suspendedTenants ?? 0} unit
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${tenants.length > 0 ? ((stats?.suspendedTenants ?? 0) / tenants.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Kesehatan Socket Bot WhatsApp</h3>
                      <p className="text-xs text-slate-500">Koneksi real-time multi-session Baileys</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Instance Multi-Session:</span>
                      <span className="font-bold text-slate-900">{tenants.length} Instance Aktif</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Penyimpanan Kredensial:</span>
                      <span className="font-mono text-slate-700">auth_info_baileys/tenant_*</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Isolasi Database:</span>
                      <span className="font-mono text-emerald-700 font-bold">SQLite Per-Tenant (WAL Mode)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistik Pengiriman Pesan Bot (WhatsApp vs Telegram) */}
              <div className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Statistik Pengiriman Pesan Bot (WhatsApp & Telegram)</h3>
                      <p className="text-xs text-slate-500">Akumulasi keseluruhan pesan bot dipisahkan berdasarkan platform</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                      Total Platform: <span className="text-indigo-600 font-bold">{stats?.totalMessages ?? 0}</span> Pesan
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Keseluruhan Pesan Bot</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.totalMessages ?? 0}</p>
                    <p className="text-[11px] text-slate-400">Total pesan terkirim semua platform</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                    <p className="text-xs font-semibold text-emerald-700 uppercase">Total Pesan WhatsApp</p>
                    <p className="text-2xl font-bold text-emerald-900">{stats?.whatsappMessagesTotal ?? 0}</p>
                    <p className="text-[11px] text-emerald-600">Terkirim via Bot WhatsApp</p>
                  </div>
                  <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-1">
                    <p className="text-xs font-semibold text-sky-700 uppercase">Total Pesan Telegram</p>
                    <p className="text-2xl font-bold text-sky-900">{stats?.telegramMessagesTotal ?? 0}</p>
                    <p className="text-[11px] text-sky-600">Terkirim via Bot Telegram</p>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Rincian Per Tenant (Toko)</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Nama Toko / Tenant ID</th>
                          <th className="py-3 px-4">Owner</th>
                          <th className="py-3 px-4 text-right">Pesan WhatsApp</th>
                          <th className="py-3 px-4 text-right">Pesan Telegram</th>
                          <th className="py-3 px-4 text-right">Total Pesan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats?.tenantMessageStats && stats.tenantMessageStats.length > 0 ? (
                          stats.tenantMessageStats.map((item) => (
                            <tr key={item.tenant_id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{item.store_name}</div>
                                <div className="font-mono text-[11px] text-slate-400">{item.tenant_id}</div>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-700">{item.owner_name}</td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600">{item.whatsapp_messages}</td>
                              <td className="py-3 px-4 text-right font-semibold text-sky-600">{item.telegram_messages}</td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900">{item.total_messages}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">Belum ada data pesan tercatat</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedNavTab === 'broadcast' && (
            <TabBroadcast showToast={showToast} />
          )}

          {selectedNavTab === 'settings' && (
            <TabMasterSettings
              onShowToast={showToast}
              adminUsername={adminUser?.username}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <ExtendTenantModal
        isOpen={Boolean(selectedTenantForExtend)}
        tenant={selectedTenantForExtend}
        onClose={() => setSelectedTenantForExtend(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <ResetPasswordModal
        isOpen={Boolean(selectedTenantForReset)}
        tenant={selectedTenantForReset}
        onClose={() => setSelectedTenantForReset(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <SendMessageModal
        isOpen={Boolean(selectedTenantForMessage)}
        tenant={selectedTenantForMessage}
        onClose={() => setSelectedTenantForMessage(null)}
        showToast={showToast}
      />

      <DeleteTenantModal
        isOpen={Boolean(selectedTenantForDelete)}
        tenant={selectedTenantForDelete}
        onClose={() => setSelectedTenantForDelete(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />

      <ToggleSuspendModal
        isOpen={Boolean(selectedTenantForSuspend)}
        tenant={selectedTenantForSuspend}
        onClose={() => setSelectedTenantForSuspend(null)}
        onSuccess={fetchData}
        showToast={showToast}
      />
    </div>
  );
}
