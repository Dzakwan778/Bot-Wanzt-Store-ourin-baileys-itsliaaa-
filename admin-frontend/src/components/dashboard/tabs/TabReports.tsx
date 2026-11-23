import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flag,
  Clock,
  User,
  Phone,
  Hash,
  Search,
  RefreshCw,
  Loader2,
  X,
  CheckCircle2,
  Wrench,
  AlertCircle,
  Paperclip,
  MessageSquareReply,
} from 'lucide-react';
import { adminFetch } from '../../../utils/adminAuth.ts';

export type AdminReportStatus = 'terkirim' | 'proses' | 'selesai';

export interface AdminReportMedia {
  id: number;
  mediaType: 'image' | 'video';
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface AdminReportItem {
  id: number;
  tenantId: string;
  storeName: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  message: string;
  status: AdminReportStatus;
  replyEnabled: boolean;
  adminReply: string;
  createdAt: string;
  updatedAt: string;
  media: AdminReportMedia[];
}

export interface ReportStatusCounts {
  all: number;
  terkirim: number;
  proses: number;
  selesai: number;
}

interface TabReportsProps {
  showToast: (msg: string) => void;
  onCountsUpdated?: (counts: ReportStatusCounts) => void;
}

function getStatusBadge(status: AdminReportStatus) {
  switch (status) {
    case 'proses':
      return {
        label: 'Proses',
        className: 'bg-amber-50 text-amber-800 border border-amber-200',
      };
    case 'selesai':
      return {
        label: 'Selesai',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    case 'terkirim':
    default:
      return {
        label: 'Terkirim',
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
      };
  }
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AdminProtectedMediaPreview: React.FC<{ media: AdminReportMedia }> = ({ media }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    setObjectUrl(null);
    setLoadError(false);

    adminFetch(media.url)
      .then(async (res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const blob = await res.blob();
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [media.url]);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
      {loadError ? (
        <div className="p-4 text-center text-xs text-rose-600">
          Gagal memuat lampiran media ({media.originalName}).
        </div>
      ) : !objectUrl ? (
        <div className="p-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memuat media...</span>
        </div>
      ) : media.mediaType === 'image' ? (
        <a
          href={objectUrl}
          target="_blank"
          rel="noreferrer"
          className="block bg-slate-100"
        >
          <img
            src={objectUrl}
            alt={media.originalName}
            className="w-full max-h-72 object-contain mx-auto"
          />
        </a>
      ) : (
        <video
          controls
          preload="metadata"
          src={objectUrl}
          className="w-full max-h-72 bg-black"
        />
      )}

      <div className="px-3 py-2 border-t border-slate-200/80 bg-white flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="truncate font-medium text-slate-700">{media.originalName}</span>
        <span className="font-mono shrink-0">{formatBytes(media.sizeBytes)}</span>
      </div>
    </div>
  );
};

export const TabReports: React.FC<TabReportsProps> = ({
  showToast,
  onCountsUpdated,
}) => {
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [counts, setCounts] = useState<ReportStatusCounts>({
    all: 0,
    terkirim: 0,
    proses: 0,
    selesai: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'all' | AdminReportStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<AdminReportItem | null>(null);

  // State modal balasan & aksi admin
  const [replyEnabled, setReplyEnabled] = useState(false);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [savingAction, setSavingAction] = useState<'proses' | 'selesai' | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await adminFetch('/api/admin/reports?status=all');
        const data = await res.json();
        if (res.ok && data.success) {
          const list: AdminReportItem[] = Array.isArray(data.reports) ? data.reports : [];
          const nextCounts: ReportStatusCounts = data.counts || {
            all: list.length,
            terkirim: list.filter((r) => r.status === 'terkirim').length,
            proses: list.filter((r) => r.status === 'proses').length,
            selesai: list.filter((r) => r.status === 'selesai').length,
          };
          setReports(list);
          setCounts(nextCounts);
          onCountsUpdated?.(nextCounts);
        } else if (!silent) {
          showToast(data.message || 'Gagal memuat laporan tenant.');
        }
      } catch (err: any) {
        if (!silent) showToast('Error memuat laporan: ' + err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [onCountsUpdated, showToast]
  );

  useEffect(() => {
    fetchReports(false);
  }, [fetchReports]);

  const openReportDetail = (report: AdminReportItem) => {
    setSelectedReport(report);
    setReplyEnabled(Boolean(report.replyEnabled));
    setAdminReplyText(report.adminReply || '');
    setModalError(null);
  };

  const handleUpdateReportStatus = async (nextStatus: 'proses' | 'selesai') => {
    if (!selectedReport) return;

    if (nextStatus === 'selesai' && replyEnabled && !adminReplyText.trim()) {
      setModalError(
        'Isi pesan balasan terlebih dahulu atau matikan toggle balasan sebelum menyelesaikan laporan.'
      );
      return;
    }

    setSavingAction(nextStatus);
    setModalError(null);
    try {
      const res = await adminFetch(`/api/admin/reports/${selectedReport.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          replyEnabled,
          adminReply: adminReplyText,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.report) {
        setModalError(data.message || 'Gagal memperbarui status laporan.');
        return;
      }

      const updated: AdminReportItem = data.report;
      setSelectedReport(updated);
      setReplyEnabled(Boolean(updated.replyEnabled));
      setAdminReplyText(updated.adminReply || '');

      showToast(
        nextStatus === 'proses'
          ? 'Laporan ditandai sedang diproses.'
          : 'Laporan ditandai selesai.'
      );
      await fetchReports(true);
    } catch (err: any) {
      setModalError(err?.message || 'Terjadi kesalahan saat menyimpan status laporan.');
    } finally {
      setSavingAction(null);
    }
  };

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.ownerPhone.toLowerCase().includes(q) ||
        item.tenantId.toLowerCase().includes(q) ||
        item.storeName.toLowerCase().includes(q)
      );
    });
  }, [reports, statusFilter, searchQuery]);

  const filterTabs: Array<{ id: 'all' | AdminReportStatus; label: string; count: number }> = [
    { id: 'all', label: 'Semua', count: counts.all },
    { id: 'terkirim', label: 'Terkirim', count: counts.terkirim },
    { id: 'proses', label: 'Proses', count: counts.proses },
    { id: 'selesai', label: 'Selesai', count: counts.selesai },
  ];

  return (
    <div className="space-y-5">
      {/* Bar Kontrol Filter & Pencarian */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {filterTabs.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  data-testid={`admin-reports-filter-${tab.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari owner, ID tenant, judul..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 placeholder-slate-400 focus:border-[#0084D1] focus:outline-none transition"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchReports(false)}
              disabled={loading}
              title="Muat ulang laporan"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-[#0084D1] transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0084D1]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Daftar Laporan Tenant */}
      {loading && reports.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center text-xs text-slate-500 shadow-xs">
          Memuat daftar laporan para tenant...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center space-y-2 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
            <Flag className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Tidak Ada Laporan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Tidak ada laporan yang cocok dengan filter pencarian saat ini.'
              : 'Belum ada laporan masalah yang dikirimkan oleh tenant.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredReports.map((report) => {
            const badge = getStatusBadge(report.status);
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => openReportDetail(report)}
                data-testid={`admin-report-item-${report.id}`}
                className="w-full text-left bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-[#0084D1]/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {report.ownerName || '-'}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-xs font-mono text-slate-500">
                      {report.tenantId}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(report.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0084D1] transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {report.message}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
                  {report.media.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px]">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{report.media.length}</span>
                    </span>
                  )}
                  <span className="text-xs font-semibold text-[#0084D1] group-hover:underline">
                    Lihat Detail
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Detail Laporan & Aksi Master Admin */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50"
          onClick={() => !savingAction && setSelectedReport(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-report-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
          >
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  data-testid="admin-report-detail-status"
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${getStatusBadge(selectedReport.status).className}`}
                >
                  {getStatusBadge(selectedReport.status).label}
                </span>
                <span className="text-xs font-mono text-slate-500 truncate">
                  Laporan #{selectedReport.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={Boolean(savingAction)}
                aria-label="Tutup detail laporan admin"
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Isi Detail Laporan */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Info Tenant & Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-500 block">Nama Owner</span>
                    <span className="font-bold text-slate-900 break-words">
                      {selectedReport.ownerName || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-500 block">Nomor Owner</span>
                    <span className="font-mono font-bold text-slate-900 break-all">
                      {selectedReport.ownerPhone || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Hash className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-500 block">ID Tenant</span>
                    <span className="font-mono font-bold text-slate-900 break-all">
                      {selectedReport.tenantId}
                    </span>
                    {selectedReport.storeName && (
                      <span className="text-[11px] text-slate-500 block truncate">
                        {selectedReport.storeName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-500 block">Waktu Dibuat</span>
                    <span className="font-semibold text-slate-900">
                      {formatDateTime(selectedReport.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nama & Pesan Laporan */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Nama Laporan
                </span>
                <h3
                  id="admin-report-modal-title"
                  className="text-base font-bold text-slate-900 break-words"
                >
                  {selectedReport.title}
                </h3>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Pesan Laporan
                </span>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
                  {selectedReport.message}
                </div>
              </div>

              {/* Lampiran Media */}
              {selectedReport.media.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Lampiran Media ({selectedReport.media.length})
                  </span>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedReport.media.map((media) => (
                      <AdminProtectedMediaPreview key={media.id} media={media} />
                    ))}
                  </div>
                </div>
              )}

              {/* Bagian Bawah: Toggle Balasan Opsional ON/OFF & Form Pesan Balasan */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquareReply className="w-4 h-4 text-[#0084D1] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        Balas Laporan Tenant
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Aktifkan jika ingin melampirkan balasan saat laporan selesai.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={replyEnabled}
                    aria-label="Aktifkan balasan admin"
                    data-testid="admin-report-reply-toggle"
                    disabled={Boolean(savingAction)}
                    onClick={() => {
                      setReplyEnabled((prev) => !prev);
                      if (modalError) setModalError(null);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0084D1]/40 disabled:opacity-50 ${
                      replyEnabled ? 'bg-[#0084D1]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                        replyEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {replyEnabled && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-report-reply-input"
                      className="text-xs font-semibold text-slate-700 block"
                    >
                      Pesan Balasan Admin
                    </label>
                    <textarea
                      id="admin-report-reply-input"
                      data-testid="admin-report-reply-textarea"
                      rows={3}
                      value={adminReplyText}
                      onChange={(e) => {
                        setAdminReplyText(e.target.value);
                        if (modalError) setModalError(null);
                      }}
                      placeholder="Tulis balasan untuk tenant (tampil di tenant ketika status Selesai)..."
                      disabled={Boolean(savingAction)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition resize-y min-h-[84px]"
                    />
                  </div>
                )}

                {modalError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* 2 Tombol Aksi Utama: Proses Laporan & Laporan Selesai */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateReportStatus('proses')}
                    disabled={Boolean(savingAction)}
                    data-testid="admin-report-btn-proses"
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {savingAction === 'proses' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wrench className="w-4 h-4" />
                    )}
                    <span>Proses Laporan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateReportStatus('selesai')}
                    disabled={Boolean(savingAction)}
                    data-testid="admin-report-btn-selesai"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {savingAction === 'selesai' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Laporan Selesai</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
