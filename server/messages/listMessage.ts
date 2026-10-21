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

  try {
    // Gunakan protokol resmi ListMessage bawaan WhatsApp untuk SEMUA jenis obrolan (Private Chat maupun Group Chat).
    // Protokol ini memastikan bahwa saat pengguna memilih opsi produk (seperti 'YouTube'),
    // balasan otomatis dikirim oleh WhatsApp sebagai 'listResponseMessage' resmi:
    // YouTube
    // Tampilkan varian YouTube
    // sehingga dapat dirender secara normal dan sempurna dari SEMUA POV (pengirim, penerima, dan seluruh anggota grup)
    // tanpa ada pesan "unsupported" sama sekali!
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
        title: 'Wanzt Store - Katalog Produk',
        footer: 'wanztstore.web.id • Pilih Produk',
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
