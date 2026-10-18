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

  return {
    stanzaId: quotedMsg.key?.id,
    participant: participantNormalized,
    quotedMessage: quotedMsg.message,
    ...(quotedMsg.key?.remoteJid !== targetJid ? { remoteJid: quotedMsg.key?.remoteJid } : {}),
    mentionedJid:
      participantNormalized && participantNormalized.includes('@s.whatsapp.net')
        ? [participantNormalized]
        : [],
  };
}
