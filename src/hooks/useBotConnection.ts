import { useState, useEffect, FormEvent } from 'react';
import { BotStatusResponse } from '../types/dashboard.types';

export function useBotConnection(
  showToast: (msg: string) => void,
  onInitialConfigLoaded?: (config: any) => void,
  onInitialXavieraLoaded?: (key: string, url: string) => void
) {
  const [phone, setPhone] = useState('81234567890');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [botData, setBotData] = useState<BotStatusResponse>({
    status: 'idle',
    phoneNumber: '',
    pairingCode: '',
    customCode: '',
    user: null,
    logs: [],
    hasSession: false,
    isRegistered: false,
  });

  // Polling status secara real-time
  useEffect(() => {
    let hasLoadedInitialConfig = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/bot/status');
        if (res.ok) {
          const data: any = await res.json();
          setBotData(data);
          if (data.customCode && !customCode) {
            setCustomCode(data.customCode);
          }
          if (!hasLoadedInitialConfig && data.config) {
            hasLoadedInitialConfig = true;
            if (onInitialConfigLoaded) {
              onInitialConfigLoaded(data.config);
            }
            if (onInitialXavieraLoaded && (data.config.xavieraApiKey || data.config.xavieraBaseUrl)) {
              onInitialXavieraLoaded(
                data.config.xavieraApiKey || '',
                data.config.xavieraBaseUrl || 'https://xavierastore.com/api/v1'
              );
            }
          }
        }
      } catch {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => clearInterval(interval);
  }, [customCode]);

  const handleStartPairing = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('62')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? '62' + cleanPhone.slice(1)
      : '62' + cleanPhone;

    if (fullPhone.length < 10) {
      showToast('Nomor WhatsApp tidak valid (minimal 10 digit).');
      return;
    }

    const code = customCode.trim().toUpperCase();
    if (!code) {
      showToast('Form pairing code belum diisi! Silakan isi kolom kode pairing (8 karakter huruf/angka) untuk melakukan koneksi.');
      return;
    }

    if (/[^A-Z0-9]/.test(code)) {
      showToast('Custom pairing code tidak sesuai! Dilarang menggunakan simbol atau spasi (hanya angka dan huruf saja).');
      return;
    }

    if (code.length !== 8) {
      showToast(`Custom pairing code tidak sesuai! Wajib tepat 8 karakter (saat ini ${code.length} karakter).`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhone,
          customCode: code,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Memulai permintaan pairing code...');
      } else {
        showToast(data.error || 'Gagal memulai penautan');
      }
    } catch (err: any) {
      showToast('Koneksi ke backend gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await fetch('/api/bot/stop', { method: 'POST' });
      showToast('Koneksi bot dimatikan.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Hapus seluruh folder sesi penautan? Anda perlu menautkan ulang WhatsApp.')) return;
    setLoading(true);
    try {
      await fetch('/api/bot/reset', { method: 'POST' });
      showToast('Sesi lama berhasil dibersihkan.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    const code = botData.pairingCode || customCode || '';
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast(`Kode ${code} berhasil disalin ke clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    phone,
    setPhone,
    customCode,
    setCustomCode,
    loading,
    copied,
    botData,
    handleStartPairing,
    handleStop,
    handleReset,
    handleCopyCode,
  };
}
