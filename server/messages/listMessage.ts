import { CommandsConfig } from '../types/bot.types.js';
import { generateDaftarProdukText, getSingleSelectSections, DEFAULT_CATALOG } from '../services/xavieraService.js';
import { buildQuoteContextInfo } from '../services/quoteHelper.js';

export async function sendListInteractiveMessage(
  sock: any,
  config: CommandsConfig,
  remoteJid: string,
  quotedMsg?: any,
  addLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void
): Promise<void> {
  if (!sock) return;


  // Ambil sections dan daftar produk secara dinamis langsung dari API Xaviera sesuai kategori
  const sectionsData = await getSingleSelectSections(config);

  // Siapkan teks respon lengkap dengan seluruh daftar produk
  const daftarProdukText = await generateDaftarProdukText(config);
  let responseText = config.listOutputText?.trim() || '';

  if (responseText.includes('{daftarProduk}')) {
    responseText = responseText.replace(/\{daftarProduk\}/g, daftarProdukText);
  } else if (responseText) {
    responseText = `${responseText}\n\n${daftarProdukText}\n\nKetik nama produk yang ingin Anda pesan.`;
  } else {
    responseText = `Halo kak! Berikut daftar produk aplikasi yang tersedia di wanztstore.web.id:\n\n${daftarProdukText}\n\nKetik nama produk yang ingin Anda pesan.`;
  }

  try {
    const singleSelectButton = {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: '📋 Pilih Produk',
        sections: sectionsData,
      }),
    };

    const interactiveListPayload: any = {
      interactiveMessage: {
        title: responseText,
        footer: 'wanztstore.web.id • Pilih Produk',
        buttons: [singleSelectButton],
      },
    };


    if (quotedMsg) {
      const userJid = sock.user?.id || sock.authState?.creds?.me?.id || '';
      const contextInfo = buildQuoteContextInfo(quotedMsg, remoteJid, userJid);
      if (contextInfo) {
        interactiveListPayload.interactiveMessage.contextInfo = contextInfo;
      }
    }

    await sock.sendMessage(
      remoteJid,
      interactiveListPayload,
      quotedMsg ? { quoted: quotedMsg } : undefined
    );

    if (addLog) {
      addLog('success', `✅ Berhasil mengirim pesan LIST dengan tombol dropdown produk ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('warning', `Pengiriman dropdown LIST nativeFlow gagal (${err?.message || err}). Mengirim fallback text...`);
    }
    try {
      await sock.sendMessage(remoteJid, { text: responseText }, quotedMsg ? { quoted: quotedMsg } : undefined);
      if (addLog) {
        addLog('success', `✅ Berhasil membalas command LIST (fallback text) ke ${remoteJid}`);
      }
    } catch (fallbackErr: any) {
      if (addLog) {
        addLog('error', `Gagal mengirim respon LIST: ${fallbackErr?.message || fallbackErr}`);
      }
    }
  }
}

