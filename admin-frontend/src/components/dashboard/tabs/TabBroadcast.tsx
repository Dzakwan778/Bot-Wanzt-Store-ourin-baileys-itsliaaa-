import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Send,
  CalendarClock,
  RefreshCw,
  Search,
  Eye,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  Radio,
} from 'lucide-react';
import {
  BroadcastCampaign,
  BroadcastChannel,
  BroadcastReadinessSummary,
  BroadcastScheduleType,
} from '../../../types/admin.types.ts';
import {
  BROADCAST_PLACEHOLDERS,
  DAY_OF_WEEK_LABELS,
  describeScheduleRule,
  formatWibDateTime,
  getDefaultScheduledWibInput,
  previewBroadcastText,
} from '../../../utils/broadcastFormat.ts';
import { BroadcastLogModal } from '../../modals/BroadcastLogModal.tsx';
import { EditBroadcastModal } from '../../modals/EditBroadcastModal.tsx';
import {
  BroadcastConfirmActionType,
  ConfirmBroadcastActionModal,
} from '../../modals/ConfirmBroadcastActionModal.tsx';
import { adminFetch } from '../../../utils/adminAuth.ts';

interface TabBroadcastProps {
  showToast: (msg: string) => void;
}

export const TabBroadcast: React.FC<TabBroadcastProps> = ({ showToast }) => {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [readiness, setReadiness] = useState<BroadcastReadinessSummary>({
    activeTenantsCount: 0,
    waReadyCount: 0,
    tgReadyCount: 0,
    sampleTenant: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Composer State
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [channel, setChannel] = useState<BroadcastChannel>('both');
  const [deliveryMode, setDeliveryMode] = useState<'immediate' | 'once' | 'recurring'>('immediate');
  const [scheduledAtWib, setScheduledAtWib] = useState<string>(() => getDefaultScheduledWibInput());
  const [recurringInterval, setRecurringInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [recurrenceTime, setRecurrenceTime] = useState<string>('09:00');
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState<number>(1);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number>(1);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // History Filters & Modals
  const [historyFilter, setHistoryFilter] = useState<'all' | 'scheduled' | 'done' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCampaignForLogs, setSelectedCampaignForLogs] = useState<BroadcastCampaign | null>(null);
  const [selectedCampaignForEdit, setSelectedCampaignForEdit] = useState<BroadcastCampaign | null>(null);
  const [confirmActionState, setConfirmActionState] = useState<{
    action: BroadcastConfirmActionType;
    campaign: BroadcastCampaign;
  } | null>(null);

  const fetchBroadcasts = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await adminFetch('/api/admin/broadcasts');
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data || []);
        if (data.readiness) setReadiness(data.readiness);
      } else {
        showToast(data.message || 'Gagal memuat riwayat broadcast');
      }
    } catch (err: any) {
      showToast('Gagal memuat data broadcast: ' + err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
    const timer = setInterval(() => {
      fetchBroadcasts(true);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

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

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!message.trim()) {
      setFormError('Isi pesan broadcast wajib diisi terlebih dahulu.');
      return;
    }

    const scheduleType: BroadcastScheduleType =
      deliveryMode === 'immediate'
        ? 'immediate'
        : deliveryMode === 'once'
        ? 'once'
        : recurringInterval;

    setSubmitting(true);
    try {
      const res = await adminFetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          message: message.trim(),
          channel,
          schedule_type: scheduleType,
          scheduled_at_wib: scheduleType === 'once' ? scheduledAtWib : undefined,
          recurrence_time:
            scheduleType === 'daily' || scheduleType === 'weekly' || scheduleType === 'monthly'
              ? recurrenceTime
              : undefined,
          recurrence_day_of_week: scheduleType === 'weekly' ? recurrenceDayOfWeek : null,
          recurrence_day_of_month: scheduleType === 'monthly' ? recurrenceDayOfMonth : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Broadcast berhasil diproses.');
        setTitle('');
        setMessage('');
        setShowPreview(false);
        await fetchBroadcasts(true);
        if (data.executedImmediately && data.data) {
          setSelectedCampaignForLogs(data.data);
        }
      } else {
        setFormError(data.message || 'Gagal memproses broadcast.');
      }
    } catch (err: any) {
      setFormError('Terjadi gangguan jaringan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const scheduledPendingCount = useMemo(
    () =>
      campaigns.filter((c) => c.status === 'scheduled' || c.status === 'active_recurring').length,
    [campaigns]
  );

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (historyFilter === 'scheduled') {
        if (c.status !== 'scheduled' && c.status !== 'active_recurring' && c.status !== 'processing') {
          return false;
        }
      } else if (historyFilter === 'done') {
        if (c.status !== 'completed' && c.status !== 'partial' && c.status !== 'failed') {
          return false;
        }
      } else if (historyFilter === 'cancelled') {
        if (c.status !== 'cancelled') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.message.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [campaigns, historyFilter, searchQuery]);

  const previewRendered = useMemo(
    () => previewBroadcastText(message, readiness.sampleTenant),
    [message, readiness.sampleTenant]
  );

  const renderChannelLabel = (ch: BroadcastChannel) => {
    if (ch === 'both') {
      return (
        <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>WA & Telegram</span>
        </span>
      );
    }
    if (ch === 'whatsapp') {
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[#0084D1] font-medium">
        <Send className="w-3.5 h-3.5" />
        <span>Telegram</span>
      </span>
    );
  };

  const renderCampaignStatus = (campaign: BroadcastCampaign) => {
    switch (campaign.status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Terjadwal</span>
          </span>
        );
      case 'active_recurring':
        return (
          <span className="inline-flex items-center gap-1 text-[#0084D1] font-semibold">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Berulang Aktif</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Mengirim</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Selesai</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sebagian</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
            <XCircle className="w-3.5 h-3.5" />
            <span>Gagal</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-slate-500 font-semibold">
            <Ban className="w-3.5 h-3.5" />
            <span>Dibatalkan</span>
          </span>
        );
      default:
        return <span>{campaign.status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Bar Ringkasan Kesiapan Target Aktif */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl">
          <div className="text-xs font-medium text-slate-500">Target Tenant Active</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {readiness.activeTenantsCount}
            </span>
            <span className="text-xs text-slate-500">unit toko</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Expired & suspend otomatis dilewati</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl">
          <div className="text-xs font-medium text-slate-500">Bot WhatsApp Siap</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
              {readiness.waReadyCount}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              / {readiness.activeTenantsCount} online
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Paralel ke nomor WA owner</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl">
          <div className="text-xs font-medium text-slate-500">Bot Telegram Siap</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0084D1] font-mono tabular-nums">
              {readiness.tgReadyCount}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              / {readiness.activeTenantsCount} terhubung
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Terkonfigurasi & tidak disuspend</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl">
          <div className="text-xs font-medium text-slate-500">Jadwal Menunggu</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {scheduledPendingCount}
            </span>
            <span className="text-xs text-slate-500">jadwal aktif</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sekali kirim & berulang otomatis</p>
        </div>
      </div>

      {/* Form Pembuat Pesan Broadcast */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Buat Pesan Broadcast</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pesan dikirim murni sesuai ketikan Anda oleh setiap bot tenant ke owner masing-masing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'Tutup Pratinjau' : 'Pratinjau Pesan'}</span>
          </button>
        </div>

        <form onSubmit={handleCreateBroadcast} className="mt-5 space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="bc-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Judul / Label Siaran (Opsional)
                </label>
                <input
                  id="bc-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Info Update Sistem & Fitur Baru"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1]"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kanal Pengiriman
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'both', label: 'WA & Telegram', sub: 'Kirim ke keduanya' },
                      { id: 'whatsapp', label: 'WhatsApp Saja', sub: 'Hanya bot WhatsApp' },
                      { id: 'telegram', label: 'Telegram Saja', sub: 'Hanya bot Telegram' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setChannel(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        channel === opt.id
                          ? 'bg-[#0084D1]/10 border-[#0084D1] text-[#0084D1]'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold whitespace-nowrap">{opt.label}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pengaturan Waktu / Jadwal */}
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Waktu Pengiriman (WIB)
                </span>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                  {(
                    [
                      { id: 'immediate', label: 'Kirim Sekarang' },
                      { id: 'once', label: 'Jadwal Sekali' },
                      { id: 'recurring', label: 'Jadwal Berulang' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDeliveryMode(mode.id)}
                      className={`py-2 px-2.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                        deliveryMode === mode.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {deliveryMode === 'immediate' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  Pesan akan segera dikirim secara paralel oleh masing-masing bot tenant yang berstatus{' '}
                  <strong className="text-slate-800">Active</strong> begitu Anda menekan tombol kirim.
                </div>
              )}

              {deliveryMode === 'once' && (
                <div>
                  <label htmlFor="bc-once-datetime" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tanggal & Jam Kirim (WIB)
                  </label>
                  <input
                    id="bc-once-datetime"
                    type="datetime-local"
                    value={scheduledAtWib}
                    onChange={(e) => setScheduledAtWib(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1]"
                    required
                  />
                </div>
              )}

              {deliveryMode === 'recurring' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'daily', label: 'Harian' },
                        { id: 'weekly', label: 'Mingguan' },
                        { id: 'monthly', label: 'Bulanan' },
                      ] as const
                    ).map((freq) => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setRecurringInterval(freq.id)}
                        className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg border transition cursor-pointer whitespace-nowrap ${
                          recurringInterval === freq.id
                            ? 'bg-[#0084D1] border-[#0084D1] text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {recurringInterval === 'weekly' && (
                      <div>
                        <label htmlFor="bc-dow" className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Setiap Hari
                        </label>
                        <select
                          id="bc-dow"
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

                    {recurringInterval === 'monthly' && (
                      <div>
                        <label htmlFor="bc-dom" className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Setiap Tanggal
                        </label>
                        <select
                          id="bc-dom"
                          value={recurrenceDayOfMonth}
                          onChange={(e) => setRecurrenceDayOfMonth(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0084D1]"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => (
                            <option key={dayNum} value={dayNum}>
                              Tanggal {dayNum}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label htmlFor="bc-rec-time" className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pukul (WIB)
                      </label>
                      <input
                        id="bc-rec-time"
                        type="time"
                        value={recurrenceTime}
                        onChange={(e) => setRecurrenceTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-[#0084D1]"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Textarea & Placeholder Variabel */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label htmlFor="bc-message" className="text-xs font-semibold text-slate-700">
                Isi Pesan Broadcast
              </label>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                {message.length} karakter
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-[11px] text-slate-500 mr-1">Sisipkan variabel:</span>
              {BROADCAST_PLACEHOLDERS.map((ph) => (
                <button
                  key={ph.tag}
                  type="button"
                  onClick={() => handleInsertPlaceholder(ph.tag)}
                  className="px-2.5 py-1 text-[11px] font-mono font-medium bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#0084D1] border border-slate-200 hover:border-sky-300 rounded-md transition cursor-pointer"
                  title={`Sisipkan ${ph.label}`}
                >
                  {ph.tag}
                </button>
              ))}
            </div>

            <textarea
              id="bc-message"
              ref={textareaRef}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Halo {ownerName} pemilik {storeName}, kami informasikan bahwa..."
              className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1] leading-relaxed"
              required
            />
          </div>

          {showPreview && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-1.5">
                Pratinjau Output ({readiness.sampleTenant?.store_name || 'Contoh Toko'})
              </div>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {previewRendered || 'Ketik pesan untuk melihat pratinjau hasil penggantian variabel...'}
              </pre>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500">
              Akan menjangkau <strong className="text-slate-800">{readiness.activeTenantsCount}</strong> tenant aktif secara otomatis.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#0084D1] hover:bg-[#0073B7] disabled:opacity-50 rounded-xl transition cursor-pointer whitespace-nowrap"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Broadcast...</span>
                </>
              ) : deliveryMode === 'immediate' ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Broadcast Sekarang</span>
                </>
              ) : (
                <>
                  <CalendarClock className="w-4 h-4" />
                  <span>Simpan Jadwal Siaran</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Riwayat & Jadwal Broadcast (Log Tingkat 1) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Riwayat & Jadwal Siaran</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau jadwal menunggu, siaran berulang otomatis, serta buka log detail per toko.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'scheduled', label: 'Terjadwal' },
                  { id: 'done', label: 'Selesai' },
                  { id: 'cancelled', label: 'Dibatalkan' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer whitespace-nowrap ${
                    historyFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari riwayat siaran..."
                aria-label="Cari riwayat siaran"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-[#0084D1]"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchBroadcasts()}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-[#0084D1] bg-slate-50 border border-slate-300 rounded-lg transition cursor-pointer"
              aria-label="Muat ulang riwayat broadcast"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0084D1]' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Pesan & Judul</th>
                <th className="py-3 px-4">Kanal</th>
                <th className="py-3 px-4">Jadwal / Eksekusi</th>
                <th className="py-3 px-4">Hasil Pengiriman</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-5 bg-slate-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      Belum ada riwayat atau jadwal pesan siaran
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Gunakan form di atas untuk mengirim siaran sekarang atau menjadwalkannya secara otomatis.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => {
                  const canEditOrCancel =
                    c.status === 'scheduled' || c.status === 'active_recurring';
                  const hasRuns = c.run_count > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-bold text-slate-900 truncate">{c.title}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {c.message}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {renderChannelLabel(c.channel)}
                      </td>

                      <td className="py-3 px-4 align-top text-slate-600">
                        <div className="font-medium text-slate-800">{describeScheduleRule(c)}</div>
                        {c.next_run_at && (c.status === 'scheduled' || c.status === 'active_recurring') && (
                          <div className="text-[11px] text-[#0084D1] font-mono tabular-nums mt-0.5">
                            Berikutnya: {formatWibDateTime(c.next_run_at)}
                          </div>
                        )}
                        {c.last_run_at && (
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                            Terakhir: {formatWibDateTime(c.last_run_at)}
                            {c.run_count > 1 ? ` (Ke-${c.run_count})` : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top font-mono tabular-nums whitespace-nowrap">
                        {!hasRuns ? (
                          <span className="text-slate-400">Menunggu jadwal</span>
                        ) : (
                          <div className="space-y-0.5 text-[11px]">
                            {(c.channel === 'both' || c.channel === 'whatsapp') && (
                              <div>
                                <span className="text-slate-500">WA:</span>{' '}
                                <span className="font-semibold text-emerald-700">
                                  {c.wa_success}/{c.wa_success + c.wa_failed}
                                </span>
                                {c.wa_failed > 0 && (
                                  <span className="text-rose-600"> ({c.wa_failed} gagal)</span>
                                )}
                              </div>
                            )}
                            {(c.channel === 'both' || c.channel === 'telegram') && (
                              <div>
                                <span className="text-slate-500">TG:</span>{' '}
                                <span className="font-semibold text-[#0084D1]">
                                  {c.tg_success}/{c.tg_success + c.tg_failed}
                                </span>
                                {c.tg_failed > 0 && (
                                  <span className="text-rose-600"> ({c.tg_failed} gagal)</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {renderCampaignStatus(c)}
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {hasRuns && (
                            <button
                              type="button"
                              onClick={() => setSelectedCampaignForLogs(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer whitespace-nowrap"
                              aria-label={`Lihat log detail ${c.title}`}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Log</span>
                            </button>
                          )}

                          {canEditOrCancel && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedCampaignForEdit(c)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer whitespace-nowrap"
                                aria-label={`Edit jadwal ${c.title}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmActionState({ action: 'send-now', campaign: c })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#0084D1] hover:bg-[#0073B7] rounded-lg transition cursor-pointer whitespace-nowrap"
                                aria-label={`Kirim sekarang ${c.title}`}
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Kirim</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmActionState({ action: 'cancel', campaign: c })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer whitespace-nowrap"
                                aria-label={`Batalkan jadwal ${c.title}`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Batalkan</span>
                              </button>
                            </>
                          )}

                          {c.status !== 'processing' && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmActionState({ action: 'delete', campaign: c })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              aria-label={`Hapus riwayat ${c.title}`}
                              title="Hapus Riwayat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <BroadcastLogModal
        isOpen={Boolean(selectedCampaignForLogs)}
        campaign={selectedCampaignForLogs}
        onClose={() => setSelectedCampaignForLogs(null)}
        onUpdated={() => fetchBroadcasts(true)}
        showToast={showToast}
      />

      <EditBroadcastModal
        isOpen={Boolean(selectedCampaignForEdit)}
        campaign={selectedCampaignForEdit}
        onClose={() => setSelectedCampaignForEdit(null)}
        onSaved={() => fetchBroadcasts(true)}
        showToast={showToast}
      />

      <ConfirmBroadcastActionModal
        isOpen={Boolean(confirmActionState)}
        actionType={confirmActionState?.action || null}
        campaign={confirmActionState?.campaign || null}
        onClose={() => setConfirmActionState(null)}
        onSuccess={() => fetchBroadcasts(true)}
        showToast={showToast}
      />
    </div>
  );
};
