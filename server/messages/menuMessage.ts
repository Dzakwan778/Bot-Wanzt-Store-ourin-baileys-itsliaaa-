import fs from 'fs';
import path from 'path';
import { CommandsConfig } from '../types/bot.types.js';
import { resolvePlaceholders } from '../services/placeholderHelper.js';

export async function sendMenuInteractiveMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;

  const rawTitle = config.menuOutputText || 'Halo kak! Selamat datang di {storeName} ✨\n\nSilakan pilih layanan yang ingin Anda pesan melalui tombol interaktif di bawah ini:';
  const rawFooter = config.menuFooterText || '{webLink} • Otomatis';

  const titleText = resolvePlaceholders(rawTitle, config);
  const footerText = resolvePlaceholders(rawFooter, config);

  const nativeFlowButtons: any[] = (config.menuButtons || []).map((btn) => {
    const btnDisplayName = resolvePlaceholders(btn.name, config);

    switch (btn.type) {
      case 'cta_url': {
        const rawUrl = resolvePlaceholders(btn.output || '', config).trim();
        const validUrl = rawUrl.startsWith('http') ? rawUrl : (rawUrl ? `https://${rawUrl}` : 'https://wanztstore.web.id');
        return {
          text: btnDisplayName || '🌐 Kunjungi Website',
          url: validUrl,
        };
      }
      case 'cta_call': {
        const rawPhone = resolvePlaceholders(btn.callPhoneNumber || btn.output || '', config);
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        return {
          text: btnDisplayName || '📞 Telepon',
          call: cleanPhone || '6282173515807',
        };
      }
      case 'cta_copy': {
        const rawCopy = resolvePlaceholders(btn.output || '', config);
        return {
          text: btnDisplayName || '📋 Salin',
          copy: rawCopy || btnDisplayName,
        };
      }
      case 'vcard': {
        const rawPhone = resolvePlaceholders(btn.callPhoneNumber || btn.output || '', config);
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        return {
          text: btnDisplayName || '👤 Kontak Admin',
          id: `vcard_${cleanPhone || btn.id}`,
        };
      }
      case 'quick_reply':
      default: {
        const actionId = resolvePlaceholders(btn.output || btn.name || 'menu_item', config);
        return {
          text: btnDisplayName || '👉 Klik Di Sini',
          id: actionId,
        };
      }
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

  // Jika TIDAK ADA tombol interaktif yang dikonfigurasi (0 tombol):
  // Kirim murni gambar dengan caption titleText atau pesan teks titleText biasa tanpa footer sama sekali
  if (nativeFlowButtons.length === 0) {
    try {
      if (imageInput) {
        await sock.sendMessage(
          remoteJid,
          { image: imageInput, caption: titleText },
          quotedMsg ? { quoted: quotedMsg } : undefined
        );
        if (addLog) {
          addLog('success', `✅ Berhasil membalas command MENU (gambar & caption murni tanpa tombol & tanpa footer) ke ${remoteJid}`);
        }
      } else {
        await sock.sendMessage(
          remoteJid,
          { text: titleText },
          quotedMsg ? { quoted: quotedMsg } : undefined
        );
        if (addLog) {
          addLog('success', `✅ Berhasil membalas command MENU (teks murni tanpa tombol & tanpa footer) ke ${remoteJid}`);
        }
      }
    } catch (err: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim menu tanpa tombol: ${err?.message || err}`);
      }
    }
    return;
  }

  // Jika ADA tombol interaktif yang dikonfigurasi:
  try {
    const payload: any = {
      text: titleText,
      footer: footerText,
      nativeFlow: nativeFlowButtons,
    };

    if (imageInput) {
      payload.image = imageInput;
      payload.caption = titleText;
      delete payload.text;
    }

    await sock.sendMessage(remoteJid, payload, quotedMsg ? { quoted: quotedMsg } : undefined);
    if (addLog) {
      addLog('success', `✅ Berhasil mengirim command MENU dengan ${nativeFlowButtons.length} tombol interaktif ke ${remoteJid}${imageInput ? ' (dengan gambar)' : ''}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('warning', `Pengiriman menu interaktif gagal: ${err?.message || err}. Mencoba fallback teks/gambar...`);
    }
    try {
      const fullFallbackText = footerText ? `${titleText}\n\n_${footerText}_` : titleText;
      if (imageInput) {
        await sock.sendMessage(remoteJid, { image: imageInput, caption: fullFallbackText }, quotedMsg ? { quoted: quotedMsg } : undefined);
      } else {
        await sock.sendMessage(remoteJid, { text: fullFallbackText }, quotedMsg ? { quoted: quotedMsg } : undefined);
      }
      if (addLog) {
        addLog('success', `✅ Berhasil membalas command MENU (fallback) ke ${remoteJid}`);
      }
    } catch (fallbackErr: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim menu: ${fallbackErr?.message || fallbackErr}`);
      }
    }
  }
}
