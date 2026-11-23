import React, { useState } from 'react';
import { X, Send, Ban, Trash2, RefreshCw } from 'lucide-react';
import { BroadcastCampaign } from '../../types/admin.types.ts';
import { adminFetch } from '../../utils/adminAuth.ts';

export type BroadcastConfirmActionType = 'send-now' | 'cancel' | 'delete';

interface ConfirmBroadcastActionModalProps {
  isOpen: boolean;
  actionType: BroadcastConfirmActionType | null;
  campaign: BroadcastCampaign | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string) => void;
}

export const ConfirmBroadcastActionModal: React.FC<ConfirmBroadcastActionModalProps> = ({
  isOpen,
  actionType,
  campaign,
  onClose,
  onSuccess,
  showToast,
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !actionType || !campaign) return null;

  const config = {
    'send-now': {
      title: 'Kirim Broadcast Sekarang?',
      desc: `Pesan "${campaign.title}" akan langsung dikirimkan saat ini juga ke seluruh tenant berstatus Active.`,
      btnLabel: 'Ya, Kirim Sekarang',
      btnClass: 'bg-[#0084D1] hover:bg-[#0073B7]',
      icon: Send,
      iconWrap: 'bg-sky-50 text-[#0084D1] border-sky-200',
    },
    cancel: {
      title: 'Batalkan Jadwal Broadcast?',
      desc: `Jadwal otomatis untuk "${campaign.title}" akan dihentikan dan tidak akan dikirimkan lagi secara otomatis.`,
      btnLabel: 'Ya, Batalkan Jadwal',
      btnClass: 'bg-amber-600 hover:bg-amber-700',
      icon: Ban,
      iconWrap: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    delete: {
      title: 'Hapus Riwayat Broadcast?',
      desc: `Kampanye "${campaign.title}" beserta seluruh catatan log pengirimannya akan dihapus permanen.`,
      btnLabel: 'Ya, Hapus Permanen',
      btnClass: 'bg-rose-600 hover:bg-rose-700',
      icon: Trash2,
      iconWrap: 'bg-rose-50 text-rose-600 border-rose-200',
    },
  }[actionType];

  const Icon = config.icon;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      let url = `/api/admin/broadcasts/${campaign.id}`;
      let method = 'POST';
      if (actionType === 'send-now') url += '/send-now';
      else if (actionType === 'cancel') url += '/cancel';
      else method = 'DELETE';

      const res = await adminFetch(url, { method });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Aksi broadcast berhasil dijalankan.');
        onSuccess();
        onClose();
      } else {
        showToast(data.message || 'Gagal menjalankan aksi broadcast.');
      }
    } catch (err: any) {
      showToast('Error koneksi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-broadcast-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${config.iconWrap}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-broadcast-modal-title" className="text-sm font-bold text-slate-900">
                {config.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{config.desc}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            aria-label="Tutup konfirmasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-xl transition cursor-pointer disabled:opacity-50 ${config.btnClass}`}
          >
            {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{submitting ? 'Memproses...' : config.btnLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
