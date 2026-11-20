import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPORT_TITLE_MAX_LENGTH,
  REPORT_IMAGE_MAX_BYTES,
  REPORT_VIDEO_MAX_BYTES,
  validateReportSubmission,
  serializeReportForTenant,
  resolveAdminReportUpdate,
} from './reportValidation.ts';

test('validateReportSubmission enforces title <= 30 chars, non-empty unlimited message, and valid media rules', () => {
  // Title empty
  assert.equal(
    validateReportSubmission({ title: '   ', message: 'Ada kendala' }).valid,
    false
  );

  // Title 31 chars rejected
  assert.equal(
    validateReportSubmission({ title: 'a'.repeat(REPORT_TITLE_MAX_LENGTH + 1), message: 'Ada kendala' }).valid,
    false
  );

  // Title exact 30 chars & long unlimited message accepted
  const longMessage = 'Detail kendala panjang '.repeat(250);
  const okTextOnly = validateReportSubmission({
    title: 'a'.repeat(REPORT_TITLE_MAX_LENGTH),
    message: longMessage,
  });
  assert.equal(okTextOnly.valid, true);
  assert.equal(okTextOnly.data?.message.length, longMessage.trim().length);

  // 2 images + 1 video (3 media total) accepted
  const okMixed = validateReportSubmission({
    title: 'Bot QRIS Error',
    message: 'Invoice tidak terkirim setelah pembayaran.',
    mediaItems: [
      { mediaType: 'image', mimeType: 'image/png', sizeBytes: REPORT_IMAGE_MAX_BYTES },
      { mediaType: 'image', mimeType: 'image/jpeg', sizeBytes: 1024 * 500 },
      { mediaType: 'video', mimeType: 'video/mp4', sizeBytes: REPORT_VIDEO_MAX_BYTES },
    ],
  });
  assert.equal(okMixed.valid, true);

  // 2 videos rejected (max 1 video per report)
  const twoVideos = validateReportSubmission({
    title: 'Dua Video',
    message: 'Coba kirim dua video',
    mediaItems: [
      { mediaType: 'video', mimeType: 'video/mp4', sizeBytes: 1024 * 1024 },
      { mediaType: 'video', mimeType: 'video/webm', sizeBytes: 1024 * 1024 },
    ],
  });
  assert.equal(twoVideos.valid, false);
  assert.match(twoVideos.error || '', /1 video/i);

  // 4 images rejected (max 3 media)
  const fourImages = validateReportSubmission({
    title: 'Empat Foto',
    message: 'Terlalu banyak lampiran',
    mediaItems: [
      { mediaType: 'image', mimeType: 'image/png', sizeBytes: 1000 },
      { mediaType: 'image', mimeType: 'image/png', sizeBytes: 1000 },
      { mediaType: 'image', mimeType: 'image/png', sizeBytes: 1000 },
      { mediaType: 'image', mimeType: 'image/png', sizeBytes: 1000 },
    ],
  });
  assert.equal(fourImages.valid, false);
  assert.match(fourImages.error || '', /3 media/i);

  // Oversized image (> 5 MB) & oversized video (> 25 MB) rejected
  assert.equal(
    validateReportSubmission({
      title: 'Foto Besar',
      message: 'Melebihi 5MB',
      mediaItems: [{ mediaType: 'image', mimeType: 'image/png', sizeBytes: REPORT_IMAGE_MAX_BYTES + 1 }],
    }).valid,
    false
  );
  assert.equal(
    validateReportSubmission({
      title: 'Video Besar',
      message: 'Melebihi 25MB',
      mediaItems: [{ mediaType: 'video', mimeType: 'video/mp4', sizeBytes: REPORT_VIDEO_MAX_BYTES + 1 }],
    }).valid,
    false
  );
});

test('serializeReportForTenant only exposes adminReply when status is selesai, reply_enabled is 1, and reply is non-empty', () => {
  const baseRow = {
    id: 1,
    tenant_id: 't_wanzt',
    owner_name: 'Dzakwan',
    owner_phone: '+6282173515807',
    store_name: 'Wanzt Store',
    title: 'Webhook Macet',
    message: 'Pembayaran lunas tidak update',
    reply_enabled: 1,
    admin_reply: 'Sudah kami periksa dan perbaiki.',
    created_at: '2026-11-19T01:00:00.000Z',
    updated_at: '2026-11-19T01:10:00.000Z',
  };

  assert.equal(
    serializeReportForTenant({ ...baseRow, status: 'terkirim' }, []).adminReply,
    null
  );
  assert.equal(
    serializeReportForTenant({ ...baseRow, status: 'proses' }, []).adminReply,
    null
  );
  assert.equal(
    serializeReportForTenant({ ...baseRow, status: 'selesai', reply_enabled: 0 }, []).adminReply,
    null
  );
  assert.equal(
    serializeReportForTenant({ ...baseRow, status: 'selesai', admin_reply: '   ' }, []).adminReply,
    null
  );
  assert.equal(
    serializeReportForTenant({ ...baseRow, status: 'selesai', reply_enabled: 1 }, []).adminReply,
    'Sudah kami periksa dan perbaiki.'
  );
});

test('resolveAdminReportUpdate supports proses draft, selesai without reply (toggle OFF), and selesai with editable reply (toggle ON)', () => {
  // Proses with draft reply saves draft without exposing to tenant
  const proses = resolveAdminReportUpdate({
    nextStatus: 'proses',
    replyEnabled: true,
    adminReply: 'Sedang dicek oleh tim.',
  });
  assert.equal(proses.valid, true);
  assert.equal(proses.data?.status, 'proses');
  assert.equal(proses.data?.adminReply, 'Sedang dicek oleh tim.');

  // Selesai with toggle ON & empty text must reject
  const emptyReplySelesai = resolveAdminReportUpdate({
    nextStatus: 'selesai',
    replyEnabled: true,
    adminReply: '   ',
  });
  assert.equal(emptyReplySelesai.valid, false);

  // Selesai with toggle OFF succeeds and clears reply
  const offSelesai = resolveAdminReportUpdate({
    nextStatus: 'selesai',
    replyEnabled: false,
    adminReply: 'Abaikan pesan draft',
  });
  assert.equal(offSelesai.valid, true);
  assert.equal(offSelesai.data?.replyEnabled, false);
  assert.equal(offSelesai.data?.adminReply, '');

  // Editing an already-selesai report with toggle ON & new reply succeeds
  const editSelesai = resolveAdminReportUpdate({
    nextStatus: 'selesai',
    replyEnabled: true,
    adminReply: 'Update: sistem sudah normal kembali.',
    existingReplyEnabled: false,
    existingAdminReply: '',
  });
  assert.equal(editSelesai.valid, true);
  assert.equal(editSelesai.data?.replyEnabled, true);
  assert.equal(editSelesai.data?.adminReply, 'Update: sistem sudah normal kembali.');
});
