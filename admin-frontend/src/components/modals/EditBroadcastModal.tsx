import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import {
  BroadcastCampaign,
  BroadcastChannel,
  BroadcastScheduleType,
} from '../../types/admin.types.ts';
import {
  BROADCAST_PLACEHOLDERS,
  DAY_OF_WEEK_LABELS,
  getDefaultScheduledWibInput,
  toWibDateTimeLocalInput,
} from '../../utils/broadcastFormat.ts';
import { adminFetch } from '../../utils/adminAuth.ts';

interface EditBroadcastModalProps {
  isOpen: boolean;
  campaign: BroadcastCampaign | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string) => void;
}

export const EditBroadcastModal: React.FC<EditBroadcastModalProps> = ({
  isOpen,
  campaign,
  onClose,
  onSaved,
  showToast,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<BroadcastChannel>('both');
  const [scheduleType, setScheduleType] = useState<Exclude<BroadcastScheduleType, 'immediate'>>('once');
  const [scheduledAtWib, setScheduledAtWib] = useState('');
  const [recurrenceTime, setRecurrenceTime] = useState('09:00');
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState<number>(1);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen && campaign) {
      setTitle(campaign.title || '');
      setMessage(campaign.message || '');
      setChannel(campaign.channel || 'both');
      const nextScheduleType =
        campaign.schedule_type === 'immediate' ? 'once' : campaign.schedule_type;
      setScheduleType(nextScheduleType);
      setScheduledAtWib(
        campaign.scheduled_at
          ? toWibDateTimeLocalInput(campaign.scheduled_at)
          : getDefaultScheduledWibInput()
      );
      setRecurrenceTime(campaign.recurrence_time || '09:00');
      setRecurrenceDayOfWeek(
        typeof campaign.recurrence_day_of_week === 'number' ? campaign.recurrence_day_of_week : 1
      );
      setRecurrenceDayOfMonth(
        typeof campaign.recurrence_day_of_month === 'number' ? campaign.recurrence_day_of_month : 1
      );
      setErrorMsg(null);
    }
  }, [isOpen, campaign]);

  const handleInsertPlaceholder = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMessage((prev) => `${prev}${tag}`);
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const updated = message.slice(0, start) + tag + message.slice(end);
    setMessage(updated);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;
    setErrorMsg(null);

    if (!message.trim()) {
      setErrorMsg('Isi pesan broadcast tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/broadcasts/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          message: message.trim(),
          channel,
          schedule_type: scheduleType,
          scheduled_at_wib: scheduleType === 'once' ? scheduledAtWib : undefined,
          recurrence_time: scheduleType !== 'once' ? recurrenceTime : undefined,
          recurrence_day_of_week: scheduleType === 'weekly' ? recurrenceDayOfWeek : null,
          recurrence_day_of_month: scheduleType === 'monthly' ? recurrenceDayOfMonth : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Jadwal broadcast berhasil diperbarui.');
        onSaved();
        onClose();
      } else {
        setErrorMsg(data.message || 'Gagal memperbarui jadwal broadcast.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal menghubungi server: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !campaign) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-broadcast-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden text-slate-900">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 id="edit-broadcast-modal-title" className="text-base font-bold text-slate-900">
              Edit Pesan & Jadwal Broadcast
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbarui isi pesan, kanal pengiriman, atau jadwal eksekusi otomatis (WIB)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
            aria-label="Tutup modal edit broadcast"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="edit-bc-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Judul / Label Siaran (Opsional)
            </label>
            <input
              id="edit-bc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pengingat Pemeliharaan Server"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1]"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kanal Pengiriman
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'both', label: 'WA & Telegram' },
                  { id: 'whatsapp', label: 'WhatsApp Saja' },
                  { id: 'telegram', label: 'Telegram Saja' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setChannel(opt.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${
                    channel === opt.id
                      ? 'bg-[#0084D1]/10 border-[#0084D1] text-[#0084D1]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="edit-bc-message" className="text-xs font-semibold text-slate-700">
                Isi Pesan Broadcast
              </label>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                {message.length} karakter
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {BROADCAST_PLACEHOLDERS.map((ph) => (
                <button
                  key={ph.tag}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph.tag)}
                  className="px-2 py-1 text-[11px] font-mono font-medium bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 rounded-md transition cursor-pointer"
                  title={`Sisipkan ${ph.label}`}
                >
                  {ph.tag}
                </button>
              ))}
            </div>
            <textarea
              id="edit-bc-message"
              ref={textareaRef}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1] leading-relaxed"
              required
            />
          </div>

          {/* Jadwal */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="block text-xs font-semibold text-slate-700">
              Pola Jadwal Pengiriman (WIB)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'once', label: 'Sekali Kirim' },
                  { id: 'daily', label: 'Harian' },
                  { id: 'weekly', label: 'Mingguan' },
                  { id: 'monthly', label: 'Bulanan' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScheduleType(item.id)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${
                    scheduleType === item.id
                      ? 'bg-[#0084D1] border-[#0084D1] text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {scheduleType === 'once' ? (
              <div>
                <label htmlFor="edit-bc-datetime" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tanggal & Jam Pengiriman (WIB)
                </label>
                <input
                  id="edit-bc-datetime"
                  type="datetime-local"
                  value={scheduledAtWib}
                  onChange={(e) => setScheduledAtWib(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0084D1]"
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scheduleType === 'weekly' && (
                  <div>
                    <label htmlFor="edit-bc-dow" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hari Eksekusi
                    </label>
                    <select
                      id="edit-bc-dow"
                      value={recurrenceDayOfWeek}
                      onChange={(e) => setRecurrenceDayOfWeek(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0084D1]"
                    >
                      {DAY_OF_WEEK_LABELS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scheduleType === 'monthly' && (
                  <div>
                    <label htmlFor="edit-bc-dom" className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tanggal Setiap Bulan
                    </label>
                    <select
                      id="edit-bc-dom"
                      value={recurrenceDayOfMonth}
                      onChange={(e) => setRecurrenceDayOfMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0084D1]"
                    >
                      {Array.from({ length: 31 }, (_, idx) => idx + 1).map((dayNum) => (
                        <option key={dayNum} value={dayNum}>
                          Tanggal {dayNum}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="edit-bc-time" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Jam Eksekusi (WIB)
                  </label>
                  <input
                    id="edit-bc-time"
                    type="time"
                    value={recurrenceTime}
                    onChange={(e) => setRecurrenceTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0084D1]"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] disabled:opacity-50 rounded-xl transition cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
