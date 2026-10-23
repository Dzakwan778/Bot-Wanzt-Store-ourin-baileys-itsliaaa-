import { CommandsConfig } from '../types/bot.types.js';
import { resolvePlaceholders } from '../services/placeholderHelper.js';

export async function sendAdminContactMessage(
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
    adminName: 'Admin Store',
    adminNumber: '6285712439395',
  };

  const displayName = resolvePlaceholders(store.adminName || '{adminName}', config) || 'Admin Store';
  const orgName = resolvePlaceholders(store.storeName || '{storeName}', config) || 'Wanzt Store';
  const rawNumber = resolvePlaceholders(store.adminNumber || store.ownerNumber || '{adminNumber}', config);
  const cleanNumber = rawNumber.replace(/[^0-9]/g, '') || '6282173515807';

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
      addLog('success', `✅ Berhasil mengirimkan kontak ${displayName} (${cleanNumber}) ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('error', `Gagal mengirim kontak admin: ${err?.message || err}`);
    }
  }
}
