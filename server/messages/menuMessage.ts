import fs from 'fs';
import path from 'path';
import { CommandsConfig } from '../types/bot.types.js';

export async function sendMenuInteractiveMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const buttons: any[] = (config.menuButtons || []).map((btn) => {
    switch (btn.type) {
      case 'cta_url':
        return {
          name: 'cta_url',
          paramsJson: JSON.stringify({
            display_text: btn.name,
            url: btn.output.startsWith('http') ? btn.output : `https://${btn.output}`,
          }),
        };
      case 'cta_call':
        return {
          name: 'cta_call',
          paramsJson: JSON.stringify({
            display_text: btn.name,
            phone_number: (btn.callPhoneNumber || btn.output || '').replace(/[^0-9]/g, ''),
          }),
        };
      case 'vcard':
        return {
          text: btn.name,
          id: `vcard_${(btn.callPhoneNumber || btn.output || '').replace(/[^0-9]/g, '') || btn.id}`,
        };
      case 'quick_reply':
      default:
        return {
          text: btn.name,
          id: btn.output || btn.name || 'menu_item',
        };
    }
  });

  let imageInput: Buffer | undefined = undefined;
  if (config.includeMedia && config.selectedPicture) {
    try {
      const safeName = path.basename(config.selectedPicture);
      const picPath = path.join(process.cwd(), 'src', 'media', 'picture', safeName);
      if (fs.existsSync(picPath)) {
        const buf = fs.readFileSync(picPath);
        if (buf.length <= 10 * 1024 * 1024) {
          imageInput = buf;
        } else if (addLog) {
          addLog('warning', `Ukuran gambar menu (${(buf.length / (1024 * 1024)).toFixed(2)} MB) melebihi batas 10MB.`);
        }
      } else if (addLog) {
        addLog('warning', `File gambar terpilih tidak ditemukan di ./src/media/picture: ${safeName}`);
      }
    } catch (err: any) {
      if (addLog) {
        addLog('warning', `Gagal membaca gambar dari ./src/media/picture: ${err?.message || err}`);
      }
    }
  }

  const titleText = config.menuOutputText || 'Halo! Berikut menu kami:';
  const footerText = 'wanztstore.web.id • Otomatis';

  try {
    const payload: any = {
      text: titleText,
      footer: footerText,
      buttons: buttons.length > 0 ? buttons : [{ text: '📑 List Produk', id: '.list' }],
    };

    if (imageInput) {
      payload.image = imageInput;
      payload.caption = titleText;
      delete payload.text;
    }

    await sock.sendMessage(remoteJid, payload, quotedMsg ? { quoted: quotedMsg } : undefined);
    if (addLog) {
      addLog('success', `✅ Berhasil mengirim command MENU dengan tombol interaktif ke ${remoteJid}${imageInput ? ' (dengan gambar)' : ''}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('warning', `Pengiriman menu interaktif gagal: ${err?.message || err}. Mencoba fallback teks...`);
    }
    try {
      await sock.sendMessage(remoteJid, { text: titleText }, quotedMsg ? { quoted: quotedMsg } : undefined);
      if (addLog) {
        addLog('success', `✅ Berhasil membalas command MENU (fallback text) ke ${remoteJid}`);
      }
    } catch (fallbackErr: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim menu interaktif: ${fallbackErr?.message || fallbackErr}`);
      }
    }
  }
}
