import { useState, useEffect, useCallback } from 'react';
import { PromoCodeItem } from '../types/dashboard.types';

export function usePromos(showToast: (msg: string) => void) {
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter & Search
  const [searchPromo, setSearchPromo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form State (Untuk Tambah & Edit Kupon)
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeItem | null>(null);

  const [formCode, setFormCode] = useState<string>('');
  const [formDiscountMode, setFormDiscountMode] = useState<'rp' | 'percent'>('rp');
  const [formDiscountValue, setFormDiscountValue] = useState<string>('5000');
  const [formMinSpend, setFormMinSpend] = useState<string>('');
  const [formQuota, setFormQuota] = useState<string>('');
  const [formIsUnlimitedQuota, setFormIsUnlimitedQuota] = useState<boolean>(true);
  const [formIsForever, setFormIsForever] = useState<boolean>(true);
  const [formValidUntil, setFormValidUntil] = useState<string>('');
  const [formScopeType, setFormScopeType] = useState<'all' | 'restricted'>('all');
  const [formSelectedVariantIds, setFormSelectedVariantIds] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // State untuk konfirmasi hapus (Custom Modal-like flow)
  const [promoToDelete, setPromoToDelete] = useState<{ id: number; code: string } | null>(null);

  // Fetch daftar kupon dari backend SQLite
  const fetchPromos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/promos');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPromos(json.data);
          return;
        }
      }
      setPromos([]);
    } catch (err: any) {
      console.error('Gagal mengambil kupon promo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  // Reset form ke default untuk membuat kupon baru
  const openCreateForm = () => {
    setEditingPromo(null);
    setFormCode('');
    setFormDiscountMode('rp');
    setFormDiscountValue('5000');
    setFormMinSpend('');
    setFormQuota('');
    setFormIsUnlimitedQuota(true);
    setFormIsForever(true);
    // Default valid until besok atau 30 hari ke depan
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormValidUntil(d.toISOString().slice(0, 10));
    setFormScopeType('all');
    setFormSelectedVariantIds([]);
    setFormIsActive(true);
    setIsFormOpen(true);
  };

  // Buka form untuk mengedit kupon yang sudah ada
  const openEditForm = (promo: PromoCodeItem) => {
    setEditingPromo(promo);
    setFormCode(promo.code);
    setFormDiscountMode(promo.discountMode);
    setFormDiscountValue(String(promo.discountValue));
    setFormMinSpend(promo.minSpend > 0 ? String(promo.minSpend) : '');
    setFormQuota(promo.quota !== null ? String(promo.quota) : '');
    setFormIsUnlimitedQuota(promo.quota === null);
    setFormIsForever(promo.isForever);
    setFormValidUntil(promo.validUntil ? promo.validUntil.slice(0, 10) : '');
    setFormScopeType(promo.scopeType);
    setFormSelectedVariantIds(promo.variantIds || []);
    setFormIsActive(promo.isActive);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingPromo(null);
  };

  // Toggle variant selection (untuk scope 'restricted')
  const toggleVariantSelection = (variantId: string | number) => {
    const vId = String(variantId);
    setFormSelectedVariantIds((prev) =>
      prev.includes(vId) ? prev.filter((id) => id !== vId) : [...prev, vId]
    );
  };

  const selectAllVariants = (allIds: (string | number)[]) => {
    setFormSelectedVariantIds(allIds.map(String));
  };

  const deselectAllVariants = () => {
    setFormSelectedVariantIds([]);
  };

  // Submit form (Create / Update)
  const submitForm = async (): Promise<boolean> => {
    const cleanCode = formCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      showToast('Kode promo tidak boleh kosong.');
      return false;
    }

    const numVal = Number(formDiscountValue);
    if (isNaN(numVal) || numVal <= 0) {
      showToast('Nilai potongan kupon wajib lebih dari 0.');
      return false;
    }

    if (formDiscountMode === 'percent' && numVal > 100) {
      showToast('Potongan persentase tidak boleh melebihi 100%.');
      return false;
    }

    if (formScopeType === 'restricted' && formSelectedVariantIds.length === 0) {
      showToast('Pilih minimal 1 varian untuk jenis promo terbatas.');
      return false;
    }

    const payload = {
      code: cleanCode,
      discountMode: formDiscountMode,
      discountValue: numVal,
      minSpend: formMinSpend ? Math.max(0, Number(formMinSpend)) : 0,
      quota: formIsUnlimitedQuota ? null : (formQuota ? Math.max(1, Number(formQuota)) : null),
      validUntil: formIsForever ? null : formValidUntil,
      isForever: formIsForever,
      scopeType: formScopeType,
      variantIds: formScopeType === 'restricted' ? formSelectedVariantIds : [],
      isActive: formIsActive,
    };

    try {
      setIsSubmitting(true);
      const isEdit = Boolean(editingPromo);
      const url = isEdit ? `/api/promos/${editingPromo!.id}` : '/api/promos';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast(isEdit ? `Kupon ${cleanCode} berhasil diperbarui!` : `Kupon ${cleanCode} berhasil dibuat!`);
        closeForm();
        fetchPromos();
        return true;
      } else {
        showToast(json.error || 'Gagal menyimpan kupon promo.');
        return false;
      }
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan jaringan.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status Aktif Kupon
  const togglePromo = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/promos/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setPromos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p))
        );
        showToast(`Kupon berhasil di-${!currentStatus ? 'aktifkan' : 'nonaktifkan'}`);
      } else {
        showToast(json.error || 'Gagal mengubah status kupon');
      }
    } catch {
      showToast('Koneksi gagal saat mengubah status kupon');
    }
  };

  // Inisiasi proses hapus (Set state untuk memicu modal konfirmasi di UI)
  const deletePromo = (id: number, code: string) => {
    setPromoToDelete({ id, code });
  };

  const cancelDelete = () => {
    setPromoToDelete(null);
  };

  // Eksekusi hapus yang sebenarnya setelah konfirmasi user
  const confirmDelete = async () => {
    if (!promoToDelete) return;
    const { id, code } = promoToDelete;

    try {
      showToast(`Menghapus kupon ${code}...`);
      setPromoToDelete(null); // Tutup modal konfirmasi
      
      const res = await fetch(`/api/promos/${id}`, { 
        method: 'DELETE'
      });
      
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { success: false, error: 'Respon server tidak valid' };
      }
      
      if (res.ok && json.success) {
        setPromos((prev) => prev.filter((p) => p.id !== id));
        showToast(`Kupon ${code} berhasil dihapus.`);
      } else {
        showToast(json.error || 'Gagal menghapus kupon.');
      }
    } catch (err: any) {
      console.error('Error confirmDelete:', err);
      showToast('Terjadi kesalahan koneksi saat menghapus kupon.');
    }
  };

  // Generator Kode Acak
  const generateRandomCode = (prefix: string = 'WANZT') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = prefix;
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormCode(code);
  };

  // Filter list
  const filteredPromos = promos.filter((p) => {
    const matchSearch =
      searchPromo.trim() === '' ||
      p.code.toLowerCase().includes(searchPromo.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter === 'active') return p.isActive;
    if (statusFilter === 'inactive') return !p.isActive;
    return true;
  });

  return {
    promos,
    filteredPromos,
    loading,
    isSubmitting,
    fetchPromos,
    searchPromo,
    setSearchPromo,
    statusFilter,
    setStatusFilter,
    // Form handlers
    isFormOpen,
    editingPromo,
    openCreateForm,
    openEditForm,
    closeForm,
    submitForm,
    togglePromo,
    deletePromo,
    confirmDelete,
    cancelDelete,
    promoToDelete,
    generateRandomCode,
    // Form fields
    formCode,
    setFormCode,
    formDiscountMode,
    setFormDiscountMode,
    formDiscountValue,
    setFormDiscountValue,
    formMinSpend,
    setFormMinSpend,
    formQuota,
    setFormQuota,
    formIsUnlimitedQuota,
    setFormIsUnlimitedQuota,
    formIsForever,
    setFormIsForever,
    formValidUntil,
    setFormValidUntil,
    formScopeType,
    setFormScopeType,
    formSelectedVariantIds,
    toggleVariantSelection,
    selectAllVariants,
    deselectAllVariants,
    formIsActive,
    setFormIsActive,
  };
}
