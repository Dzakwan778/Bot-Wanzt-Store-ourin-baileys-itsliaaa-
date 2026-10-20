/**
 * Helper untuk menyusun contextInfo quoting / reply kepada si pemicu.
 * Digunakan agar di grup maupun private chat, respons bot otomatis mereply pesan pemicu.
 */
export function buildQuoteContextInfo(
  quotedMsg: any,
  targetJid: string,
  userJid: string
): any {
  if (!quotedMsg) return undefined;

  const participant = quotedMsg.key?.fromMe
    ? userJid
    : quotedMsg.participant || quotedMsg.key?.participant || quotedMsg.key?.remoteJid;
  const participantNormalized = participant ? participant.replace(/:\d+/, '') : '';

  // Sanitasi quotedMessage agar kompatibel dan dapat dirender 100% oleh semua perangkat WhatsApp
  let sanitizedQuotedMessage = quotedMsg.message;
  if (sanitizedQuotedMessage) {
    // 1. Ekstrak teks jika berasal dari interactiveResponseMessage (single select / native flow)
    if (sanitizedQuotedMessage.interactiveResponseMessage) {
      const nativeFlow = sanitizedQuotedMessage.interactiveResponseMessage?.nativeFlowResponseMessage;
      let text = sanitizedQuotedMessage.interactiveResponseMessage?.body?.text || '';
      if (!text && nativeFlow?.paramsJson) {
        try {
          const parsed = JSON.parse(nativeFlow.paramsJson);
          text = parsed.title || parsed.display_text || parsed.id || '';
        } catch {}
      }
      sanitizedQuotedMessage = {
        conversation: text || 'Pilihan Produk',
      };
    }
    // 2. Ekstrak teks jika berasal dari buttonsResponseMessage
    else if (sanitizedQuotedMessage.buttonsResponseMessage) {
      const text =
        sanitizedQuotedMessage.buttonsResponseMessage.selectedDisplayText ||
        sanitizedQuotedMessage.buttonsResponseMessage.selectedButtonId ||
        '';
      sanitizedQuotedMessage = {
        conversation: text,
      };
    }
    // 3. Ekstrak teks jika berasal dari templateButtonReplyMessage
    else if (sanitizedQuotedMessage.templateButtonReplyMessage) {
      const text =
        sanitizedQuotedMessage.templateButtonReplyMessage.selectedDisplayText ||
        sanitizedQuotedMessage.templateButtonReplyMessage.selectedId ||
        '';
      sanitizedQuotedMessage = {
        conversation: text,
      };
    }
    // 4. Buka pembungkus jika berupa viewOnceMessage
    else if (sanitizedQuotedMessage.viewOnceMessage?.message) {
      const inner = sanitizedQuotedMessage.viewOnceMessage.message;
      if (inner.interactiveMessage?.body?.text) {
        sanitizedQuotedMessage = {
          conversation: inner.interactiveMessage.body.text,
        };
      } else {
        sanitizedQuotedMessage = inner;
      }
    }
  }

  return {
    stanzaId: quotedMsg.key?.id,
    participant: participantNormalized,
    quotedMessage: sanitizedQuotedMessage,
    ...(quotedMsg.key?.remoteJid !== targetJid ? { remoteJid: quotedMsg.key?.remoteJid } : {}),
    mentionedJid:
      participantNormalized && participantNormalized.includes('@s.whatsapp.net')
        ? [participantNormalized]
        : [],
  };
}
