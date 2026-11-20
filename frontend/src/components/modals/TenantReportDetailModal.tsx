import React from 'react';
import { X, MessageSquareReply, Clock } from 'lucide-react';
import {
  TenantReportItem,
  formatFileSize,
  formatReportTimestamp,
  getReportStatusBadge,
} from '../../utils/reportHelpers';

interface TenantReportDetailModalProps {
  report: TenantReportItem | null;
  onClose: () => void;
}

export const TenantReportDetailModal: React.FC<TenantReportDetailModalProps> = ({
  report,
  onClose,
}) => {
  if (!report) return null;

  const badge = getReportStatusBadge(report.status);
  const showAdminReply =
    report.status === 'selesai' &&
    typeof report.adminReply === 'string' &&
    report.adminReply.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-report-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[90dvh] flex flex-col"
      >
        {/* Top Bar: Label Status + Tombol Tutup */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              data-testid="tenant-report-detail-status"
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-slate-400 inline-flex items-center gap-1 truncate">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatReportTimestamp(report.createdAt)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail laporan"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Nama & Pesan Laporan */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">
              Nama Laporan
            </p>
            <h3
              id="tenant-report-detail-title"
              className="text-base font-bold text-slate-900 leading-snug break-words"
            >
              {report.title}
            </h3>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">
              Pesan Laporan
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
              {report.message}
            </div>
          </div>

          {/* Lampiran Media */}
          {report.media && report.media.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-500">
                Lampiran Media ({report.media.length})
              </p>
              <div className="grid grid-cols-1 gap-3">
                {report.media.map((media) => (
                  <div
                    key={media.id}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                  >
                    {media.mediaType === 'image' ? (
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-100"
                      >
                        <img
                          src={media.url}
                          alt={media.originalName}
                          className="w-full max-h-72 object-contain mx-auto"
                        />
                      </a>
                    ) : (
                      <video
                        controls
                        preload="metadata"
                        src={media.url}
                        className="w-full max-h-72 bg-black"
                      />
                    )}
                    <div className="px-3 py-2 border-t border-slate-200/80 bg-white flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="truncate font-medium text-slate-700">
                        {media.originalName}
                      </span>
                      <span className="font-mono shrink-0">
                        {formatFileSize(media.sizeBytes)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bagian Paling Bawah: Balasan Admin (HANYA muncul jika status 'selesai' & ada pesan balasan admin) */}
          {showAdminReply && (
            <div
              data-testid="tenant-report-admin-reply"
              className="pt-3 border-t border-slate-200 space-y-2"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <MessageSquareReply className="w-4 h-4 shrink-0" />
                <span>Balasan Admin</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-emerald-950 whitespace-pre-wrap break-words leading-relaxed">
                {report.adminReply}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
