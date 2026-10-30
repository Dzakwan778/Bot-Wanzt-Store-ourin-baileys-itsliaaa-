import React, { useState } from 'react';
import {
  Store,
  MessageSquareCode,
  Package,
  Tag,
  Share2,
  Gamepad2,
  Users,
  Receipt,
  QrCode,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Wifi,
  WifiOff,
  Clock,
  AlertCircle,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { BotStatusResponse, StoreInfoConfig } from '../../types/dashboard.types';

interface DesktopSidebarProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  botData: BotStatusResponse;
  storeInfo: StoreInfoConfig;
  promosCount?: number;
  transactionsCount?: number;
  groupsCount?: number;
  username?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  selectedTab,
  setSelectedTab,
  isCollapsed,
  setIsCollapsed,
  botData,
  storeInfo,
  promosCount = 0,
  transactionsCount = 0,
  groupsCount = 0,
  username = 'Admin',
}) => {
  // Collapsible category state (matching reference chevron)
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);
  const [isActivityOpen, setIsActivityOpen] = useState(true);

  // Status Bot Helper
  const getBotStatusBadge = () => {
    switch (botData.status) {
      case 'connected':
        return { label: 'Online', bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-300' };
      case 'waiting_code':
      case 'code_ready':
        return { label: 'Pairing', bg: 'bg-[#0084D1]', text: 'text-[#0084D1]', border: 'border-sky-300' };
      case 'connecting':
        return { label: 'Connecting', bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-300' };
      case 'error':
        return { label: 'Error', bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-300' };
      default:
        return { label: 'Offline', bg: 'bg-slate-400', text: 'text-slate-600', border: 'border-slate-300' };
    }
  };

  const statusBadge = getBotStatusBadge();

  // Menu Definition
  const mainNavItems: NavItem[] = [
    {
      id: 'Connection',
      label: 'Koneksi Bot',
      icon: QrCode,
      badge: statusBadge.label,
      badgeColor: botData.status === 'connected' ? 'bg-emerald-600' : 'bg-[#0084D1]',
    },
    {
      id: 'Store Info',
      label: 'Store Info',
      icon: Store,
    },
    {
      id: 'Command',
      label: 'Command Bot',
      icon: MessageSquareCode,
    },
  ];

  const catalogNavItems: NavItem[] = [
    {
      id: 'Produk',
      label: 'Produk APK',
      icon: Package,
    },
    {
      id: 'Kupon Promo',
      label: 'Kupon Promo',
      icon: Tag,
      badge: promosCount > 0 ? promosCount : undefined,
      badgeColor: 'bg-[#0084D1]',
    },
    {
      id: 'SMM',
      label: 'Layanan SMM',
      icon: Share2,
    },
    {
      id: 'Top Up',
      label: 'Top Up Game',
      icon: Gamepad2,
    },
  ];

  const activityNavItems: NavItem[] = [
    {
      id: 'Grup',
      label: 'Grup Whitelist',
      icon: Users,
      badge: groupsCount > 0 ? groupsCount : undefined,
    },
    {
      id: 'Transaksi',
      label: 'Riwayat Transaksi',
      icon: Receipt,
      badge: transactionsCount > 0 ? transactionsCount : undefined,
    },
  ];

  const renderNavItem = (item: NavItem) => {
    const isActive =
      selectedTab === item.id ||
      (item.id === 'SMM' && (selectedTab === 'SSM' || selectedTab === 'tab02')) ||
      (item.id === 'Top Up' && selectedTab === 'tab03') ||
      (item.id === 'Grup' && (selectedTab === 'tab04' || selectedTab === 'Grup')) ||
      (item.id === 'Transaksi' && (selectedTab === 'tab05' || selectedTab === 'Transaksi')) ||
      (item.id === 'Connection' && (selectedTab === 'tab06' || selectedTab === 'Connection')) ||
      (item.id === 'Kupon Promo' && (selectedTab === 'Promo' || selectedTab === 'tabPromo'));

    const Icon = item.icon;

    if (isCollapsed) {
      return (
        <div key={item.id} className="relative group flex items-center justify-center my-1">
          {/* Active indicator line on the very left border */}
          {isActive && (
            <div className="absolute left-0 w-1 h-7 rounded-r-full bg-[#0084D1]" />
          )}

          <button
            type="button"
            onClick={() => setSelectedTab(item.id)}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isActive
                ? 'bg-[#0084D1]/12 text-[#0084D1] font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Floating Tooltip for Collapsed State */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#0084D1] text-white">
                {item.badge}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className="relative flex items-center my-0.5">
        {/* Active indicator line on the very left border (reference style) */}
        {isActive && (
          <div className="absolute left-0 w-1.25 h-7 rounded-r-full bg-[#0084D1]" />
        )}

        <button
          type="button"
          onClick={() => setSelectedTab(item.id)}
          className={`w-full flex items-center justify-between pl-4 pr-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            isActive
              ? 'bg-[#0084D1]/10 text-[#0084D1] font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon
              className={`w-4.5 h-4.5 shrink-0 stroke-[1.8] ${
                isActive ? 'text-[#0084D1]' : 'text-slate-400'
              }`}
            />
            <span className="truncate">{item.label}</span>
          </div>

          {item.badge !== undefined && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs ${
                isActive
                  ? 'bg-[#0084D1] text-white'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {item.badge}
            </span>
          )}
        </button>
      </div>
    );
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col justify-between transition-all duration-300 z-40 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Bagian Atas: Mac Dots & Brand Header */}
      <div className="flex flex-col flex-1 overflow-y-auto scrollbar-none">
        {/* 1. macOS Style Traffic Light Dots */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 hover:opacity-80 transition-opacity" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 hover:opacity-80 transition-opacity" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 hover:opacity-80 transition-opacity" />
          </div>

          {/* Toggle Button in Header */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title={isCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 2. Brand / Store Identity */}
        <div className="px-3 py-2 border-b border-slate-100">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0084D1] to-sky-400 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-[#0084D1]/20">
                W
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0084D1] to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-[#0084D1]/20 shrink-0">
                W
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-slate-900 truncate leading-tight tracking-tight">
                  {storeInfo.storeName || 'Wanzt Store'}
                </h1>
                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.bg}`} />
                  <span>WhatsApp Bot</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 3. Primary Action Button (Reference: "New Message" style) */}
        <div className="px-3 pt-3 pb-2">
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setSelectedTab('Connection')}
              title={`Status: ${statusBadge.label}`}
              className={`w-full h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                botData.status === 'connected'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-sky-200 bg-sky-50 text-[#0084D1] hover:bg-sky-100'
              }`}
            >
              <Radio className="w-4 h-4 animate-pulse" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedTab('Connection')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs group ${
                botData.status === 'connected'
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70'
                  : 'border-sky-200 bg-sky-50/70 text-[#0084D1] hover:bg-sky-100/70'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full ${statusBadge.bg} ${
                    botData.status === 'connected' ? 'animate-ping' : ''
                  }`}
                />
                <span className="text-xs font-semibold tracking-tight truncate">
                  {botData.status === 'connected' ? 'Bot Terhubung' : 'Hubungkan Bot'}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                {statusBadge.label}
              </span>
            </button>
          )}
        </div>

        {/* 4. Menu Utama */}
        <div className="px-2 py-1 space-y-0.5">
          {mainNavItems.map(renderNavItem)}
        </div>

        {/* 5. Section: KATALOG PRODUK */}
        <div className="px-2 pt-3">
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCatalogOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition cursor-pointer"
            >
              <span>Katalog &amp; Penjualan</span>
              {isCatalogOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {(!isCollapsed ? isCatalogOpen : true) && (
            <div className="space-y-0.5 mt-0.5">
              {catalogNavItems.map(renderNavItem)}
            </div>
          )}
        </div>

        {/* 6. Section: AKTIVITAS & SISTEM */}
        <div className="px-2 pt-3 pb-4">
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsActivityOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition cursor-pointer"
            >
              <span>Aktivitas &amp; Log</span>
              {isActivityOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {(!isCollapsed ? isActivityOpen : true) && (
            <div className="space-y-0.5 mt-0.5">
              {activityNavItems.map(renderNavItem)}
            </div>
          )}
        </div>
      </div>

      {/* Bagian Bawah: Profile Card / Quick Status */}
      <div className="border-t border-slate-100 p-2.5 bg-slate-50/50">
        {isCollapsed ? (
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0084D1] font-bold flex items-center justify-center text-xs border border-sky-200">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 ${statusBadge.bg}`}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100/60 transition">
            <div className="relative shrink-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-sky-100 text-[#0084D1] font-bold flex items-center justify-center text-xs border border-sky-200">
                {username.slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 ${statusBadge.bg}`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {storeInfo.ownerName || username}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                Admin Store · {statusBadge.label}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
