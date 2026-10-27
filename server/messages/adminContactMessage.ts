import { CommandsConfig } from '../types/bot.types.js';
import { resolvePlaceholders } from '../services/placeholderHelper.js';

/**
 * Mengirimkan vCard kontak Owner Toko dari data Store Info
 */
export async function sendOwnerContactMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const store = config.storeInfo || {
    storeName: 'Wanzt Store',
    ownerName: 'Wanzt',
    ownerNumber: '6282173515807',
  };

  const displayName = resolvePlaceholders(store.ownerName || '{ownerName}', config) || 'Owner Store';
  const orgName = resolvePlaceholders(store.storeName || '{storeName}', config) || 'Wanzt Store';
  const rawNumber = resolvePlaceholders(store.ownerNumber || '{ownerNumber}', config);
  const cleanNumber = (rawNumber || '').replace(/[^0-9]/g, '');

  if (!cleanNumber) {
    try {
      await sock.sendMessage(
        remoteJid,
        { text: 'Informasi tentang owner belum di set pada toko ini' },
        quotedMsg ? { quoted: quotedMsg } : undefined
      );
      if (addLog) {
        addLog('warning', `⚠️ Nomor owner belum di-set pada Store Info.`);
      }
    } catch (err: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim pesan info owner: ${err?.message || err}`);
      }
    }
    return;
  }

  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    `FN:${displayName}\n` +
    `ORG:${orgName};\n` +
    `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n` +
    'END:VCARD';

  try {
    await sock.sendMessage(
      remoteJid,
      {
        contacts: {
          displayName,
          contacts: [{ vcard }],
        },
      },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );
    if (addLog) {
      addLog('success', `👑 Berhasil mengirimkan kartu kontak (vCard) Owner: ${displayName} (${cleanNumber}) ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('error', `Gagal mengirim kontak owner: ${err?.message || err}`);
    }
  }
}

/**
 * Mengirimkan vCard kontak Admin Toko dari data Store Info
 * Karena data admin bersifat opsional: jika form admin kosong, kirimkan pesan peringatan
 */
export async function sendAdminContactMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const store = config.storeInfo;
  const rawNumber = store?.adminNumber ? String(store.adminNumber).trim() : '';
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '');

  // Pengecekan form opsional admin: jika form kosong / belum diatur
  if (!cleanNumber) {
    try {
      await sock.sendMessage(
        remoteJid,
        { text: 'Informasi tentang admin belum di set pada toko ini' },
        quotedMsg ? { quoted: quotedMsg } : undefined
      );
      if (addLog) {
        addLog('info', `ℹ️ Form admin belum di-set. Mengirimkan pesan: "Informasi tentang admin belum di set pada toko ini" ke ${remoteJid}`);
      }
    } catch (err: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim pesan status admin: ${err?.message || err}`);
      }
    }
    return;
  }

  // Jika form admin terisi, susun dan kirim vCard
  const displayName = resolvePlaceholders(store?.adminName || '{adminName}', config) || 'Admin Store';
  const orgName = resolvePlaceholders(store?.storeName || '{storeName}', config) || 'Wanzt Store';

  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    `FN:${displayName}\n` +
    `ORG:${orgName};\n` +
    `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n` +
    'END:VCARD';

  try {
    await sock.sendMessage(
      remoteJid,
      {
        contacts: {
          displayName,
          contacts: [{ vcard }],
        },
      },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );
    if (addLog) {
      addLog('success', `📞 Berhasil mengirimkan kartu kontak (vCard) Admin: ${displayName} (${cleanNumber}) ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('error', `Gagal mengirim kontak admin: ${err?.message || err}`);
    }
  }
}
