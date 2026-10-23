import fs from 'fs';
import path from 'path';
import { ALLOWED_PREFIXES, CommandsConfig, SESSION_DIR } from '../types/bot.types.js';
import { sendMenuInteractiveMessage } from '../messages/menuMessage.js';
import { sendListInteractiveMessage } from '../messages/listMessage.js';
import { sendProductVariantsCarousel } from '../messages/carouselMessage.js';
import { sendAdminContactMessage } from '../messages/adminContactMessage.js';
import { isKnownProduct } from '../services/xavieraService.js';
import { resolvePlaceholders } from '../services/placeholderHelper.js';
import { loadGroupsConfig } from '../services/groupService.js';

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
    // A. Tombol Contact Admin
    if (
      cleanBtn === 'contact_admin' ||
      (isInteractiveButtonResponse && cleanBtn.toLowerCase().includes('contact_admin'))
    ) {
      deps.addLog('info', `📞 Tombol "Contact Admin" ditekan oleh ${senderName}`);
      await sendAdminContactMessage(sock, remoteJid, m, deps.addLog);
      continue;
    }

    // B. Tombol Order Varian
    if (cleanBtn.startsWith('order_')) {
      const variantChoice = cleanBtn.replace(/^order_/, '').trim() || 'Produk Pilihan';
      deps.addLog('info', `🛒 Pelanggan ${senderName} menekan tombol ORDER untuk varian: "${variantChoice}"`);
      await sock.sendMessage(
        remoteJid,
        {
          text: `Halo kak *${senderName}*! 👋\n\nPilihan pesanan kamu untuk *${variantChoice}* telah kami terima.\n\nSilakan konfirmasi ke Admin Wanzt Store melalui kontak resmi berikut untuk pembayaran dan pengiriman akun:`,
        },
        { quoted: m }
      );
      await sendAdminContactMessage(sock, remoteJid, m, deps.addLog);
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

        // D. Aksi Pemicu: UNKNOWN / TANPA AKSI
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
      if (['contact', 'admin', 'kontak', 'owner'].includes(cleanCmd)) {
        deps.addLog('info', `🔘 Tombol Quick Reply "${cleanBtn}" ditekan oleh ${senderName}. Mengirim Kontak Admin!`);
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

    // C. Command 'admin' / 'contact'
    if (['admin', 'contact', 'kontak', 'owner'].includes(commandName)) {
      deps.addLog('info', `📞 Menerima command ${usedPrefix}${commandName} dari ${senderName}`);
      await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
      continue;
    }

    // D. Command 'order'
    if (commandName.startsWith('order')) {
      const variantChoice = commandArg || 'Produk Pilihan';
      const storeTitle = resolvePlaceholders('{storeName}', config) || 'Wanzt Store';
      deps.addLog('info', `🛒 Pelanggan ${senderName} mengetik command ORDER: "${variantChoice}"`);
      await sock.sendMessage(
        remoteJid,
        {
          text: `Halo kak *${senderName}*! 👋\n\nPilihan pesanan kamu untuk *${variantChoice}* telah kami terima.\n\nSilakan konfirmasi ke Admin ${storeTitle} melalui kontak di bawah ini:`,
        },
        { quoted: m }
      );
      await sendAdminContactMessage(sock, config, remoteJid, m, deps.addLog);
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

