import { useState } from 'react';
import { Check } from 'lucide-react';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { useBotConnection } from './hooks/useBotConnection';
import { useXavieraData } from './hooks/useXavieraData';
import { useWhatsAppGroups } from './hooks/useWhatsAppGroups';
import { useStoreConfig } from './hooks/useStoreConfig';
import { useButtonModal } from './hooks/useButtonModal';
import { useLunasQrisData } from './hooks/useLunasQrisData';
import { useTransactions } from './hooks/useTransactions';
import { usePricingConfig } from './hooks/usePricingConfig';
import { usePromos } from './hooks/usePromos';

// Auth & Modals
import { LoginPage } from './components/auth/LoginPage';
import { MandatoryStoreSetupModal } from './components/modals/MandatoryStoreSetupModal';
import { AddEditButtonModal } from './components/modals/AddEditButtonModal';

// Layout components
import { Navbar } from './components/layout/Navbar';
import { StoreProfileHeader } from './components/layout/StoreProfileHeader';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { DesktopTopNav } from './components/layout/DesktopTopNav';

// Connection & Terminal components
import { WhatsAppConnectionPanel } from './components/connection/WhatsAppConnectionPanel';
import { LiveTerminal } from './components/terminal/LiveTerminal';

// Tab Renderer component
import { TabContentRenderer } from './components/tabs/TabContentRenderer';

export default function App() {
  const [selectedTab, setSelectedTab] = useState<string>('Info Profil');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 0. Otentikasi Pengguna & Keamanan Sesi Dashboard
  const auth = useAuth();

  // 1. Data Integrasi Xaviera API
  const xaviera = useXavieraData(showToast);

  // 2. Data & Pengaturan Toko (Store Info, Command Menu, List, Carousel, Media)
  const storeConfig = useStoreConfig(xaviera.xavieraApiKey, xaviera.xavieraBaseUrl, showToast);

  // 3. Data & Saldo Payment Gateway LunasQRIS API
  const lunasQrisData = useLunasQrisData(storeConfig.lunasQrisApiKey, storeConfig.lunasQrisBaseUrl, showToast);

  // 4. Koneksi & Polling Socket WhatsApp Bot
  const botConn = useBotConnection(
    showToast,
    storeConfig.loadInitialConfig,
    (apiKey, baseUrl) => {
      if (apiKey) xaviera.setXavieraApiKey(apiKey);
      if (baseUrl) xaviera.setXavieraBaseUrl(baseUrl);
    }
  );

  // 5. Whitelist Grup WhatsApp
  const groupsData = useWhatsAppGroups(selectedTab, botConn.botData.status, showToast);

  // 6. Modal Tambah & Edit Tombol WhatsApp Native Flow
  const buttonModal = useButtonModal(
    storeConfig.menuButtons,
    storeConfig.setMenuButtons,
    (_updatedButtons) => {
      // Tidak disimpan otomatis ke server; konfigurasi hanya disimpan ketika pengguna menekan tombol simpan
    },
    showToast
  );

  // 7. Riwayat Transaksi LunasQRIS
  const transactionsState = useTransactions(showToast);

  // 8. Pengaturan Harga Produk (Markup Margin Rp atau %)
  const pricingState = usePricingConfig(showToast);

  // 9. Pengaturan Kupon Promo (Diskon Margin APK Premium)
  const promosState = usePromos(showToast);

  /*
  // Dinonaktifkan sementara untuk mempermudah perombakan tampilan dashboard
  // Jika sedang memverifikasi sesi login awal dari server
  if (auth.authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-sm font-medium">Memverifikasi sesi dashboard...</p>
      </div>
    );
  }

  // Jika belum login, tampilkan Login Page (seluruh dashboard terkunci rapat)
  if (!auth.isAuthenticated) {
    return <LoginPage onLogin={auth.login} />;
  }
  */

  // Cek apakah 3 data wajib Store Info sudah diisi lengkap
  const isStoreInfoComplete = Boolean(
    storeConfig.storeInfo?.storeName && storeConfig.storeInfo.storeName.trim() &&
    storeConfig.storeInfo?.ownerName && storeConfig.storeInfo.ownerName.trim() &&
    storeConfig.storeInfo?.ownerNumber && storeConfig.storeInfo.ownerNumber.trim()
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans selection:bg-[#0084D1]/20 antialiased flex">
      {/* 1. Desktop Sidebar (Left) */}
      <DesktopSidebar
        selectedTab={selectedTab}
        setSelectedTab={(tab) => {
          setSelectedTab(tab);
          setIsMobileMenuOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        botData={botConn.botData}
        storeInfo={storeConfig.storeInfo}
        promosCount={promosState.promos.filter((p) => p.isActive).length}
        transactionsCount={transactionsState.transactions.length}
        groupsCount={groupsData.groups.filter((g) => g.enabled).length}
        username={auth.user?.username}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogout={auth.logout}
      />

      {/* 2. Main Content Area (Right) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Desktop Top Nav */}
        <DesktopTopNav
          selectedTab={selectedTab}
          botData={botConn.botData}
          xavieraProfile={xaviera.xavieraProfile}
          lunasQrisBalance={lunasQrisData.lunasQrisBalance}
          onRefreshProfile={xaviera.fetchXavieraProfile}
          onRefreshLunasQris={() => lunasQrisData.fetchLunasQrisBalance(true)}
          onNavigateToConnection={() => {
            setSelectedTab('Connection');
            setIsMobileMenuOpen(false);
          }}
          username={auth.user?.username}
          onLogout={auth.logout}
          showToast={showToast}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          storeName={storeConfig.storeInfo?.storeName}
        />

        {/* Main Workspace */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-6 shadow-2xs">
            <TabContentRenderer
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              storeConfig={storeConfig}
              xaviera={xaviera}
              groupsData={groupsData}
              buttonModal={buttonModal}
              botConn={botConn}
              transactionsState={transactionsState}
              pricingState={pricingState}
              promosState={promosState}
              lunasQrisData={lunasQrisData}
              showToast={showToast}
            />
          </div>
        </main>

        {/* 5. Modal Popup: Add & Edit Button */}
        <AddEditButtonModal
          isOpen={buttonModal.isAddButtonModalOpen}
          onClose={() => {
            buttonModal.setIsAddButtonModalOpen(false);
            buttonModal.setEditingButtonId(null);
          }}
          editingButtonId={buttonModal.editingButtonId}
          modalBtnType={buttonModal.modalBtnType}
          setModalBtnType={buttonModal.setModalBtnType}
          modalBtnName={buttonModal.modalBtnName}
          setModalBtnName={buttonModal.setModalBtnName}
          quickReplyAction={buttonModal.quickReplyAction}
          setQuickReplyAction={buttonModal.setQuickReplyAction}
          quickReplyOutput={buttonModal.quickReplyOutput}
          setQuickReplyOutput={buttonModal.setQuickReplyOutput}
          urlOutput={buttonModal.urlOutput}
          setUrlOutput={buttonModal.setUrlOutput}
          copyOutput={buttonModal.copyOutput}
          setCopyOutput={buttonModal.setCopyOutput}
          callTarget={buttonModal.callTarget}
          setCallTarget={buttonModal.setCallTarget}
          callPhone={buttonModal.callPhone}
          setCallPhone={buttonModal.setCallPhone}
          reminderOutput={buttonModal.reminderOutput}
          setReminderOutput={buttonModal.setReminderOutput}
          cancelReminderOutput={buttonModal.cancelReminderOutput}
          setCancelReminderOutput={buttonModal.setCancelReminderOutput}
          onSave={buttonModal.handleSaveButton}
        />

        {/* Pop-up Modal Wajib Isi Store Info (Non-dismissible) */}
        {!isStoreInfoComplete && (
          <MandatoryStoreSetupModal
            initialStoreInfo={storeConfig.storeInfo}
            onSuccess={(updated) => {
              storeConfig.setStoreInfo((prev) => ({ ...prev, ...updated }));
              showToast('Informasi toko berhasil disimpan! Bot siap digunakan.');
            }}
          />
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>&copy; Wanzt Store Dashboard</span>
            <span className="text-slate-400">WhatsApp Bot Management System</span>
          </div>
        </footer>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
