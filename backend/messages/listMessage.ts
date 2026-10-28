import { CommandsConfig } from '../types/bot.types.js';
import { generateDaftarProdukText, getSingleSelectSections } from '../services/xavieraService.js';
import { resolvePlaceholders } from '../services/placeholderHelper.js';

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

  // Jika daftar produk kosong dari API, kirim pesan informasi jujur dan jangan kirim katalog palsu
  if (!daftarProdukText && sectionsData.length === 0) {
    const emptyMsg = `Halo kak! Saat ini katalog produk belum tersedia atau sedang dalam pembaruan dari server pusat. Silakan hubungi admin kami untuk informasi produk dan stok.`;
    await sock.sendMessage(remoteJid, { text: emptyMsg }, quotedMsg ? { quoted: quotedMsg } : undefined);
    if (addLog) {
      addLog('warning', `⚠️ Daftar produk kosong dari API Xaviera (API Key tidak valid / belum ada produk). Pesan pemberitahuan terkirim ke ${remoteJid}.`);
    }
    return;
  }

  let rawResponseText = config.listOutputText?.trim() || '';

  if (rawResponseText.includes('{daftarProduk}')) {
    rawResponseText = rawResponseText.replace(/\{daftarProduk\}/g, daftarProdukText);
  } else if (rawResponseText) {
    rawResponseText = `${rawResponseText}\n\n${daftarProdukText}\n\nKetik nama produk yang ingin Anda pesan.`;
  } else {
    rawResponseText = `Halo kak! Berikut daftar produk aplikasi yang tersedia di {storeName}:\n\n${daftarProdukText}\n\nKetik nama produk yang ingin Anda pesan.`;
  }

  // Terapkan seluruh placeholder dinamis ({storeName}, {ownerName}, {webLink}, dll.)
  const responseText = resolvePlaceholders(rawResponseText, config);
  const rawFooter = config.listFooterText || '{webLink} • Pilih Produk';
  const footerText = resolvePlaceholders(rawFooter, config);
  const titleText = resolvePlaceholders('{storeName} - Katalog Produk', config);

  try {
    const mappedSections = sectionsData.map((sec) => ({
      title: sec.title,
      rows: sec.rows.map((row) => ({
        title: row.title,
        description: row.description || `Tampilkan varian ${row.title}`,
        rowId: row.rowId || row.id || `prod_select:${row.title}`,
      })),
    }));

    await sock.sendMessage(
      remoteJid,
      {
        text: responseText,
        title: titleText,
        footer: footerText,
        buttonText: '📋 Pilih Produk',
        sections: mappedSections,
      },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );

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
