export async function sendAdminContactMessage(
  sock: any,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const vcard =
    'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    'FN:Admin Wanzt Store\n' +
    'ORG:Wanzt Store;\n' +
    'TEL;type=CELL;type=VOICE;waid=6283861276608:+62 838-6127-6608\n' +
    'END:VCARD';

  try {
    await sock.sendMessage(
      remoteJid,
      {
        contacts: {
          displayName: 'Admin Wanzt Store',
          contacts: [{ vcard }],
        },
      },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );
    if (addLog) {
      addLog('success', `✅ Berhasil mengirimkan kontak tunggal Admin Wanzt Store (083861276608) ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('error', `Gagal mengirim kontak admin: ${err?.message || err}`);
    }
  }
}
