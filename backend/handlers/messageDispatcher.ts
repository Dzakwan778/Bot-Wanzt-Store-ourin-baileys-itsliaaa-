import fs from 'fs';
import path from 'path';
import { ALLOWED_PREFIXES, CommandsConfig, SESSION_DIR } from '../types/bot.types.ts';
import { sendMenuInteractiveMessage } from '../messages/menuMessage.ts';
import { sendListInteractiveMessage } from '../messages/listMessage.ts';
import { sendProductVariantsCarousel } from '../messages/carouselMessage.ts';
import { sendAdminContactMessage, sendOwnerContactMessage, sendInvoiceAdminContactMessage } from '../messages/adminContactMessage.ts';
import { isKnownProduct, checkXavieraBalance, DEFAULT_CATALOG } from '../services/xavieraService.ts';
import { resolvePlaceholders } from '../services/placeholderHelper.ts';
import { loadGroupsConfig } from '../services/groupService.ts';
import { createLunasQrisTransaction, startLunasQrisPolling } from '../services/lunasQrisService.ts';
import { recordTransaction, updateTransactionStatus } from '../services/transactionManager.ts';
import { DEFAULT_INVOICE_TEMPLATE } from '../config/configManager.ts';
import { getPricingConfig } from '../database/sqlite.ts';
import QRCode from 'qrcode';
import axios from 'axios';

export interface DispatcherDeps {
  addLog: (type: 'info' | 'success' | 'warning' | 'error' | 'code', msg: string) => void;
  resolveTargetJid: (jid: string) => string;
}

// Set untuk melacak ID pesan yang dikirim otomatis oleh bot agar tidak terjadi loop respon
export const botSentMessageIds = new Set<string>();

export function markMessageAsBotSent(id?: string) {
  if (!id) return;
  botSentMessageIds.add(id);
  if (botSentMessageIds.size > 1000) {
    const oldest = botSentMessageIds.values().next().value;
    if (oldest) botSentMessageIds.delete(oldest);
  }
}

export async function dispatchIncomingMessages(
  sock: any,
  config: CommandsConfig,
  messages: any[],
  type: string,
  deps: DispatcherDeps
): Promise<void> {
  // Izinkan event 'notify' dan 'append' (pesan yang dikirim dari HP/WhatsApp Web bot sendiri masuk sebagai 'append')
  if ((type !== 'notify' && type !== 'append') || !sock) return;

  for (const m of messages) {
    if (!m.message) {
      // Deteksi jika pesan gagal didekripsi (CIPHERTEXT stub)
      if (m.messageStubType === 2 /* CIPHERTEXT */) {
        const participant = m.key?.participant || m.key?.remoteJid || '';
        const cleanId = participant.split('@')[0].split(':')[0];
        if (cleanId) {
          try {
            if (fs.existsSync(SESSION_DIR)) {
              const files = fs.readdirSync(SESSION_DIR);
              for (const f of files) {
                if (f.startsWith(`session-${cleanId}`) && f.endsWith('.json')) {
                  fs.unlinkSync(path.join(SESSION_DIR, f));
                }
              }
            }
          } catch {}
          deps.addLog('warning', `⚠️ Sesi enkripsi dengan ${cleanId} direfresh otomatis untuk memulihkan sesi Signal.`);
        }
      }
      continue;
    }

    // Abaikan jika pesan ini adalah pesan balasan otomatis yang dikirim oleh skrip bot sendiri
    if (m.key?.id && botSentMessageIds.has(m.key.id)) {
      continue;
    }

    // Abaikan pesan riwayat lama (> 120 detik) saat sinkronisasi awal akun
    const msgTimestamp = typeof m.messageTimestamp === 'number'
      ? m.messageTimestamp
      : (m.messageTimestamp as any)?.low || 0;
    const nowSec = Math.floor(Date.now() / 1000);
    if (msgTimestamp && (nowSec - msgTimestamp > 120)) {
      continue;
    }

    let remoteJid = m.key.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast') continue;
    // Normalisasi remoteJid dari akhiran device Baileys (contoh: 628xxx:1@s.whatsapp.net -> 628xxx@s.whatsapp.net)
    if (remoteJid.includes(':')) {
      remoteJid = remoteJid.replace(/:[0-9]+@/, '@');
    }
    remoteJid = deps.resolveTargetJid(remoteJid);

    // Sistem Whitelist Grup: Jika pesan berasal dari grup WhatsApp (@g.us),
    // periksa apakah grup ini aktif di toggle whitelist database/groups_config.json
    const isGroup = remoteJid.endsWith('@g.us');
    if (isGroup) {
      const toggledGroups = loadGroupsConfig();
      const isWhitelisted = Boolean(toggledGroups[remoteJid]);
      if (!isWhitelisted) {
        // Grup tidak di-whitelist / toggle nonaktif: abaikan seluruh command/pesan tanpa respon
        continue;
      }
    }

    // Deteksi apakah pesan berasal dari klik tombol interaktif (Quick Reply / Native Flow / Template / List)
    let isInteractiveButtonResponse = false;
    let isListSelectResponse = false;
    let isQuickReplyResponse = false;
    let buttonIdOrText = '';

    // 1. Tombol Respon WhatsApp (buttonsResponseMessage)
    if (m.message?.buttonsResponseMessage) {
      isInteractiveButtonResponse = true;
      isQuickReplyResponse = true;
      buttonIdOrText =
        m.message.buttonsResponseMessage.selectedButtonId ||
        m.message.buttonsResponseMessage.selectedDisplayText ||
        '';
    }
    // 2. Tombol Balasan Template (templateButtonReplyMessage)
    else if (m.message?.templateButtonReplyMessage) {
      isInteractiveButtonResponse = true;
      isQuickReplyResponse = true;
      buttonIdOrText =
        m.message.templateButtonReplyMessage.selectedId ||
        m.message.templateButtonReplyMessage.selectedDisplayText ||
        '';
    }
    // 3. Tombol Native Flow / Single Select / Quick Reply (interactiveResponseMessage)
    else if (m.message?.interactiveResponseMessage) {
      isInteractiveButtonResponse = true;
      const nativeFlow = m.message.interactiveResponseMessage?.nativeFlowResponseMessage;
      const flowName = (nativeFlow?.name || '').toLowerCase();
      const paramsJson = nativeFlow?.paramsJson;

      let paramId = '';
      let paramTitle = '';
      if (paramsJson) {
        try {
          const parsed = JSON.parse(paramsJson);
          paramId = (parsed.id || parsed.row_id || '').trim();
          paramTitle = (parsed.title || parsed.display_text || '').trim();
          buttonIdOrText = paramId || paramTitle || '';
        } catch {
          buttonIdOrText = paramsJson;
        }
      }
      if (!buttonIdOrText && m.message.interactiveResponseMessage?.body?.text) {
        buttonIdOrText = m.message.interactiveResponseMessage.body.text.trim();
      }

      const isSingleSelect =
        flowName.includes('single_select') ||
        flowName === 'single_select_reply' ||
        buttonIdOrText.startsWith('prod_select:') ||
        paramId.startsWith('prod_select:') ||
        isKnownProduct(buttonIdOrText) ||
        isKnownProduct(paramTitle);

      if (isSingleSelect) {
        isListSelectResponse = true;
      } else {
        isQuickReplyResponse = true;
      }
    }
    // 4. Tombol Balasan List Menu (listResponseMessage)
    else if (m.message?.listResponseMessage) {
      isInteractiveButtonResponse = true;
      isListSelectResponse = true;
      buttonIdOrText =
        m.message.listResponseMessage.singleSelectReply?.selectedRowId ||
        m.message.listResponseMessage.title ||
        '';
    }

    // Ekstraksi teks biasa jika bukan pesan respon tombol
    const rawText =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      '';
    const trimmedText = rawText.trim();
    const isFromBotSelf = Boolean(m.key?.fromMe);
    const senderName =
      m.pushName ||
      (isFromBotSelf
        ? sock.user?.name || 'Owner (Bot)'
        : (m.key?.participant || remoteJid).split('@')[0]);

    const cleanBtn = (buttonIdOrText || '').trim();

    // 1. TANGANI INTERAKSI TOMBOL KHUSUS CAROUSEL, ORDER & VCARD
    // A. Tombol Contact Admin & Invoice Contact Admin
    if (
      cleanBtn === 'invoice_contact_admin' ||
      cleanBtn === 'contact_admin' ||
      (isInteractiveButtonResponse &&
        (cleanBtn.toLowerCase().includes('invoice_contact_admin') ||
          cleanBtn.toLowerCase().includes('contact_admin')))
    ) {
      if (
        cleanBtn === 'invoice_contact_admin' ||
        cleanBtn.toLowerCase().includes('invoice_contact_admin')
      ) {
        deps.addLog('info', `📞 Tombol "Hubungi Admin" (dari Invoice) ditekan oleh ${senderName}`);
        await sendInvoiceAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
      } else {
        deps.addLog('info', `📞 Tombol "Contact Admin" ditekan oleh ${senderName}`);
        await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
      }
      continue;
    }

    // B. Tombol Order Varian (Integrasi Payment Gateway Sairi & Privacy-First Flow)
    if (cleanBtn.startsWith('order_')) {
      let productName = 'Produk Pilihan';
      let variantName = 'Varian Pilihan';
      let price = 5000;

      if (cleanBtn.startsWith('order_var:')) {
        const raw = cleanBtn.replace(/^order_var:/, '');
        const [pEnc, vEnc, pPrice] = raw.split('|');
        try {
          if (pEnc) productName = decodeURIComponent(pEnc);
          if (vEnc) variantName = decodeURIComponent(vEnc);
        } catch {}
        if (pPrice && !isNaN(Number(pPrice))) {
          price = Number(pPrice);
        }
      } else {
        variantName = cleanBtn.replace(/^order_/, '').trim() || 'Varian Pilihan';
      }

      deps.addLog('info', `🛒 Pelanggan ${senderName} menekan tombol ORDER: "${productName} - ${variantName}" (Rp ${price.toLocaleString('id-ID')})`);

      // Dapatkan JID pemicu/pengirim secara presisi untuk pengiriman DM
      let senderJid = m.key?.participant || remoteJid;
      if (senderJid.includes(':')) {
        senderJid = senderJid.replace(/:[0-9]+@/, '@');
      }
      senderJid = deps.resolveTargetJid(senderJid);
      const senderCleanNumber = (senderJid.split('@')[0] || '').replace(/[^0-9]/g, '');
      const storeTitle = resolvePlaceholders('{storeName}', config) || 'Toko Kami';

      // 1. Pre-check Saldo Utama di Akun Xaviera (Hitung harga modal berdasarkan markup aktif)
      const currentPricing = config.pricingConfig || getPricingConfig();
      let costPrice = price;
      if (currentPricing.mode === 'rp') {
        costPrice = Math.max(0, price - (currentPricing.value || 0));
      } else {
        const pct = (currentPricing.value || 0) / 100;
        costPrice = pct > 0 ? Math.round(price / (1 + pct)) : price;
      }
      try {
        const xavieraBal = await checkXavieraBalance(costPrice, config);
        if (!xavieraBal.sufficient) {
          deps.addLog('warning', `⚠️ Saldo Xaviera tidak mencukupi untuk order ${productName} (Saldo: ${xavieraBal.currentBalance}, Butuh Modal: ${costPrice})`);
          const outOfStockMsg = `Maaf kak @${senderCleanNumber}, saat ini stok atau saldo produk *${productName} (${variantName})* sedang dalam proses restock oleh supplier. Silakan coba kembali nanti atau hubungi admin.`;
          const resp = await sock.sendMessage(
            remoteJid,
            { text: outOfStockMsg, mentions: [senderJid] },
            { quoted: m }
          );
          markMessageAsBotSent(resp?.key?.id);
          continue;
        }
      } catch (chkErr: any) {
        deps.addLog('warning', `Gagal cek saldo Xaviera (diteruskan): ${chkErr?.message || chkErr}`);
      }

      // 2. Verifikasi Konfigurasi API LunasQRIS
      const lunasQrisApiKey = config.lunasQrisApiKey?.trim();
      if (!lunasQrisApiKey) {
        deps.addLog('error', `❌ API Key LunasQRIS belum diisi di tab Connection! Tidak dapat membuat invoice QRIS.`);
        const noApiMsg = `Maaf kak @${senderCleanNumber}, sistem pembayaran QRIS otomatis toko sedang dalam konfigurasi. Silakan hubungi admin toko untuk pemesanan manual.`;
        const resp = await sock.sendMessage(
          remoteJid,
          { text: noApiMsg, mentions: [senderJid] },
          { quoted: m }
        );
        markMessageAsBotSent(resp?.key?.id);
        continue;
      }

      // 3. Request Transaksi & QRIS Dinamis ke API LunasQRIS
      try {
        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        deps.addLog('info', `📡 Mengajukan transaksi LunasQRIS (${orderId}) untuk nominal Rp ${price.toLocaleString('id-ID')}...`);

        const trxResult = await createLunasQrisTransaction(
          lunasQrisApiKey,
          {
            amount: price,
            order_id: orderId,
            description: `Pembelian ${productName} (${variantName}) - ${storeTitle}`,
            customer_name: senderName || `Pelanggan-${senderCleanNumber}`,
            expired_minutes: 15,
          },
          config.lunasQrisBaseUrl
        );

        const trx = trxResult.data;
        deps.addLog(
          'success',
          `✅ Transaksi LunasQRIS berhasil dibuat: Trx ID ${trx.trx_id} | Order ID ${trx.order_id} | Total: Rp ${trx.total_amount.toLocaleString('id-ID')} (Fee Gateway: Rp ${trx.unique_code})`
        );

        // Catat transaksi baru ke database lokal dengan status 'pending'
        try {
          recordTransaction({
            orderId: trx.order_id || orderId,
            trxId: trx.trx_id,
            customerNumber: senderCleanNumber,
            customerName: senderName || `Pelanggan-${senderCleanNumber}`,
            productName,
            variantName,
            nominal: trx.amount || price,
            uniqueCode: trx.unique_code || 0,
            total: trx.total_amount,
            paymentUrl: trx.payment_url,
            status: 'pending',
          });
        } catch (dbErr: any) {
          deps.addLog('warning', `Gagal menyimpan database transaksi: ${dbErr?.message}`);
        }

        // 4. Di Grup: Kirim notifikasi singkat bahwa invoice telah dikirim ke DM pembeli
        if (isGroup) {
          const groupNotification = `Halo @${senderCleanNumber}, invoice pembayaran QRIS sebesar *Rp ${trx.total_amount.toLocaleString('id-ID')}* (Fee Gateway: *+Rp ${trx.unique_code}*) telah kami kirimkan ke *chat pribadi (DM)* Anda. 💬\n\nSilakan periksa pesan pribadi untuk melakukan pembayaran. Privasi & keamanan akun terjamin aman!`;
          try {
            const grpRes = await sock.sendMessage(
              remoteJid,
              { text: groupNotification, mentions: [senderJid] },
              { quoted: m }
            );
            markMessageAsBotSent(grpRes?.key?.id);
            deps.addLog('success', `💬 Notifikasi pengiriman invoice terkirim ke grup ${remoteJid}`);
          } catch (grpErr: any) {
            deps.addLog('error', `Gagal mengirim notifikasi grup: ${grpErr?.message || grpErr}`);
          }
        }

        // 5. Di Chat Pribadi (DM): Format invoice dinamis dari konfigurasi Tab Command (Invoice)
        const matchedCat = DEFAULT_CATALOG.find((cat) =>
          cat.items.some((item) => item.toLowerCase() === productName.toLowerCase())
        );
        const category = matchedCat?.kategori || 'Digital';

        const templateInvoice =
          config.invoiceOutputText && config.invoiceOutputText.trim()
            ? config.invoiceOutputText
            : DEFAULT_INVOICE_TEMPLATE;

        const invoiceCaption = resolvePlaceholders(templateInvoice, config, {
          name: productName,
          variant: variantName,
          category,
          price: trx.amount || price,
          total: trx.total_amount,
          unikCode: trx.unique_code,
          orderId: trx.order_id || orderId,
        });

        const templateFooter =
          config.invoiceFooterText && config.invoiceFooterText.trim()
            ? config.invoiceFooterText
            : '{storeName} Official • Pembayaran Otomatis';

        const invoiceFooter = resolvePlaceholders(templateFooter, config, {
          name: productName,
          variant: variantName,
          category,
          price: trx.amount || price,
          total: trx.total_amount,
          unikCode: trx.unique_code,
          orderId: trx.order_id || orderId,
        });

        // 2 Tombol Interaktif Native Flow:
        // 1. Quick Reply: Hubungi Admin (memicu vCard nomor admin atau fallback nomor owner)
        // 2. CTA URL: Langsung menuju web checkout pembayaran
        const invoiceButtons = [
          {
            text: '📞 Hubungi Admin',
            id: 'invoice_contact_admin',
          },
          {
            text: '🌐 Web Checkout',
            url: trx.payment_url || 'https://lunasqris.com',
          },
        ];

        let dmSent = false;
        let qrBuffer: Buffer | null = null;

        // Metode 1: Generate buffer gambar PNG murni langsung dari raw string EMVCo qris_string (bebas SVG & anti file corrupt)
        if (trx.qris_string) {
          try {
            qrBuffer = await QRCode.toBuffer(trx.qris_string, {
              type: 'png',
              width: 600,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
          } catch (qrErr: any) {
            deps.addLog('warning', `Generate QR code lokal gagal: ${qrErr?.message || qrErr}`);
          }
        }

        // Metode 2: Cadangan unduh file PNG dari generator QR jika library lokal gagal
        if (!qrBuffer && (trx.qris_string || trx.payment_url)) {
          try {
            const rawData = trx.qris_string || trx.payment_url;
            const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(rawData)}&size=600x600&format=png&margin=15`;
            const resp = await axios.get(fallbackUrl, { responseType: 'arraybuffer', timeout: 8000 });
            if (resp.data) {
              qrBuffer = Buffer.from(resp.data);
            }
          } catch (axErr: any) {
            deps.addLog('warning', `Unduh buffer PNG cadangan gagal: ${axErr?.message || axErr}`);
          }
        }

        // Kirim gambar kode QR (Buffer PNG resmi yang didukung 100% oleh WhatsApp) dengan native buttons & footer
        if (qrBuffer) {
          try {
            const imgRes = await sock.sendMessage(senderJid, {
              image: qrBuffer,
              mimetype: 'image/png',
              caption: invoiceCaption,
              footer: invoiceFooter,
              nativeFlow: invoiceButtons,
            });
            markMessageAsBotSent(imgRes?.key?.id);
            dmSent = true;
          } catch (imgErr: any) {
            deps.addLog('warning', `Kirim gambar buffer QRIS dengan tombol gagal: ${imgErr?.message || imgErr}. Mencoba tanpa tombol...`);
            try {
              const fallbackImg = await sock.sendMessage(senderJid, {
                image: qrBuffer,
                mimetype: 'image/png',
                caption: invoiceCaption,
              });
              markMessageAsBotSent(fallbackImg?.key?.id);
              dmSent = true;
            } catch (fbErr: any) {
              deps.addLog('warning', `Kirim gambar fallback gagal: ${fbErr?.message || fbErr}`);
            }
          }
        }

        // Fallback pesan teks jika media gambar gagal terkirim
        if (!dmSent) {
          try {
            const txtRes = await sock.sendMessage(senderJid, {
              text: `${invoiceCaption}\n\n🔗 *Tautan Pembayaran:* ${trx.payment_url}`,
              footer: invoiceFooter,
              nativeFlow: invoiceButtons,
            });
            markMessageAsBotSent(txtRes?.key?.id);
            dmSent = true;
          } catch (txtErr: any) {
            try {
              const rawTxtRes = await sock.sendMessage(senderJid, {
                text: `${invoiceCaption}\n\n🔗 *Tautan Pembayaran:* ${trx.payment_url}`,
              });
              markMessageAsBotSent(rawTxtRes?.key?.id);
              dmSent = true;
            } catch (err: any) {
              deps.addLog('error', `Gagal mengirim invoice ke DM ${senderJid}: ${err?.message || err}`);
            }
          }
        }

        if (dmSent) {
          deps.addLog('success', `📩 Invoice LunasQRIS (Gambar PNG) berhasil dikirimkan ke chat pribadi ${senderJid}`);
        }

        // 6. Jalankan Background Poller untuk verifikasi status lunas otomatis
        startLunasQrisPolling(
          {
            orderId: trx.order_id || orderId,
            trxId: trx.trx_id,
            senderJid,
            groupJid: isGroup ? remoteJid : undefined,
            senderName,
            productName,
            variantName,
            price,
            totalAmount: trx.total_amount,
            uniqueCode: trx.unique_code,
            apiKey: lunasQrisApiKey,
            baseUrl: config.lunasQrisBaseUrl || 'https://lunasqris.com',
            onPaid: async () => {
              // Update status transaksi di database lokal menjadi 'paid'
              try {
                updateTransactionStatus(trx.order_id || orderId, 'paid');
              } catch {}

              // Pembayaran LUNAS -> Kirim data produk sensitif ke DM
              const randomAccount = Math.random().toString(36).substring(2, 7);
              const randomPass = Math.random().toString(36).substring(2, 8);
              const emailCust = `cust.${randomAccount}@premium.net`;
              const passCust = `P@ss${randomPass}!`;

              const successMessage =
                `🎉 *PEMBAYARAN DITERIMA & LUNAS!*\n` +
                `*${storeTitle}*\n\n` +
                `Terima kasih Kak ${senderName}, pembayaran untuk order \`${trx.order_id}\` sebesar *Rp ${trx.total_amount.toLocaleString('id-ID')}* telah sukses diverifikasi otomatis oleh LunasQRIS!\n\n` +
                `📦 *Produk:* ${productName}\n` +
                `⚡ *Varian:* ${variantName}\n` +
                `📅 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n` +
                `🔐 *DETAIL KREDENSIAL AKUN (RAHASIA):*\n` +
                `• *Email / Username:* \`${emailCust}\`\n` +
                `• *Password:* \`${passCust}\`\n` +
                `• *Masa Aktif:* 30 Hari Garansi Penuh\n` +
                `• *Aturan Pakai:* Gunakan akun sesuai profil yang disediakan, jangan mengubah password utama.\n\n` +
                `_Terima kasih telah berbelanja di ${storeTitle}! Detail di atas hanya dikirimkan ke chat pribadi Anda demi keamanan._`;

              try {
                const sRes = await sock.sendMessage(senderJid, { text: successMessage });
                markMessageAsBotSent(sRes?.key?.id);
                deps.addLog('success', `🎁 Kredensial akun premium berhasil dikirimkan ke DM ${senderJid}`);
              } catch (sendErr: any) {
                deps.addLog('error', `Gagal mengirim detail akun ke DM: ${sendErr?.message || sendErr}`);
              }

              // Notifikasi ke Owner jika nomor owner terisi
              const ownerNum = config.storeInfo?.ownerNumber?.replace(/[^0-9]/g, '');
              if (ownerNum) {
                const ownerJid = `${ownerNum}@s.whatsapp.net`;
                const ownerNote =
                  `🔔 *NOTIFIKASI PESANAN LUNAS (LUNASQRIS)*\n\n` +
                  `• *Pembeli:* ${senderName} (${senderCleanNumber})\n` +
                  `• *Produk:* ${productName} (${variantName})\n` +
                  `• *Order ID:* ${trx.order_id}\n` +
                  `• *Nominal:* Rp ${trx.total_amount.toLocaleString('id-ID')}\n` +
                  `• *Status:* Lunas & Terkirim ke DM pembeli`;
                try {
                  const oRes = await sock.sendMessage(ownerJid, { text: ownerNote });
                  markMessageAsBotSent(oRes?.key?.id);
                } catch {}
              }
            },
            onExpired: async () => {
              // Update status transaksi di database lokal menjadi 'cancel'
              try {
                updateTransactionStatus(trx.order_id || orderId, 'cancel');
              } catch {}

              // Pembayaran Kedaluwarsa
              const expiredMsg =
                `⏰ *INVOICE KEDALUWARSA*\n` +
                `Tagihan \`${trx.order_id}\` untuk *${productName} (${variantName})* telah melewati batas waktu pembayaran.\n\n` +
                `Jika Anda masih ingin memesan, silakan ulangi pemesanan di grup atau hubungi admin.`;
              try {
                const eRes = await sock.sendMessage(senderJid, { text: expiredMsg });
                markMessageAsBotSent(eRes?.key?.id);
              } catch {}
            },
          },
          deps.addLog
        );
      } catch (invErr: any) {
        deps.addLog('error', `Gagal memproses invoice QRIS: ${invErr?.message || invErr}`);
        const errMsg = `Maaf kak @${senderCleanNumber}, gagal membuat invoice pembayaran: ${invErr?.message || 'Server sibuk'}. Silakan coba kembali atau hubungi admin.`;
        try {
          const eResp = await sock.sendMessage(
            remoteJid,
            { text: errMsg, mentions: [senderJid] },
            { quoted: m }
          );
          markMessageAsBotSent(eResp?.key?.id);
        } catch {}
      }

      continue;
    }

    // C. Tombol vCard Kontak (Pengiriman kartu kontak WhatsApp nomor)
    if (cleanBtn.startsWith('vcard_')) {
      const rawNum = cleanBtn.replace(/^vcard_/, '').trim();
      const matchedBtn = (config.menuButtons || []).find(
        (b) =>
          (b.type === 'vcard' || b.type === 'cta_call') &&
          ((b.callPhoneNumber && b.callPhoneNumber.replace(/[^0-9]/g, '') === rawNum) || b.id === rawNum)
      );
      const targetName = matchedBtn?.callTargetName || 'Admin Wanzt Store';
      const cleanNum = (matchedBtn?.callPhoneNumber || rawNum).replace(/[^0-9]/g, '') || '6283861276608';

      deps.addLog('info', `📇 Tombol vCard ditekan oleh ${senderName}. Mengirim kartu kontak ${targetName} (${cleanNum})...`);

      const vcard =
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${targetName}\n` +
        `ORG:Wanzt Store;\n` +
        `TEL;type=CELL;type=VOICE;waid=${cleanNum}:+${cleanNum}\n` +
        'END:VCARD';

      try {
        await sock.sendMessage(
          remoteJid,
          {
            contacts: {
              displayName: targetName,
              contacts: [{ vcard }],
            },
          },
          { quoted: m }
        );
        deps.addLog('success', `✅ Berhasil mengirimkan kartu kontak (vCard) ${targetName} (${cleanNum}) ke ${remoteJid}`);
      } catch (err: any) {
        deps.addLog('error', `Gagal mengirim kartu kontak vCard: ${err?.message || err}`);
      }
      continue;
    }

    // 2. TANGANI INTERAKSI DARI DROPDOWN SINGLE SELECT (PEMILIHAN PRODUK LIST)
    let selectedProductName = '';
    if (cleanBtn.startsWith('prod_select:')) {
      selectedProductName = cleanBtn.replace(/^prod_select:/, '').trim();
    } else if (cleanBtn.startsWith('product_select:')) {
      selectedProductName = cleanBtn.replace(/^product_select:/, '').trim();
    } else if (isListSelectResponse && cleanBtn) {
      selectedProductName = cleanBtn;
    } else if (isInteractiveButtonResponse && isKnownProduct(cleanBtn)) {
      selectedProductName = cleanBtn;
    }

    // Deteksi jika pesan pengguna berisi format balasan "Tampilkan varian *(Nama Produk)*"
    if (!selectedProductName && trimmedText) {
      const match = trimmedText.match(/tampilkan\s+varian\s+\*?([^*\n\r]+)\*?/i);
      if (match && match[1]) {
        selectedProductName = match[1].trim();
      } else {
        const firstLine = trimmedText.split('\n')[0].replace(/[*_~`]/g, '').trim();
        if (isKnownProduct(firstLine)) {
          selectedProductName = firstLine;
        }
      }
    }

    if (selectedProductName) {
      deps.addLog(
        'info',
        `📦 Pelanggan ${senderName} memilih produk "${selectedProductName}" dari dropdown Single Select. Menyiapkan carousel varian...`
      );
      try {
        await sendProductVariantsCarousel(
          sock,
          config,
          remoteJid,
          selectedProductName,
          m,
          deps.addLog,
          deps.resolveTargetJid
        );
      } catch (err: any) {
        deps.addLog('error', `Gagal memproses carousel varian: ${err?.message || err}`);
      }
      continue;
    }

    // 3. TANGANI INTERAKSI DARI TOMBOL QUICK REPLY / MENU BUTTONS
    if (isQuickReplyResponse && cleanBtn) {
      const cleanLower = cleanBtn.toLowerCase();
      // Cocokkan dengan tombol yang didaftarkan pada config.menuButtons
      const matchedButton = (config.menuButtons || []).find((b) => {
        const bOutput = (b.output || '').trim().toLowerCase();
        const bName = (b.name || '').trim().toLowerCase();
        const bId = (b.id || '').trim().toLowerCase();
        return (
          bOutput === cleanLower ||
          bName === cleanLower ||
          bId === cleanLower ||
          (bOutput && cleanLower.includes(bOutput)) ||
          (bName && cleanLower.includes(bName))
        );
      });

      if (matchedButton) {
        // A. Tombol bertipe vcard / cta_call: Kirim vCard Kontak
        if (matchedButton.type === 'vcard' || matchedButton.type === 'cta_call') {
          const rawTargetName = matchedButton.callTargetName || '{adminName}';
          const targetName = resolvePlaceholders(rawTargetName, config) || config.storeInfo?.adminName || 'Admin Store';
          const rawPhone = matchedButton.callPhoneNumber || matchedButton.output || '{adminNumber}';
          const resolvedPhone = resolvePlaceholders(rawPhone, config);
          const cleanNum = resolvedPhone.replace(/[^0-9]/g, '') || (config.storeInfo?.adminNumber || config.storeInfo?.ownerNumber || '6282173515807').replace(/[^0-9]/g, '');
          const orgName = resolvePlaceholders('{storeName}', config) || 'Wanzt Store';

          deps.addLog('info', `📇 Tombol "${matchedButton.name}" (vCard) ditekan oleh ${senderName}. Mengirim kartu kontak ${targetName} (${cleanNum})...`);
          const vcard =
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${targetName}\n` +
            `ORG:${orgName};\n` +
            `TEL;type=CELL;type=VOICE;waid=${cleanNum}:+${cleanNum}\n` +
            'END:VCARD';

          try {
            await sock.sendMessage(
              remoteJid,
              {
                contacts: {
                  displayName: targetName,
                  contacts: [{ vcard }],
                },
              },
              { quoted: m }
            );
            deps.addLog('success', `✅ Berhasil mengirimkan kontak vCard ke ${remoteJid}`);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim vCard: ${err?.message || err}`);
          }
          continue;
        }

        // B. Aksi Pemicu: LIST
        if (matchedButton.triggerAction === 'list') {
          deps.addLog('info', `🔘 Tombol Quick Reply "${matchedButton.name}" (Action: List) ditekan oleh ${senderName}. Memicu Command List!`);
          try {
            await sendListInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon LIST: ${err?.message || err}`);
          }
          continue; // SELESAI, jangan lanjut ke deteksi produk / carousel!
        }

        // C. Aksi Pemicu: MENU
        if (matchedButton.triggerAction === 'menu') {
          deps.addLog('info', `🔘 Tombol Quick Reply "${matchedButton.name}" (Action: Menu) ditekan oleh ${senderName}. Memicu Command Menu!`);
          try {
            await sendMenuInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon MENU: ${err?.message || err}`);
          }
          continue; // SELESAI
        }

        // D. Aksi Pemicu: OWNER
        if (matchedButton.triggerAction === 'owner') {
          deps.addLog('info', `👑 Tombol Quick Reply "${matchedButton.name}" (Action: Owner) ditekan oleh ${senderName}. Mengirim Kontak Owner!`);
          try {
            await sendOwnerContactMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon OWNER: ${err?.message || err}`);
          }
          continue; // SELESAI
        }

        // E. Aksi Pemicu: ADMIN
        if (matchedButton.triggerAction === 'admin') {
          deps.addLog('info', `📞 Tombol Quick Reply "${matchedButton.name}" (Action: Admin) ditekan oleh ${senderName}. Mengirim Kontak Admin!`);
          try {
            await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
          } catch (err: any) {
            deps.addLog('error', `Gagal mengirim respon ADMIN: ${err?.message || err}`);
          }
          continue; // SELESAI
        }

        // F. Aksi Pemicu: UNKNOWN / TANPA AKSI
        // Pengguna menginginkan: tombol tanpa aksi pemicu bot TIDAK AKAN merespon
        if (matchedButton.triggerAction === 'unknown' || !matchedButton.triggerAction) {
          deps.addLog('info', `🔘 Tombol Quick Reply "${matchedButton.name}" (Tanpa Aksi Pemicu) ditekan oleh ${senderName}. Bot tidak merespon sesuai aturan.`);
          continue; // SELESAI, tidak merespon sama sekali dan jangan kirim carousel!
        }
      }

      // Jika tombol Quick Reply tidak terdaftar di menuButtons, cek apakah ada teks perintah jelas
      const firstChar = cleanBtn.charAt(0);
      const cleanCmd = ALLOWED_PREFIXES.includes(firstChar)
        ? cleanBtn.substring(1).trim().toLowerCase()
        : cleanBtn.toLowerCase();

      if (cleanCmd === 'list') {
        deps.addLog('info', `🔘 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Memicu Command List!`);
        await sendListInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }
      if (cleanCmd === 'menu') {
        deps.addLog('info', `🔘 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Memicu Command Menu!`);
        await sendMenuInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }
      if (cleanCmd === 'owner') {
        deps.addLog('info', `👑 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Mengirim Kontak Owner!`);
        await sendOwnerContactMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }
      if (['contact', 'admin', 'kontak'].includes(cleanCmd)) {
        deps.addLog('info', `📞 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Mengirim Kontak Admin!`);
        await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
        continue;
      }

      // Jika tidak ada perintah valid pada tombol quick reply, jangan pernah mengirim carousel
      deps.addLog('info', `🔘 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName} tanpa aksi pemicu. Bot tidak merespon.`);
      continue;
    }

    // 4. TANGANI PESAN TEKS MANUAL (WAJIB PREFIX: / . ! ? # $ % &)
    if (!trimmedText) continue;

    const firstChar = trimmedText.charAt(0);
    if (!ALLOWED_PREFIXES.includes(firstChar)) {
      // Abaikan teks manual tanpa prefix untuk menghindari spam di obrolan grup
      continue;
    }

    const usedPrefix = firstChar;
    const textWithoutPrefix = trimmedText.substring(1).trim();
    if (!textWithoutPrefix) continue;

    const parts = textWithoutPrefix.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const commandArg = parts.slice(1).join(' ').trim();

    // A. Command 'menu'
    if (commandName === 'menu') {
      deps.addLog('info', `📩 Menerima command ${usedPrefix}menu dari ${senderName}`);
      try {
        await sendMenuInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
      } catch (sendErr: any) {
        deps.addLog('error', `Gagal mengirim respon MENU: ${sendErr?.message || sendErr}`);
      }
      continue;
    }

    // B. Command 'list'
    if (commandName === 'list') {
      deps.addLog('info', `📋 Menerima command ${usedPrefix}list dari ${senderName}`);
      try {
        await sendListInteractiveMessage(sock, config, remoteJid, m, deps.addLog);
      } catch (sendErr: any) {
        deps.addLog('error', `Gagal mengirim respon LIST: ${sendErr?.message || sendErr}`);
      }
      continue;
    }

    // C. Command 'owner'
    if (commandName === 'owner') {
      deps.addLog('info', `👑 Menerima command ${usedPrefix}owner dari ${senderName}`);
      await sendOwnerContactMessage(sock, config, remoteJid, m, deps.addLog);
      continue;
    }

    // D. Command 'admin' / 'contact'
    if (['admin', 'contact', 'kontak'].includes(commandName)) {
      deps.addLog('info', `📞 Menerima command ${usedPrefix}${commandName} dari ${senderName}`);
      await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
      continue;
    }

    // D. Command 'order' (Mode Uji Coba: Respon Grup & Private Chat)
    if (commandName.startsWith('order')) {
      const variantChoice = commandArg || 'Produk Pilihan';
      deps.addLog('info', `🛒 Pelanggan ${senderName} mengetik command ORDER: "${variantChoice}" (Chat: ${remoteJid})`);

      let senderJid = m.key?.participant || remoteJid;
      if (senderJid.includes(':')) {
        senderJid = senderJid.replace(/:[0-9]+@/, '@');
      }
      senderJid = deps.resolveTargetJid(senderJid);

      if (isGroup) {
        try {
          const groupRes = await sock.sendMessage(
            remoteJid,
            { text: 'testing respon in grup' },
            { quoted: m }
          );
          markMessageAsBotSent(groupRes?.key?.id);
          deps.addLog('success', `💬 [Uji Coba] Pesan "testing respon in grup" terkirim ke grup ${remoteJid}`);
        } catch (grpErr: any) {
          deps.addLog('error', `Gagal mengirim respon grup: ${grpErr?.message || grpErr}`);
        }

        try {
          const privRes = await sock.sendMessage(
            senderJid,
            { text: 'testing respon in private chat' }
          );
          markMessageAsBotSent(privRes?.key?.id);
          deps.addLog('success', `📩 [Uji Coba] Pesan "testing respon in private chat" terkirim ke ${senderJid}`);
        } catch (privErr: any) {
          deps.addLog('error', `Gagal mengirim pesan ke private chat ${senderJid}: ${privErr?.message || privErr}`);
        }
      } else {
        try {
          const privRes = await sock.sendMessage(
            remoteJid,
            { text: 'testing respon in private chat' },
            { quoted: m }
          );
          markMessageAsBotSent(privRes?.key?.id);
          deps.addLog('success', `📩 [Uji Coba] Respon di private chat berhasil terkirim.`);
        } catch (privErr: any) {
          deps.addLog('error', `Gagal mengirim respon private: ${privErr?.message || privErr}`);
        }
      }
      continue;
    }

    // E. Command Nama Produk Langsung (contoh: .netflix, .youtube, .ml, .canva, .spotify, dll.)
    const reservedWords = ['menu', 'list', 'admin', 'contact', 'kontak', 'owner', 'order', 'help', 'info', 'ping', 'start', 'stop'];
    if (!reservedWords.includes(commandName)) {
      deps.addLog('info', `📦 Memproses varian produk "${textWithoutPrefix}" dari ${senderName} [Prefix: "${usedPrefix}${commandName}"]`);
      try {
        await sendProductVariantsCarousel(
          sock,
          config,
          remoteJid,
          textWithoutPrefix,
          m,
          deps.addLog,
          deps.resolveTargetJid
        );
      } catch (err: any) {
        deps.addLog('error', `Gagal memproses carousel varian: ${err?.message || err}`);
      }
      continue;
    }
  }
}

