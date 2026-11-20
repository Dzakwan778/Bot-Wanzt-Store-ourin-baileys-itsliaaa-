import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag,
  Plus,
  RefreshCw,
  Paperclip,
  MessageSquareReply,
  ChevronRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  TenantReportItem,
  formatReportTimestamp,
  getReportStatusBadge,
} from '../../utils/reportHelpers';
import { CreateReportModal } from '../modals/CreateReportModal';
import { TenantReportDetailModal } from '../modals/TenantReportDetailModal';

interface TabLaporanProps {
  showToast: (msg: string) => void;
}

export const TabLaporan: React.FC<TabLaporanProps> = ({ showToast }) => {
  const [reports, setReports] = useState<TenantReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('wanzt:session-revoked'));
        return;
      }
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
        setError(null);
      } else {
        if (!silent) setError(data.error || 'Gagal memuat daftar laporan.');
      }
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Gagal terhubung ke server.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(false);
    const interval = window.setInterval(() => {
      fetchReports(true);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [fetchReports]);

  const activeReport =
    selectedReportId !== null
      ? reports.find((r) => r.id === selectedReportId) || null
      : null;

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 sm:pb-16">
      {/* Header Daftar Laporan */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-[#0084D1] flex items-center justify-center shrink-0">
            <Flag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
              Laporan Masalah
            </h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              Riwayat laporan kendala yang Anda kirimkan ke admin.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchReports(false)}
          disabled={loading}
          aria-label="Muat ulang daftar laporan"
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0084D1]' : ''}`} />
          <span className="hidden sm:inline">Muat Ulang</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchReports(false)}
            className="text-rose-800 font-bold underline cursor-pointer shrink-0"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Daftar Laporan */}
      {loading && reports.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center text-xs text-slate-500 shadow-2xs">
          Memuat daftar laporan...
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-10 text-center space-y-2.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
            <Flag className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Belum Ada Laporan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Jika Anda mengalami kendala pada bot atau transaksi, tekan tombol + di pojok kanan bawah untuk membuat laporan baru.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reports.map((report) => {
            const badge = getReportStatusBadge(report.status);
            const hasVisibleReply =
              report.status === 'selesai' &&
              typeof report.adminReply === 'string' &&
              report.adminReply.trim().length > 0;

            return (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                data-testid={`tenant-report-item-${report.id}`}
                className="w-full text-left bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-[#0084D1]/40 rounded-2xl p-4 shadow-2xs transition-all cursor-pointer flex items-start justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatReportTimestamp(report.createdAt)}</span>
                    </span>
                    {report.media.length > 0 && (
                      <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        <span>{report.media.length} media</span>
                      </span>
                    )}
                    {hasVisibleReply && (
                      <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1">
                        <MessageSquareReply className="w-3 h-3" />
                        <span>Ada balasan admin</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0084D1] transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {report.message}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0084D1] shrink-0 mt-1 transition-colors" />
              </button>
            );
          })}
        </div>
      )}

      {/* Tombol Melayang "+" untuk Membuat Laporan Baru */}
      <button
        type="button"
        onClick={() => setIsCreateOpen(true)}
        aria-label="Buat laporan masalah baru"
        title="Buat Laporan Baru"
        data-testid="tenant-create-report-fab"
        className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-30 w-13 h-13 rounded-full bg-[#0084D1] hover:bg-[#0073B7] text-white shadow-lg shadow-[#0084D1]/25 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Modal Form Tambah Laporan */}
      <CreateReportModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(created) => {
          setReports((prev) => [created, ...prev]);
        }}
        showToast={showToast}
      />

      {/* Popup Detail Laporan & Balasan Admin Opsional */}
      <TenantReportDetailModal
        report={activeReport}
        onClose={() => setSelectedReportId(null)}
      />
    </div>
  );
};
