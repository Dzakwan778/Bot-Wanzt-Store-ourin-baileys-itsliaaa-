import { CommandsConfig } from '../types/bot.types.js';
import { generateDaftarProdukText, getSingleSelectSections } from '../services/xavieraService.js';

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

  const isGroup = remoteJid.endsWith('@g.us');

  try {
    if (isGroup) {
      // Untuk Grup: gunakan buttons dengan native flow single_select agar kompatibel di chat grup
      const groupSections = sectionsData.map((sec) => ({
        title: sec.title,
        rows: sec.rows.map((row) => ({
          title: row.title,
          description: row.description || `Tampilkan varian *${row.title}*`,
          id: row.rowId || row.id || `prod_select:${row.title}`,
        })),
      }));

      await sock.sendMessage(
        remoteJid,
        {
          text: responseText,
          footer: 'wanztstore.web.id • Pilih Produk',
          buttons: [
            {
              text: '📋 Pilih Produk',
              sections: groupSections,
            },
          ],
        },
        quotedMsg ? { quoted: quotedMsg } : undefined
      );
    } else {
      // Untuk Obrolan Pribadi (Private Chat @s.whatsapp.net / @lid):
      // Menggunakan protokol resmi listMessage bawaan WhatsApp.
      // Ketika pengguna memilih produk (misalnya 'YouTube'), WhatsApp client mengirim 'listResponseMessage'
      // dan WhatsApp akan merender pesan teks balasan resmi:
      // YouTube
      // Tampilkan varian *YouTube*
      // di SEMUA POV (pengirim, penerima, bot) secara sempurna tanpa peringatan "unsupported"!
      const privateSections = sectionsData.map((sec) => ({
        title: sec.title,
        rows: sec.rows.map((row) => ({
          title: row.title,
          description: row.description || `Tampilkan varian *${row.title}*`,
          rowId: row.rowId || row.id || `prod_select:${row.title}`,
        })),
      }));

      await sock.sendMessage(
        remoteJid,
        {
          text: responseText,
          title: 'Wanzt Store - Katalog Produk',
          footer: 'wanztstore.web.id • Pilih Produk',
          buttonText: '📋 Pilih Produk',
          sections: privateSections,
        },
        quotedMsg ? { quoted: quotedMsg } : undefined
      );
    }

    if (addLog) {
      addLog('success', `✅ Berhasil mengirim pesan LIST dropdown Single Select ke ${remoteJid}`);
    }
  } catch (err: any) {
    if (addLog) {
      addLog('warning', `Pengiriman dropdown LIST gagal (${err?.message || err}). Mengirim fallback text...`);
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
