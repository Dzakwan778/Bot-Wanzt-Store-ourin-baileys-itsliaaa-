import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  X,
  Paperclip,
  Image as ImageIcon,
  Film,
  Trash2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import {
  REPORT_MAX_MEDIA,
  REPORT_TITLE_MAX_LENGTH,
  ReportMediaType,
  TenantReportItem,
  formatFileSize,
  validateClientReportFileSelection,
  validateClientReportForm,
} from '../../utils/reportHelpers';

interface StagedAttachment {
  stagingToken: string;
  mediaType: ReportMediaType;
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  previewUrl: string;
}

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (report: TenantReportItem) => void;
  showToast: (msg: string) => void;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<StagedAttachment[]>([]);
  attachmentsRef.current = attachments;

  useEffect(() => {
    if (!isOpen) {
      for (const att of attachmentsRef.current) {
        if (att.previewUrl) {
          URL.revokeObjectURL(att.previewUrl);
        }
      }
      setTitle('');
      setMessage('');
      setAttachments([]);
      setFormError(null);
      setIsUploadingMedia(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      for (const att of attachmentsRef.current) {
        if (att.previewUrl) {
          URL.revokeObjectURL(att.previewUrl);
        }
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleCloseAndCleanup = async () => {
    if (isSubmitting || isUploadingMedia) return;
    const tokensToClean = attachments.map((a) => a.stagingToken);
    onClose();
    for (const token of tokensToClean) {
      fetch(`/api/reports/media/staging/${encodeURIComponent(token)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (fileList.length === 0) return;

    setFormError(null);
    let workingList = [...attachments];

    for (const file of fileList) {
      const validation = validateClientReportFileSelection(workingList, {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      if (!validation.valid) {
        setFormError(validation.error || 'File tidak memenuhi syarat.');
        break;
      }

      setIsUploadingMedia(true);
      try {
        const res = await fetch('/api/reports/media', {
          method: 'POST',
          headers: {
            'Content-Type': file.type,
            'X-File-Name': encodeURIComponent(file.name),
          },
          body: file,
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.media) {
          setFormError(data.error || `Gagal mengunggah ${file.name}.`);
          break;
        }

        const previewUrl = URL.createObjectURL(file);
        const staged: StagedAttachment = {
          stagingToken: data.media.stagingToken,
          mediaType: data.media.mediaType,
          mimeType: data.media.mimeType,
          sizeBytes: data.media.sizeBytes,
          originalName: data.media.originalName,
          previewUrl,
        };
        workingList = [...workingList, staged];
        setAttachments(workingList);
      } catch (err: any) {
        setFormError(err?.message || `Gagal mengunggah ${file.name}.`);
        break;
      } finally {
        setIsUploadingMedia(false);
      }
    }
  };

  const handleRemoveAttachment = (token: string) => {
    const target = attachments.find((a) => a.stagingToken === token);
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setAttachments((prev) => prev.filter((a) => a.stagingToken !== token));
    setFormError(null);
    fetch(`/api/reports/media/staging/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formCheck = validateClientReportForm({ title, message });
    if (!formCheck.valid) {
      setFormError(formCheck.error || 'Periksa kembali isi laporan Anda.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          stagingTokens: attachments.map((a) => a.stagingToken),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.report) {
        setFormError(data.error || 'Gagal mengirim laporan.');
        return;
      }

      for (const att of attachments) {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      }
      setAttachments([]);
      showToast('Laporan masalah berhasil dikirim!');
      onSuccess(data.report);
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Koneksi server gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleCharCount = [...title].length;
  const videoCount = attachments.filter((a) => a.mediaType === 'video').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/45 backdrop-blur-xs"
      onClick={handleCloseAndCleanup}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-report-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[92dvh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2
              id="create-report-modal-title"
              className="text-sm font-bold text-slate-900 tracking-tight"
            >
              Buat Laporan Masalah
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sampaikan kendala agar tim Master Admin segera membantu.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseAndCleanup}
            disabled={isSubmitting || isUploadingMedia}
            aria-label="Tutup form laporan"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {formError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Nama Laporan (maks 30 karakter) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="report-title-input"
                className="text-xs font-semibold text-slate-800"
              >
                Nama Laporan <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  titleCharCount >= REPORT_TITLE_MAX_LENGTH
                    ? 'text-slate-700 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {titleCharCount}/{REPORT_TITLE_MAX_LENGTH}
              </span>
            </div>
            <input
              id="report-title-input"
              type="text"
              maxLength={REPORT_TITLE_MAX_LENGTH}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Contoh: Bot tidak respon di grup"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition"
            />
          </div>

          {/* Pesan Laporan (tanpa batas karakter) */}
          <div className="space-y-1.5">
            <label
              htmlFor="report-message-input"
              className="block text-xs font-semibold text-slate-800"
            >
              Pesan Laporan <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="report-message-input"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Jelaskan kronologi kendala secara rinci..."
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:border-[#0084D1] focus:ring-2 focus:ring-[#0084D1]/20 focus:outline-none transition resize-y min-h-[100px]"
            />
          </div>

          {/* Lampiran Media (Maks 3 media: Foto maks 5 MB, Video maks 25 MB & maks 1 video) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Lampiran Media (Opsional)
              </span>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                {attachments.length}/{REPORT_MAX_MEDIA} file
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-label="Pilih file foto atau video"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                isUploadingMedia ||
                isSubmitting ||
                attachments.length >= REPORT_MAX_MEDIA
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-[#0084D1] bg-slate-50/70 hover:bg-sky-50/50 text-xs font-semibold text-slate-700 hover:text-[#0084D1] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingMedia ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengunggah media...</span>
                </>
              ) : (
                <>
                  <Paperclip className="w-4 h-4" />
                  <span>
                    {attachments.length >= REPORT_MAX_MEDIA
                      ? 'Batas 3 media tercapai'
                      : 'Pilih Foto atau Video'}
                  </span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Maks. 3 media per laporan (foto maks 5 MB, video maks 25 MB dan maksimal 1 video).
              {videoCount > 0 ? ' Kuota video (1/1) sudah terisi.' : ''}
            </p>

            {/* Preview Lampiran Terunggah */}
            {attachments.length > 0 && (
              <div className="space-y-2 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.stagingToken}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/60"
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {att.mediaType === 'image' ? (
                        <img
                          src={att.previewUrl}
                          alt={att.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {att.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          {att.mediaType === 'image' ? (
                            <ImageIcon className="w-3 h-3" />
                          ) : (
                            <Film className="w-3 h-3" />
                          )}
                          <span>{att.mediaType === 'image' ? 'Foto' : 'Video'}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatFileSize(att.sizeBytes)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.stagingToken)}
                      disabled={isSubmitting}
                      aria-label={`Hapus lampiran ${att.originalName}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseAndCleanup}
              disabled={isSubmitting || isUploadingMedia}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingMedia}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0084D1] hover:bg-[#0073B7] text-white text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Laporan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
