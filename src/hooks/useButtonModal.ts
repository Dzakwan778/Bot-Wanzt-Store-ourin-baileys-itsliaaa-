import { useState, FormEvent } from 'react';
import { WhatsAppButton, WhatsAppButtonType, QuickReplyTriggerAction } from '../types/dashboard.types';

export function useButtonModal(
  menuButtons: WhatsAppButton[],
  setMenuButtons: React.Dispatch<React.SetStateAction<WhatsAppButton[]>>,
  onSaveButtons: (updatedButtons: WhatsAppButton[]) => void,
  showToast: (msg: string) => void
) {
  const [isAddButtonModalOpen, setIsAddButtonModalOpen] = useState(false);
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  const [modalBtnType, setModalBtnType] = useState<WhatsAppButtonType>('quick_reply');
  const [modalBtnName, setModalBtnName] = useState('');

  // Dedicated inputs per type
  const [quickReplyOutput, setQuickReplyOutput] = useState('');
  const [quickReplyAction, setQuickReplyAction] = useState<QuickReplyTriggerAction>('unknown');
  const [urlOutput, setUrlOutput] = useState('https://');
  const [copyOutput, setCopyOutput] = useState('');
  const [reminderOutput, setReminderOutput] = useState('');
  const [cancelReminderOutput, setCancelReminderOutput] = useState('');
  const [callTarget, setCallTarget] = useState('');
  const [callPhone, setCallPhone] = useState('');

  const handleOpenAddButtonModal = () => {
    setEditingButtonId(null);
    setModalBtnType('quick_reply');
    setModalBtnName('');
    setQuickReplyOutput('');
    setQuickReplyAction('unknown');
    setUrlOutput('https://');
    setCopyOutput('');
    setReminderOutput('');
    setCancelReminderOutput('');
    setCallTarget('');
    setCallPhone('');
    setIsAddButtonModalOpen(true);
  };

  const handleEditButton = (btn: WhatsAppButton) => {
    setEditingButtonId(btn.id);
    setModalBtnType(btn.type);
    setModalBtnName(btn.name);
    setQuickReplyOutput('');
    setQuickReplyAction(btn.triggerAction || 'unknown');
    setUrlOutput('https://');
    setCopyOutput('');
    setReminderOutput('');
    setCancelReminderOutput('');
    setCallTarget('');
    setCallPhone('');

    if (btn.type === 'quick_reply') {
      setQuickReplyOutput(btn.output);
    } else if (btn.type === 'cta_url') {
      setUrlOutput(btn.output.startsWith('https://') ? btn.output : `https://${btn.output}`);
    } else if (btn.type === 'cta_copy') {
      setCopyOutput(btn.output);
    } else if (btn.type === 'vcard' || btn.type === 'cta_call') {
      if (btn.callTargetName) setCallTarget(btn.callTargetName);
      if (btn.callPhoneNumber) setCallPhone(btn.callPhoneNumber);
      if (!btn.callTargetName && !btn.callPhoneNumber && btn.output.includes('(')) {
        const match = btn.output.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          setCallTarget(match[1].trim());
          setCallPhone(match[2].trim());
        } else {
          setCallTarget('Admin Store');
          setCallPhone(btn.output.replace(/[^0-9+]/g, ''));
        }
      }
    } else if (btn.type === 'cta_reminder') {
      setReminderOutput(btn.output);
    } else if (btn.type === 'cta_cancel_reminder') {
      setCancelReminderOutput(btn.output);
    }
    setIsAddButtonModalOpen(true);
  };

  const handleSaveButton = (e: FormEvent) => {
    e.preventDefault();
    if (!modalBtnName.trim()) {
      showToast('Nama tombol wajib diisi.');
      return;
    }

    let finalOutput = '';
    if (modalBtnType === 'quick_reply') {
      if (!quickReplyOutput.trim()) {
        showToast('Output respon balasan wajib diisi.');
        return;
      }
      finalOutput = quickReplyOutput.trim();
    } else if (modalBtnType === 'cta_url') {
      const cleanUrl = urlOutput.trim();
      const hasUrlPlaceholder = cleanUrl.includes('{') && cleanUrl.includes('}');
      if (!hasUrlPlaceholder && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        showToast('Output cta_url wajib diisi dengan URL valid (diawali https:// atau placeholder {webLink}).');
        return;
      }
      finalOutput = cleanUrl;
    } else if (modalBtnType === 'cta_copy') {
      if (!copyOutput.trim()) {
        showToast('Teks yang akan disalin wajib diisi.');
        return;
      }
      finalOutput = copyOutput.trim();
    } else if (modalBtnType === 'vcard' || modalBtnType === 'cta_call') {
      if (!callTarget.trim()) {
        showToast('Nama kontak vCard wajib diisi (misal: Admin Store, Owner, atau {adminName}).');
        return;
      }
      const hasPhonePlaceholder = callPhone.includes('{') && callPhone.includes('}');
      const cleanPhone = callPhone.replace(/[^0-9+]/g, '');
      if (!hasPhonePlaceholder && (!cleanPhone || cleanPhone.length < 8)) {
        showToast('Nomor WhatsApp kontak vCard tidak valid (minimal 8 digit atau placeholder {ownerNumber}).');
        return;
      }
      finalOutput = `${callTarget.trim()} (${callPhone.trim()})`;
    } else if (modalBtnType === 'cta_reminder') {
      if (!reminderOutput.trim()) {
        showToast('Judul atau ID pengingat wajib diisi.');
        return;
      }
      finalOutput = reminderOutput.trim();
    } else if (modalBtnType === 'cta_cancel_reminder') {
      if (!cancelReminderOutput.trim()) {
        showToast('ID pengingat yang dibatalkan wajib diisi.');
        return;
      }
      finalOutput = cancelReminderOutput.trim();
    }

    const isContactBtn = modalBtnType === 'vcard' || modalBtnType === 'cta_call';

    if (editingButtonId) {
      const updatedButtons = menuButtons.map((btn) => {
        if (btn.id === editingButtonId) {
          return {
            ...btn,
            type: modalBtnType,
            name: modalBtnName.trim(),
            output: finalOutput,
            triggerAction: modalBtnType === 'quick_reply' ? quickReplyAction : undefined,
            callTargetName: isContactBtn ? callTarget.trim() : undefined,
            callPhoneNumber: isContactBtn ? callPhone.trim() : undefined,
          };
        }
        return btn;
      });
      setMenuButtons(updatedButtons);
      onSaveButtons(updatedButtons);
      setIsAddButtonModalOpen(false);
      setEditingButtonId(null);
      showToast(`Tombol "${modalBtnName.trim()}" berhasil diperbarui & disimpan!`);
    } else {
      const newBtn: WhatsAppButton = {
        id: 'btn-' + Date.now(),
        type: modalBtnType,
        name: modalBtnName.trim(),
        output: finalOutput,
        triggerAction: modalBtnType === 'quick_reply' ? quickReplyAction : undefined,
        callTargetName: isContactBtn ? callTarget.trim() : undefined,
        callPhoneNumber: isContactBtn ? callPhone.trim() : undefined,
      };
      const updatedButtons = [...menuButtons, newBtn];
      setMenuButtons(updatedButtons);
      onSaveButtons(updatedButtons);
      setIsAddButtonModalOpen(false);
      showToast(`Tombol "${newBtn.name}" berhasil ditambahkan & disimpan!`);
    }
  };

  const handleDeleteButton = (id: string) => {
    const updatedButtons = menuButtons.filter((b) => b.id !== id);
    setMenuButtons(updatedButtons);
    onSaveButtons(updatedButtons);
    showToast('Tombol berhasil dihapus & disimpan.');
  };

  return {
    isAddButtonModalOpen,
    setIsAddButtonModalOpen,
    editingButtonId,
    setEditingButtonId,
    modalBtnType,
    setModalBtnType,
    modalBtnName,
    setModalBtnName,
    quickReplyAction,
    setQuickReplyAction,
    quickReplyOutput,
    setQuickReplyOutput,
    urlOutput,
    setUrlOutput,
    copyOutput,
    setCopyOutput,
    reminderOutput,
    setReminderOutput,
    cancelReminderOutput,
    setCancelReminderOutput,
    callTarget,
    setCallTarget,
    callPhone,
    setCallPhone,
    handleOpenAddButtonModal,
    handleEditButton,
    handleSaveButton,
    handleDeleteButton,
  };
}
