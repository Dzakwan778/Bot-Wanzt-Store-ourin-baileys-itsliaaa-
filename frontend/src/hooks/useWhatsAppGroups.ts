import { useState, useEffect } from 'react';
import { WhatsAppGroupItem } from '../types/dashboard.types';

export function useWhatsAppGroups(
  selectedTab: string,
  botStatus: string,
  showToast: (msg: string) => void
) {
  const [groups, setGroups] = useState<WhatsAppGroupItem[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null);

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    setGroupsError(null);
    try {
      const res = await fetch('/api/bot/groups');
      const data = await res.json();
      if (data.connected === false) {
        setGroupsError(data.message || 'Bot belum terhubung ke WhatsApp.');
        setGroups([]);
      } else if (data.groups) {
        setGroups(data.groups);
      }
    } catch (err: any) {
      setGroupsError(err?.message || 'Gagal memuat grup WhatsApp.');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleToggleGroup = async (groupId: string, currentEnabled: boolean) => {
    const nextVal = !currentEnabled;
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, enabled: nextVal } : g))
    );
    setTogglingGroupId(groupId);
    try {
      const res = await fetch('/api/bot/groups/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, enabled: nextVal }),
      });
      if (!res.ok) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, enabled: currentEnabled } : g))
        );
        showToast('Gagal memperbarui status toggle grup.');
      } else {
        showToast(`Grup ${nextVal ? 'diaktifkan' : 'dinonaktifkan'}.`);
      }
    } catch {
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, enabled: currentEnabled } : g))
      );
      showToast('Koneksi gagal saat mengubah status grup.');
    } finally {
      setTogglingGroupId(null);
    }
  };

  const copyGroupIdToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedGroupId(id);
    showToast('ID Grup berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  useEffect(() => {
    if (selectedTab === 'Grup' || selectedTab === 'tab04') {
      fetchGroups();
    }
  }, [selectedTab, botStatus]);

  return {
    groups,
    setGroups,
    isLoadingGroups,
    groupsError,
    groupSearchQuery,
    setGroupSearchQuery,
    copiedGroupId,
    togglingGroupId,
    fetchGroups,
    handleToggleGroup,
    copyGroupIdToClipboard,
  };
}
