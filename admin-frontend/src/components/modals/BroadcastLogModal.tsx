import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  RotateCcw,
  MessageSquare,
  Send,
} from 'lucide-react';
import { BroadcastCampaign, BroadcastLogEntry } from '../../types/admin.types.ts';
import { describeScheduleRule, formatWibDateTime } from '../../utils/broadcastFormat.ts';
import { adminFetch } from '../../utils/adminAuth.ts';

interface BroadcastLogModalProps {
  isOpen: boolean;
  campaign: BroadcastCampaign | null;
  onClose: () => void;
  onUpdated: () => void;
  showToast: (msg: string) => void;
}

export const BroadcastLogModal: React.FC<BroadcastLogModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onUpdated,
  showToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [logs, setLogs] = useState<BroadcastLogEntry[]>([]);
  const [availableRuns, setAvailableRuns] = useState<number[]>([]);
  const [selectedRun, setSelectedRun] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'telegram'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCampaign, setActiveCampaign] = useState<BroadcastCampaign | null>(campaign);

  const fetchLogs = async (campaignId: number, run?: number) => {
    setLoading(true);
    try {
      const qs = run ? `?run=${run}` : '';
      const res = await adminFetch(`/api/admin/broadcasts/${campaignId}/logs${qs}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setAvailableRuns(data.availableRuns || []);
        if (data.campaign) setActiveCampaign(data.campaign);
      } else {
        showToast(data.message || 'Gagal memuat log detail broadcast');
      }
    } catch (err: any) {
      showToast('Koneksi gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && campaign) {
      setActiveCampaign(campaign);
      const defaultRun = campaign.run_count > 0 ? campaign.run_count : 'all';
      setSelectedRun(defaultRun);
      setStatusFilter('all');
      setChannelFilter('all');
      setSearchQuery('');
      fetchLogs(campaign.id, typeof defaultRun === 'number' ? defaultRun : undefined);
    }
  }, [isOpen, campaign?.id]);

  const handleRunChange = (val: string) => {
    if (!campaign) return;
    if (val === 'all') {
      setSelectedRun('all');
      fetchLogs(campaign.id);
    } else {
      const runNum = Number(val);
      setSelectedRun(runNum);
      fetchLogs(campaign.id, runNum);
    }
  };

  const handleRetryFailed = async () => {
    if (!campaign) return;
    setRetrying(true);
    try {
      const runNum = typeof selectedRun === 'number' ? selectedRun : campaign.run_count;
      const res = await adminFetch(`/api/admin/broadcasts/${campaign.id}/retry-failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runNumber: runNum }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Pengiriman ulang selesai.');
        await fetchLogs(campaign.id, typeof selectedRun === 'number' ? selectedRun : undefined);
        onUpdated();
      } else {
        showToast(data.message || 'Gagal mengirim ulang pesan.');
      }
    } catch (err: any) {
      showToast('Error jaringan: ' + err.message);
    } finally {
      setRetrying(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (channelFilter !== 'all' && entry.channel !== channelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          entry.store_name.toLowerCase().includes(q) ||
          entry.tenant_id.toLowerCase().includes(q) ||
          entry.owner_name.toLowerCase().includes(q) ||
          entry.target.toLowerCase().includes(q) ||
          (entry.error_message || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [logs, statusFilter, channelFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = logs.length;
    const success = logs.filter((l) => l.status === 'success').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    return { total, success, failed };
  }, [logs]);

  if (!isOpen || !campaign) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-log-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90dvh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="min-w-0">
            <h3 id="broadcast-log-modal-title" className="text-base font-bold text-slate-900 truncate">
              Log Detail Pengiriman: {activeCampaign?.title || campaign.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {describeScheduleRule(activeCampaign || campaign)} · Terakhir dikirim:{' '}
              {formatWibDateTime(activeCampaign?.last_run_at || campaign.last_run_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition cursor-pointer shrink-0"
            aria-label="Tutup modal log detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Cuplikan Pesan & Statistik Ringkas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-1.5">
                Isi Pesan Broadcast
              </div>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-28 overflow-y-auto">
                {activeCampaign?.message || campaign.message}
              </pre>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] text-slate-500 font-medium">Total Log</div>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    {stats.total}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
                  <div className="text-[11px] text-emerald-700 font-medium">Berhasil</div>
                  <div className="text-base font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                    {stats.success}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200/80">
                  <div className="text-[11px] text-rose-700 font-medium">Gagal</div>
                  <div className="text-base font-bold text-rose-700 font-mono tabular-nums mt-0.5">
                    {stats.failed}
                  </div>
                </div>
              </div>

              {stats.failed > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  disabled={retrying || loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] disabled:opacity-50 rounded-xl transition cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                  <span>{retrying ? 'Mengirim Ulang...' : `Kirim Ulang yang Gagal (${stats.failed})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Kontrol Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {availableRuns.length > 1 && (
                <select
                  aria-label="Pilih riwayat eksekusi"
                  value={selectedRun}
                  onChange={(e) => handleRunChange(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[#0084D1]"
                >
                  <option value="all">Semua Eksekusi</option>
                  {availableRuns.map((runNum) => (
                    <option key={runNum} value={runNum}>
                      Eksekusi ke-{runNum}
                      {runNum === campaign.run_count ? ' (Terbaru)' : ''}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['all', 'success', 'failed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'all' ? 'Semua' : st === 'success' ? 'Berhasil' : 'Gagal'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['all', 'whatsapp', 'telegram'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannelFilter(ch)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer whitespace-nowrap ${
                      channelFilter === ch
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ch === 'all' ? 'Semua Kanal' : ch === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari toko, owner, error..."
                  aria-label="Cari log tenant"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1]"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  fetchLogs(campaign.id, typeof selectedRun === 'number' ? selectedRun : undefined)
                }
                disabled={loading}
                className="p-1.5 text-slate-600 hover:text-[#0084D1] bg-slate-50 border border-slate-300 rounded-lg transition cursor-pointer"
                aria-label="Muat ulang log"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0084D1]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabel Log Per-Tenant */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">Toko & Owner</th>
                    <th className="py-2.5 px-3.5">Kanal</th>
                    <th className="py-2.5 px-3.5">Target</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Keterangan / Alasan</th>
                    <th className="py-2.5 px-3.5 text-right">Waktu Kirim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Memuat rincian log pengiriman...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Tidak ada catatan log pengiriman yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 align-top">
                          <div className="font-semibold text-slate-900">{entry.store_name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {entry.owner_name} · <span className="font-mono">{entry.tenant_id}</span>
                            {selectedRun === 'all' && availableRuns.length > 1 && (
                              <span> · Run #{entry.run_number}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                            {entry.channel === 'whatsapp' ? (
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Send className="w-3.5 h-3.5 text-[#0084D1]" />
                            )}
                            <span>{entry.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 align-top font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {entry.target || '-'}
                        </td>
                        <td className="py-2.5 px-3.5 align-top whitespace-nowrap">
                          {entry.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Berhasil</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Gagal</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 align-top text-slate-600 max-w-xs">
                          {entry.status === 'success' ? (
                            <span className="text-slate-500">Pesan berhasil dikirim oleh bot tenant</span>
                          ) : (
                            <span className="text-rose-700 font-medium">
                              {entry.error_message || 'Pengiriman gagal'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 align-top text-right text-slate-500 font-mono tabular-nums whitespace-nowrap">
                          {formatWibDateTime(entry.sent_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
