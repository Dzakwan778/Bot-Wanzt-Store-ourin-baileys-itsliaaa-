import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/auth/LoginPage';
import { TenantDashboard } from './components/dashboard/TenantDashboard';

export default function App() {
  const auth = useAuth();

  // 1. Tampilkan spinner saat memverifikasi sesi login awal dari server
  if (auth.authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-sky-600/20 border-t-sky-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 text-sm font-medium">Memverifikasi sesi dashboard...</p>
      </div>
    );
  }

  // 2. Jika belum terotentikasi, tampilkan halaman Login
  if (!auth.isAuthenticated || !auth.user) {
    return <LoginPage onLogin={auth.login} />;
  }

  // 3. Jika sudah login, render Dashboard Tenant dengan key unik per-tenant
  // Prop key={tenantId} menjamin React menghancurkan instance lama dan memuat instance baru yang bersih
  // sehingga data antar-tenant tidak akan pernah tercampur atau bocor
  const activeTenantKey = auth.user.tenantId || auth.user.username || 'default_tenant';

  return <TenantDashboard key={activeTenantKey} auth={auth} />;
}
