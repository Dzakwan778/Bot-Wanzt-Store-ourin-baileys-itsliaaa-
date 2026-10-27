import React, { FormEvent } from 'react';
import { Pencil, Plus, X, ChevronDown, Check } from 'lucide-react';
import { WhatsAppButtonType, QuickReplyTriggerAction } from '../../types/dashboard.types';

interface AddEditButtonModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingButtonId: string | null;
  modalBtnType: WhatsAppButtonType;
  setModalBtnType: (type: WhatsAppButtonType) => void;
  modalBtnName: string;
  setModalBtnName: (name: string) => void;
  quickReplyAction: QuickReplyTriggerAction;
  setQuickReplyAction: (act: QuickReplyTriggerAction) => void;
  quickReplyOutput: string;
  setQuickReplyOutput: React.Dispatch<React.SetStateAction<string>>;
  urlOutput: string;
  setUrlOutput: (url: string) => void;
  copyOutput: string;
  setCopyOutput: React.Dispatch<React.SetStateAction<string>>;
  callTarget: string;
  setCallTarget: (target: string) => void;
  callPhone: string;
  setCallPhone: (phone: string) => void;
  reminderOutput: string;
  setReminderOutput: (val: string) => void;
  cancelReminderOutput: string;
  setCancelReminderOutput: (val: string) => void;
  onSave: (e: FormEvent) => void;
}

export const AddEditButtonModal: React.FC<AddEditButtonModalProps> = ({
  isOpen,
  onClose,
  editingButtonId,
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
  callTarget,
  setCallTarget,
  callPhone,
  setCallPhone,
  reminderOutput,
  setReminderOutput,
  cancelReminderOutput,
  setCancelReminderOutput,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            {editingButtonId ? (
              <Pencil className="w-4 h-4 text-sky-600" />
            ) : (
              <Plus className="w-4 h-4 text-sky-600" />
            )}
            <h3 className="font-semibold text-sm text-slate-900">
              {editingButtonId ? 'Edit Tombol WhatsApp' : 'Tambah Tombol WhatsApp'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSave} className="p-5 space-y-4">
          {/* Field 1: Tipe Tombol */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipe Tombol
            </label>
            <div className="relative">
              <select
                value={modalBtnType}
                onChange={(e) => setModalBtnType(e.target.value as WhatsAppButtonType)}
                className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 cursor-pointer shadow-2xs"
              >
                <option value="quick_reply">quick_reply (Balas Cepat / Pilihan)</option>
                <option value="cta_url">cta_url (Buka Tautan Website)</option>
                <option value="cta_copy">cta_copy (Salin Teks / Rekening)</option>
                <option value="vcard">vcard (Kirim Kontak vCard Nomor)</option>
                <option value="cta_reminder">cta_reminder (Buat Pengingat WA)</option>
                <option value="cta_cancel_reminder">cta_cancel_reminder (Batalkan Pengingat WA)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pilih salah satu dari 6 tipe tombol interaktif yang didukung ourin-baileys.
            </p>
          </div>

          {/* Field 2: Nama Tombol */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Tombol (Muncul di WhatsApp)
            </label>
            <input
              type="text"
              value={modalBtnName}
              onChange={(e) => setModalBtnName(e.target.value)}
              placeholder="Contoh: Buka Website, Katalog Produk, Hubungi Admin"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
            />
          </div>

          {/* Field 3: Output Dinamis Berdasarkan Tipe */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            {modalBtnType === 'quick_reply' && (
              <div className="space-y-3">
                {/* Dropdown Pemicu Command / Unknown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Aksi Pemicu Command (Dropdown)</span>
                    <span className="text-[11px] font-normal text-slate-400">Tentukan respon otomatis</span>
                  </label>
                  <div className="relative">
                    <select
                      value={quickReplyAction}
                      onChange={(e) => {
                        const val = e.target.value as QuickReplyTriggerAction;
                        setQuickReplyAction(val);
                        const isDefaultCmdOutput =
                          !quickReplyOutput ||
                          ['.list', '.owner', '.admin', '.menu'].includes(quickReplyOutput.trim());
                        if (val === 'list' && isDefaultCmdOutput) {
                          setQuickReplyOutput('.list');
                        } else if (val === 'owner' && isDefaultCmdOutput) {
                          setQuickReplyOutput('.owner');
                        } else if (val === 'admin' && isDefaultCmdOutput) {
                          setQuickReplyOutput('.admin');
                        } else if (val === 'menu' && isDefaultCmdOutput) {
                          setQuickReplyOutput('.menu');
                        }
                      }}
                      className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 cursor-pointer shadow-2xs"
                    >
                      <option value="list">Command: List (Memicu pesan Command List)</option>
                      <option value="owner">Command: Owner (Memicu Kontak Owner vCard)</option>
                      <option value="admin">Command: Admin (Memicu Kontak Admin vCard)</option>
                      <option value="menu">Command: Menu (Memicu pesan Command Menu)</option>
                      <option value="unknown">Unknown (Tidak memicu command apapun)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {quickReplyAction === 'list' && '⚡ Memilih "List" akan langsung memicu pesan Command List ketika tombol ditekan.'}
                    {quickReplyAction === 'owner' && '👑 Memilih "Owner" akan langsung mengirimkan kartu kontak (vCard) Owner dari tab Store Info.'}
                    {quickReplyAction === 'admin' && '📞 Memilih "Admin" akan langsung mengirimkan kontak (vCard) Admin, atau info belum di-set jika kosong.'}
                    {quickReplyAction === 'menu' && '📋 Memilih "Menu" akan langsung memicu pesan Command Menu.'}
                    {quickReplyAction === 'unknown' && '⚪ Memilih "Unknown" tidak akan memicu command apapun (hanya teks balasan biasa).'}
                  </p>
                </div>

                {/* Output Pesan Balasan */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Output Pesan Balasan
                    </label>
                    <div className="flex items-center gap-1">
                      {['{storeName}', '{ownerName}'].map((ph) => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => setQuickReplyOutput((prev) => `${prev} ${ph}`.trim())}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                        >
                          + {ph}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={quickReplyOutput}
                    onChange={(e) => setQuickReplyOutput(e.target.value)}
                    placeholder={
                      quickReplyAction === 'list'
                        ? '.list'
                        : quickReplyAction === 'owner'
                        ? '.owner'
                        : quickReplyAction === 'admin'
                        ? '.admin'
                        : quickReplyAction === 'menu'
                        ? '.menu'
                        : 'Contoh: .katalog atau Saya ingin memesan di {storeName}'
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Teks atau command payload yang dikirim saat tombol ditekan oleh pengguna.
                  </p>
                </div>
              </div>
            )}

            {modalBtnType === 'cta_url' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Output Tautan URL (Dapat berupa https:// atau placeholder)
                  </label>
                  <div className="flex items-center gap-1">
                    {['{webLink}', '{waLink}'].map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => setUrlOutput(ph)}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                      >
                        Set {ph}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={urlOutput}
                  onChange={(e) => setUrlOutput(e.target.value)}
                  placeholder="{webLink} atau https://wanztstore.web.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  URL website yang akan terbuka di browser. Gunakan <code className="text-sky-700 bg-sky-50 px-1 rounded">{'{webLink}'}</code> atau URL lengkap diawali https://.
                </p>
              </div>
            )}

            {modalBtnType === 'cta_copy' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Output Teks yang Disalin
                  </label>
                  <div className="flex items-center gap-1">
                    {['{adminNumber}', '{ownerNumber}', '{webLink}'].map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => setCopyOutput((prev) => (prev ? `${prev} ${ph}` : ph))}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                      >
                        + {ph}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={copyOutput}
                  onChange={(e) => setCopyOutput(e.target.value)}
                  placeholder="Contoh: {adminNumber} atau 085712439395"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Teks atau angka yang langsung disalin ke clipboard pengguna di HP.
                </p>
              </div>
            )}

            {(modalBtnType === 'vcard' || modalBtnType === 'cta_call') && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      1. Nama Kontak (Misal: Admin Store, Owner, atau {'{adminName}'})
                    </label>
                    <div className="flex items-center gap-1">
                      {['{adminName}', '{ownerName}', '{storeName}'].map((ph) => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => setCallTarget(ph)}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                        >
                          Set {ph}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={callTarget}
                    onChange={(e) => setCallTarget(e.target.value)}
                    placeholder="Contoh: {adminName} atau Admin Toko"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      2. Nomor WhatsApp Kontak (Misal: 628... atau {'{ownerNumber}'})
                    </label>
                    <div className="flex items-center gap-1">
                      {['{ownerNumber}', '{adminNumber}'].map((ph) => (
                        <button
                          key={ph}
                          type="button"
                          onClick={() => setCallPhone(ph)}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                        >
                          Set {ph}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={callPhone}
                    onChange={(e) => setCallPhone(e.target.value)}
                    placeholder="Contoh: {ownerNumber} atau 6282173515807"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Saat tombol ini ditekan di WhatsApp, bot akan otomatis mengirimkan kartu kontak (vCard) nomor ini. Anda dapat memasukkan placeholder <code className="text-sky-700 font-mono">{'{ownerNumber}'}</code> atau <code className="text-sky-700 font-mono">{'{adminNumber}'}</code>.
                  </p>
                </div>
              </div>
            )}

            {modalBtnType === 'cta_reminder' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Output Judul / ID Pengingat
                </label>
                <input
                  type="text"
                  value={reminderOutput}
                  onChange={(e) => setReminderOutput(e.target.value)}
                  placeholder="Contoh: reminder_perpanjang_1 atau Pengingat Perpanjangan Akun"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  ID atau judul pengingat yang akan dibuatkan notifikasi di WhatsApp pengguna.
                </p>
              </div>
            )}

            {modalBtnType === 'cta_cancel_reminder' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Output ID Pengingat yang Dibatalkan
                </label>
                <input
                  type="text"
                  value={cancelReminderOutput}
                  onChange={(e) => setCancelReminderOutput(e.target.value)}
                  placeholder="Contoh: reminder_perpanjang_1"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 transition shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  ID pengingat yang sebelumnya telah dibuat dan ingin dibatalkan.
                </p>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {editingButtonId ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  Perbarui Tombol
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Simpan Tombol
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
