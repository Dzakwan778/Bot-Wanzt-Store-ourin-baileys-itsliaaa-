import React from 'react';
import {
  Users,
  RefreshCw,
  Search,
  X,
  Check,
  Copy,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { WhatsAppGroupItem } from '../../types/dashboard.types';

interface TabGrupProps {
  groups: WhatsAppGroupItem[];
  groupSearchQuery: string;
  setGroupSearchQuery: (val: string) => void;
  isLoadingGroups: boolean;
  groupsError: string | null;
  togglingGroupId: string | null;
  copiedGroupId: string | null;
  fetchGroups: () => void;
  handleToggleGroup: (groupId: string, currentEnabled: boolean) => void;
  copyGroupIdToClipboard: (groupId: string) => void;
  botStatus: string;
  groupOnly: boolean;
  isTogglingGroupOnly: boolean;
  handleToggleGroupOnly: () => void;
}

export const TabGrup: React.FC<TabGrupProps> = ({
  groups,
  groupSearchQuery,
  setGroupSearchQuery,
  isLoadingGroups,
  groupsError,
  togglingGroupId,
  copiedGroupId,
  fetchGroups,
  handleToggleGroup,
  copyGroupIdToClipboard,
  botStatus,
  groupOnly,
  isTogglingGroupOnly,
  handleToggleGroupOnly,
}) => {
  const isConnected = botStatus === 'connected';
  const activeCount = groups.filter((g) => g.enabled).length;
  const inactiveCount = groups.length - activeCount;

  return (
    <div className="space-y-4">
      {/* Header Ringkas */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
            Daftar Grup WhatsApp
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Aktifkan toggle pada grup yang diizinkan merespon bot.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchGroups}
          disabled={isLoadingGroups}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingGroups ? 'animate-spin text-sky-600' : ''}`} />
          <span>{isLoadingGroups ? 'Memuat...' : 'Muat Ulang'}</span>
        </button>
      </div>

      {/* Kartu Pengaturan Mode "Grup Only" (Desain tenang tanpa banner kuning mencolok) */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${
          groupOnly
            ? 'bg-emerald-50/40 border-emerald-200'
            : 'bg-white border-slate-200/90 shadow-2xs'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                groupOnly
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {groupOnly ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Grup Only
                </h4>
                <span
                  data-testid="group-only-badge"
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    groupOnly
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {groupOnly ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {groupOnly
                  ? 'Bot hanya merespon di grup whitelist dan diam di chat pribadi (DM), kecuali kelanjutan checkout order dari grup.'
                  : 'Disarankan aktif agar bot hanya merespon di grup whitelist dan mengurangi risiko blokir WhatsApp di chat pribadi (DM).'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-label="Grup Only"
            aria-checked={groupOnly}
            data-testid="toggle-group-only"
            disabled={isTogglingGroupOnly}
            onClick={handleToggleGroupOnly}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600/30 mt-0.5 ${
              groupOnly ? 'bg-emerald-500' : 'bg-slate-300'
            } ${isTogglingGroupOnly ? 'opacity-60 cursor-wait' : ''}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                groupOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Pencarian & Statistik 1 Baris Rapi */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={groupSearchQuery}
            onChange={(e) => setGroupSearchQuery(e.target.value)}
            placeholder="Cari nama atau ID grup..."
            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition"
          />
          {groupSearchQuery && (
            <button
              type="button"
              onClick={() => setGroupSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-center">
            Total <strong className="text-slate-900">{groups.length}</strong>
          </span>
          <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-700 text-center">
            Aktif <strong>{activeCount}</strong>
          </span>
          <span className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-center">
            Off <strong>{inactiveCount}</strong>
          </span>
        </div>
      </div>

      {/* Notice teknis netral hanya bila bot SUDAH terhubung tapi fetch error */}
      {isConnected && groupsError && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">{groupsError}</p>
          <button
            type="button"
            onClick={fetchGroups}
            className="text-xs font-semibold text-[#0084D1] hover:underline cursor-pointer shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loading State / Daftar Grup / Empty State Netral */}
      {isLoadingGroups ? (
        <div className="py-10 text-center space-y-2.5 bg-white border border-slate-200 rounded-2xl">
          <RefreshCw className="w-6 h-6 text-sky-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            Mengambil daftar grup WhatsApp...
          </p>
        </div>
      ) : !isConnected && groups.length === 0 ? (
        <div className="py-10 px-4 text-center space-y-2 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-800">
            Bot WhatsApp Belum Terhubung
          </p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            Hubungkan bot terlebih dahulu melalui menu Connection untuk memuat daftar grup.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
          {(() => {
            const q = groupSearchQuery.trim().toLowerCase();
            const filtered = groups.filter(
              (g) =>
                !q ||
                g.subject.toLowerCase().includes(q) ||
                g.id.toLowerCase().includes(q)
            );

            if (filtered.length === 0) {
              return (
                <div className="py-10 text-center text-slate-500 px-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-700 text-xs">
                    {groupSearchQuery
                      ? 'Tidak ada grup yang sesuai dengan pencarian.'
                      : 'Belum ada grup yang diikuti oleh nomor bot.'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {groupSearchQuery
                      ? 'Coba kata kunci pencarian lain.'
                      : 'Tambahkan bot ke grup WhatsApp, lalu ketuk Muat Ulang.'}
                  </p>
                </div>
              );
            }

            return (
              <>
                {/* Tampilan Mobile: Card View */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {filtered.map((grp) => {
                    const isToggling = togglingGroupId === grp.id;
                    const isCopied = copiedGroupId === grp.id;

                    return (
                      <div
                        key={grp.id}
                        className={`p-3.5 space-y-2.5 transition-colors ${
                          grp.enabled ? 'bg-sky-50/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {grp.subject ? grp.subject.substring(0, 2).toUpperCase() : 'GP'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-slate-900 leading-snug truncate">
                                {grp.subject || 'Tanpa Nama Grup'}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span>{grp.memberCount} Anggota</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={grp.enabled}
                              disabled={isToggling}
                              onClick={() => handleToggleGroup(grp.id, grp.enabled)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                grp.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                              } ${isToggling ? 'opacity-60 cursor-wait' : ''}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  grp.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-[10px] font-mono font-semibold ${
                                grp.enabled ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {grp.enabled ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-between gap-2 border border-slate-200/80">
                          <code className="text-[10.5px] font-mono text-slate-700 truncate select-all">
                            {grp.id}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyGroupIdToClipboard(grp.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 shrink-0 inline-flex items-center gap-1 cursor-pointer transition"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-500" />
                                <span>Salin ID</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tampilan Desktop: Tabel */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                        <th className="px-4 py-3 text-center w-28">Toggle Status</th>
                        <th className="px-4 py-3 min-w-[200px]">Nama Grup</th>
                        <th className="px-4 py-3 w-36">Jumlah Anggota</th>
                        <th className="px-4 py-3 min-w-[240px]">ID Grup (JID)</th>
                        <th className="px-4 py-3 w-32 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((grp) => {
                        const isToggling = togglingGroupId === grp.id;
                        const isCopied = copiedGroupId === grp.id;

                        return (
                          <tr
                            key={grp.id}
                            className={`transition-colors hover:bg-slate-50/70 ${
                              grp.enabled ? 'bg-sky-50/20' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={grp.enabled}
                                  disabled={isToggling}
                                  onClick={() => handleToggleGroup(grp.id, grp.enabled)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600/30 ${
                                    grp.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                                  } ${isToggling ? 'opacity-60 cursor-wait' : ''}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                      grp.enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-[10px] font-mono font-semibold ${
                                    grp.enabled ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {grp.enabled ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {grp.subject ? grp.subject.substring(0, 2).toUpperCase() : 'GP'}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 block truncate text-xs">
                                    {grp.subject || 'Tanpa Nama Grup'}
                                  </span>
                                  {grp.desc ? (
                                    <span className="text-[11px] text-slate-500 truncate block max-w-xs mt-0.5">
                                      {grp.desc}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic block mt-0.5">
                                      Grup WhatsApp Aktif
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono font-semibold text-xs bg-slate-100 text-slate-700 border border-slate-200">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                <span>{grp.memberCount} Anggota</span>
                              </span>
                            </td>

                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-1.5">
                                <code className="text-[11px] font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 select-all truncate max-w-xs block">
                                  {grp.id}
                                </code>
                                <button
                                  type="button"
                                  title="Salin ID Grup"
                                  onClick={() => copyGroupIdToClipboard(grp.id)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right align-middle">
                              <button
                                type="button"
                                onClick={() => copyGroupIdToClipboard(grp.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700">Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-500" />
                                    <span>Salin ID</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
