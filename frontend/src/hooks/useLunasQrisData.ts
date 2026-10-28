import { useState, useEffect } from 'react';
import { LunasQrisBalanceState } from '../types/dashboard.types';

export function useLunasQrisData(
  lunasQrisApiKey: string,
  lunasQrisBaseUrl: string,
  showToast: (msg: string) => void
) {
  const [lunasQrisBalance, setLunasQrisBalance] = useState<LunasQrisBalanceState>({
    loading: false,
    configured: false,
    balance: null,
    balanceHold: null,
    error: null,
  });

  const fetchLunasQrisBalance = async (isManual = false) => {
    const cleanKey = lunasQrisApiKey?.trim();
    const cleanBase = lunasQrisBaseUrl?.trim() || 'https://lunasqris.com';

    if (!cleanKey) {
      setLunasQrisBalance({
        loading: false,
        configured: false,
        balance: null,
        balanceHold: null,
        error: null,
      });
      if (isManual) {
        showToast('API Key LunasQRIS belum diisi di tab Connection.');
      }
      return;
    }

    try {
      setLunasQrisBalance((prev) => ({ ...prev, loading: true, error: null }));
      const res = await fetch(
        `/api/lunasqris/balance?apikey=${encodeURIComponent(cleanKey)}&baseurl=${encodeURIComponent(cleanBase)}`
      );
      const data = await res.json();
      if (data.success) {
        setLunasQrisBalance({
          loading: false,
          configured: true,
          balance: Number(data.balance || 0),
          balanceHold: Number(data.balanceHold || 0),
          error: null,
        });
        if (isManual) {
          showToast(`Saldo LunasQRIS berhasil diperbarui: Rp ${Number(data.balance || 0).toLocaleString('id-ID')}`);
        }
      } else {
        setLunasQrisBalance({
          loading: false,
          configured: true,
          balance: null,
          balanceHold: null,
          error: data.error || 'API Key LunasQRIS tidak valid',
        });
        if (isManual) {
          showToast(data.error || 'Gagal memverifikasi saldo LunasQRIS');
        }
      }
    } catch (err: any) {
      setLunasQrisBalance({
        loading: false,
        configured: true,
        balance: null,
        balanceHold: null,
        error: err?.message || 'Gagal terhubung ke server LunasQRIS',
      });
      if (isManual) {
        showToast('Koneksi ke API LunasQRIS gagal');
      }
    }
  };

  useEffect(() => {
    if (lunasQrisApiKey && lunasQrisApiKey.trim()) {
      fetchLunasQrisBalance(false);
    } else {
      setLunasQrisBalance({
        loading: false,
        configured: false,
        balance: null,
        balanceHold: null,
        error: null,
      });
    }
  }, [lunasQrisApiKey, lunasQrisBaseUrl]);

  return {
    lunasQrisBalance,
    fetchLunasQrisBalance,
  };
}
