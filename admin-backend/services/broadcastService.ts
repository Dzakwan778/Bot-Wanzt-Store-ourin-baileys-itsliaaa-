import { getMasterDb } from '../database/masterSqlite.ts';
import { TenantService } from './tenantService.ts';
import { getBotManager } from '../../backend/botManager.ts';
import {
  getTelegramConfig,
  sendAdminBroadcastToTelegram,
} from '../../backend/services/telegramService.ts';
import {
  BroadcastCampaign,
  BroadcastChannel,
  BroadcastLogEntry,
  BroadcastScheduleType,
  CreateBroadcastInput,
  TenantRecord,
} from '../types/admin.types.ts';
import {
  computeNextRecurringRunUtc,
  deriveCampaignTitle,
  evaluateCampaignRunStatus,
  parseWibDateTimeToUtcIso,
  resolveBroadcastPlaceholders,
} from './broadcastUtils.ts';

let broadcastSchedulerInterval: NodeJS.Timeout | null = null;
let broadcastStartupTimer: NodeJS.Timeout | null = null;
let isProcessingDueBroadcasts = false;
const executingCampaignIds = new Set<number>();

interface DeliveryResultItem {
  tenant_id: string;
  store_name: string;
  owner_name: string;
  channel: 'whatsapp' | 'telegram';
  target: string;
  status: 'success' | 'failed';
  error_message: string | null;
  rendered_message: string;
  sent_at: string;
}

export class BroadcastService {
  static getReadinessSummary(): {
    activeTenantsCount: number;
    waReadyCount: number;
    tgReadyCount: number;
    sampleTenant: {
      tenant_id: string;
      store_name: string;
      owner_name: string;
      owner_phone: string;
      expires_at: string;
    } | null;
  } {
    const activeTenants = TenantService.getAllTenants().filter((t) => t.status === 'active');

    let waReadyCount = 0;
    let tgReadyCount = 0;

    for (const t of activeTenants) {
      const bot = getBotManager(t.tenant_id);
      if (bot.status === 'connected' && bot.sock && t.owner_phone && t.owner_phone.trim()) {
        waReadyCount += 1;
      }

      const tg = getTelegramConfig(t.tenant_id);
      // Opsi B: Siap kirim selama terkonfigurasi dan tidak di-suspend Admin
      if (tg.isConfigured && !tg.adminDisabled) {
        tgReadyCount += 1;
      }
    }

    const sample = activeTenants[0]
      ? {
          tenant_id: activeTenants[0].tenant_id,
          store_name: activeTenants[0].store_name,
          owner_name: activeTenants[0].owner_name,
          owner_phone: activeTenants[0].owner_phone,
          expires_at: activeTenants[0].expires_at,
        }
      : null;

    return {
      activeTenantsCount: activeTenants.length,
      waReadyCount,
      tgReadyCount,
      sampleTenant: sample,
    };
  }

  static getAllCampaigns(): BroadcastCampaign[] {
    const db = getMasterDb();
    return db
      .prepare(
        `SELECT * FROM broadcast_campaigns
         ORDER BY
           CASE
             WHEN status = 'processing' THEN 0
             WHEN status IN ('scheduled', 'active_recurring') THEN 1
             ELSE 2
           END,
           id DESC`
      )
      .all() as BroadcastCampaign[];
  }

  static getCampaignById(id: number): BroadcastCampaign | null {
    const db = getMasterDb();
    const row = db
      .prepare('SELECT * FROM broadcast_campaigns WHERE id = ?')
      .get(id) as BroadcastCampaign | undefined;
    return row || null;
  }

  static getCampaignLogs(
    campaignId: number,
    runNumber?: number
  ): { campaign: BroadcastCampaign; logs: BroadcastLogEntry[]; availableRuns: number[] } {
    const campaign = this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Kampanye broadcast tidak ditemukan');
    }

    const db = getMasterDb();
    const runsRows = db
      .prepare(
        'SELECT DISTINCT run_number FROM broadcast_logs WHERE campaign_id = ? ORDER BY run_number DESC'
      )
      .all(campaignId) as { run_number: number }[];
    const availableRuns = runsRows.map((r) => r.run_number);

    let logs: BroadcastLogEntry[];
    if (runNumber && runNumber > 0) {
      logs = db
        .prepare(
          `SELECT * FROM broadcast_logs
           WHERE campaign_id = ? AND run_number = ?
           ORDER BY status DESC, store_name ASC, channel ASC`
        )
        .all(campaignId, runNumber) as BroadcastLogEntry[];
    } else {
      logs = db
        .prepare(
          `SELECT * FROM broadcast_logs
           WHERE campaign_id = ?
           ORDER BY run_number DESC, status DESC, store_name ASC, channel ASC`
        )
        .all(campaignId) as BroadcastLogEntry[];
    }

    return { campaign, logs, availableRuns };
  }

  private static validateScheduleInput(input: CreateBroadcastInput): {
    scheduleType: BroadcastScheduleType;
    scheduledAtIso: string | null;
    recurrenceTime: string | null;
    recurrenceDayOfWeek: number | null;
    recurrenceDayOfMonth: number | null;
    nextRunAtIso: string | null;
    initialStatus: BroadcastCampaign['status'];
  } {
    const scheduleType = input.schedule_type || 'immediate';
    const nowMs = Date.now();

    if (scheduleType === 'immediate') {
      return {
        scheduleType,
        scheduledAtIso: null,
        recurrenceTime: null,
        recurrenceDayOfWeek: null,
        recurrenceDayOfMonth: null,
        nextRunAtIso: null,
        initialStatus: 'processing',
      };
    }

    if (scheduleType === 'once') {
      if (!input.scheduled_at_wib) {
        throw new Error('Tanggal dan jam jadwal pengiriman wajib diisi.');
      }
      const utcIso = parseWibDateTimeToUtcIso(input.scheduled_at_wib);
      if (!utcIso) {
        throw new Error('Format tanggal & jam jadwal tidak valid.');
      }
      if (new Date(utcIso).getTime() <= nowMs + 5000) {
        throw new Error('Waktu jadwal harus berada di masa depan minimal 1 menit dari sekarang.');
      }
      return {
        scheduleType,
        scheduledAtIso: utcIso,
        recurrenceTime: null,
        recurrenceDayOfWeek: null,
        recurrenceDayOfMonth: null,
        nextRunAtIso: utcIso,
        initialStatus: 'scheduled',
      };
    }

    // Berulang: daily / weekly / monthly
    const recTime = String(input.recurrence_time || '').trim();
    if (!/^\d{1,2}:\d{2}$/.test(recTime)) {
      throw new Error('Jam pelaksanaan berulang (HH:mm WIB) wajib diisi dengan benar.');
    }

    const [hh, mm] = recTime.split(':').map(Number);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      throw new Error('Format jam berulang tidak valid (00:00 sampai 23:59).');
    }
    const normalizedTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    let dow: number | null = null;
    let dom: number | null = null;

    if (scheduleType === 'weekly') {
      const val = Number(input.recurrence_day_of_week);
      if (!Number.isInteger(val) || val < 0 || val > 6) {
        throw new Error('Hari dalam minggu wajib dipilih untuk jadwal mingguan.');
      }
      dow = val;
    }

    if (scheduleType === 'monthly') {
      const val = Number(input.recurrence_day_of_month);
      if (!Number.isInteger(val) || val < 1 || val > 31) {
        throw new Error('Tanggal bulanan (1 - 31) wajib dipilih untuk jadwal bulanan.');
      }
      dom = val;
    }

    const nextRun = computeNextRecurringRunUtc(
      {
        schedule_type: scheduleType,
        recurrence_time: normalizedTime,
        recurrence_day_of_week: dow,
        recurrence_day_of_month: dom,
      },
      nowMs
    );

    if (!nextRun) {
      throw new Error('Gagal menghitung jadwal berikutnya untuk siaran berulang.');
    }

    return {
      scheduleType,
      scheduledAtIso: null,
      recurrenceTime: normalizedTime,
      recurrenceDayOfWeek: dow,
      recurrenceDayOfMonth: dom,
      nextRunAtIso: nextRun,
      initialStatus: 'active_recurring',
    };
  }

  static async createBroadcast(input: CreateBroadcastInput): Promise<{
    campaign: BroadcastCampaign;
    executedImmediately: boolean;
  }> {
    const cleanMessage = String(input.message || '').trim();
    if (!cleanMessage) {
      throw new Error('Isi pesan broadcast tidak boleh kosong.');
    }

    const validChannels: BroadcastChannel[] = ['both', 'whatsapp', 'telegram'];
    const channel: BroadcastChannel = validChannels.includes(input.channel)
      ? input.channel
      : 'both';

    const scheduleMeta = this.validateScheduleInput({
      ...input,
      message: cleanMessage,
      channel,
    });

    const title = deriveCampaignTitle(input.title, cleanMessage);
    const nowIso = new Date().toISOString();
    const db = getMasterDb();

    const insertRes = db
      .prepare(
        `INSERT INTO broadcast_campaigns (
          title, message, channel, schedule_type, scheduled_at,
          recurrence_time, recurrence_day_of_week, recurrence_day_of_month,
          next_run_at, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title,
        cleanMessage,
        channel,
        scheduleMeta.scheduleType,
        scheduleMeta.scheduledAtIso,
        scheduleMeta.recurrenceTime,
        scheduleMeta.recurrenceDayOfWeek,
        scheduleMeta.recurrenceDayOfMonth,
        scheduleMeta.nextRunAtIso,
        scheduleMeta.initialStatus,
        nowIso,
        nowIso
      );

    const campaignId = Number(insertRes.lastInsertRowid);

    if (scheduleMeta.scheduleType === 'immediate') {
      const executed = await this.executeCampaign(campaignId);
      return { campaign: executed, executedImmediately: true };
    }

    const created = this.getCampaignById(campaignId)!;
    return { campaign: created, executedImmediately: false };
  }

  static updateBroadcast(id: number, input: CreateBroadcastInput): BroadcastCampaign {
    const existing = this.getCampaignById(id);
    if (!existing) {
      throw new Error('Kampanye broadcast tidak ditemukan.');
    }
    if (existing.status === 'processing') {
      throw new Error('Kampanye sedang dalam proses pengiriman, tunggu hingga selesai.');
    }
    if (existing.schedule_type === 'immediate' && existing.run_count > 0) {
      throw new Error('Kampanye kirim langsung yang sudah selesai tidak dapat diedit.');
    }

    const cleanMessage = String(input.message || '').trim();
    if (!cleanMessage) {
      throw new Error('Isi pesan broadcast tidak boleh kosong.');
    }

    const validChannels: BroadcastChannel[] = ['both', 'whatsapp', 'telegram'];
    const channel: BroadcastChannel = validChannels.includes(input.channel)
      ? input.channel
      : 'both';

    if (input.schedule_type === 'immediate') {
      throw new Error('Gunakan tombol "Kirim Sekarang" untuk mengeksekusi jadwal secara langsung.');
    }

    const scheduleMeta = this.validateScheduleInput({
      ...input,
      message: cleanMessage,
      channel,
    });

    const title = deriveCampaignTitle(input.title, cleanMessage);
    const nowIso = new Date().toISOString();
    const db = getMasterDb();

    db.prepare(
      `UPDATE broadcast_campaigns
       SET title = ?, message = ?, channel = ?, schedule_type = ?,
           scheduled_at = ?, recurrence_time = ?, recurrence_day_of_week = ?,
           recurrence_day_of_month = ?, next_run_at = ?, status = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      title,
      cleanMessage,
      channel,
      scheduleMeta.scheduleType,
      scheduleMeta.scheduledAtIso,
      scheduleMeta.recurrenceTime,
      scheduleMeta.recurrenceDayOfWeek,
      scheduleMeta.recurrenceDayOfMonth,
      scheduleMeta.nextRunAtIso,
      scheduleMeta.initialStatus,
      nowIso,
      id
    );

    return this.getCampaignById(id)!;
  }

  static cancelCampaign(id: number): BroadcastCampaign {
    const existing = this.getCampaignById(id);
    if (!existing) {
      throw new Error('Kampanye broadcast tidak ditemukan.');
    }
    if (existing.status === 'processing') {
      throw new Error('Kampanye sedang berjalan dan tidak dapat dibatalkan.');
    }

    const db = getMasterDb();
    db.prepare(
      `UPDATE broadcast_campaigns
       SET status = 'cancelled', next_run_at = NULL, updated_at = ?
       WHERE id = ?`
    ).run(new Date().toISOString(), id);

    return this.getCampaignById(id)!;
  }

  static deleteCampaign(id: number): void {
    const existing = this.getCampaignById(id);
    if (!existing) {
      throw new Error('Kampanye broadcast tidak ditemukan.');
    }
    if (existing.status === 'processing') {
      throw new Error('Tidak dapat menghapus kampanye yang sedang mengirim pesan.');
    }

    const db = getMasterDb();
    db.prepare('DELETE FROM broadcast_logs WHERE campaign_id = ?').run(id);
    db.prepare('DELETE FROM broadcast_campaigns WHERE id = ?').run(id);
  }

  private static async sendSingleTenantChannel(
    tenant: TenantRecord,
    channel: 'whatsapp' | 'telegram',
    rawMessage: string
  ): Promise<DeliveryResultItem> {
    const nowMs = Date.now();
    const renderedMsg = resolveBroadcastPlaceholders(
      rawMessage,
      {
        tenant_id: tenant.tenant_id,
        store_name: tenant.store_name,
        owner_name: tenant.owner_name,
        owner_phone: tenant.owner_phone,
        expires_at: tenant.expires_at,
      },
      nowMs
    );
    const sentAt = new Date(nowMs).toISOString();

    if (channel === 'whatsapp') {
      const ownerPhone = (tenant.owner_phone || '').trim();
      if (!ownerPhone) {
        return {
          tenant_id: tenant.tenant_id,
          store_name: tenant.store_name || tenant.tenant_id,
          owner_name: tenant.owner_name || 'Owner',
          channel: 'whatsapp',
          target: '-',
          status: 'failed',
          error_message: 'Nomor WhatsApp owner belum diisi oleh tenant',
          rendered_message: renderedMsg,
          sent_at: sentAt,
        };
      }

      const bot = getBotManager(tenant.tenant_id);
      if (bot.status !== 'connected' || !bot.sock) {
        return {
          tenant_id: tenant.tenant_id,
          store_name: tenant.store_name || tenant.tenant_id,
          owner_name: tenant.owner_name || 'Owner',
          channel: 'whatsapp',
          target: ownerPhone,
          status: 'failed',
          error_message: 'Bot WhatsApp toko sedang Offline / belum terhubung',
          rendered_message: renderedMsg,
          sent_at: sentAt,
        };
      }

      try {
        await bot.sendTextMessage(ownerPhone, renderedMsg);
        return {
          tenant_id: tenant.tenant_id,
          store_name: tenant.store_name || tenant.tenant_id,
          owner_name: tenant.owner_name || 'Owner',
          channel: 'whatsapp',
          target: ownerPhone,
          status: 'success',
          error_message: null,
          rendered_message: renderedMsg,
          sent_at: sentAt,
        };
      } catch (err: any) {
        return {
          tenant_id: tenant.tenant_id,
          store_name: tenant.store_name || tenant.tenant_id,
          owner_name: tenant.owner_name || 'Owner',
          channel: 'whatsapp',
          target: ownerPhone,
          status: 'failed',
          error_message: err?.message || 'Gagal mengirim pesan melalui socket Baileys',
          rendered_message: renderedMsg,
          sent_at: sentAt,
        };
      }
    }

    // Channel Telegram (Opsi A & Opsi B)
    const tgResult = await sendAdminBroadcastToTelegram(tenant.tenant_id, renderedMsg);
    return {
      tenant_id: tenant.tenant_id,
      store_name: tenant.store_name || tenant.tenant_id,
      owner_name: tenant.owner_name || 'Owner',
      channel: 'telegram',
      target: tgResult.target || '-',
      status: tgResult.success ? 'success' : 'failed',
      error_message: tgResult.success ? null : tgResult.error || 'Gagal mengirim pesan Telegram',
      rendered_message: renderedMsg,
      sent_at: sentAt,
    };
  }

  /**
   * Mengeksekusi kampanye broadcast secara paralel ke seluruh tenant yang berstatus `active`.
   */
  static async executeCampaign(
    campaignId: number,
    options?: { triggeredManually?: boolean }
  ): Promise<BroadcastCampaign> {
    if (executingCampaignIds.has(campaignId)) {
      throw new Error('Kampanye ini sedang dalam proses eksekusi.');
    }

    const campaign = this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Kampanye broadcast tidak ditemukan.');
    }
    if (campaign.status === 'cancelled') {
      throw new Error('Kampanye sudah dibatalkan.');
    }

    executingCampaignIds.add(campaignId);
    const db = getMasterDb();

    try {
      db.prepare("UPDATE broadcast_campaigns SET status = 'processing', updated_at = ? WHERE id = ?").run(
        new Date().toISOString(),
        campaignId
      );

      // Hanya tenant dengan status efektif `active` (tidak expired dan tidak suspended)
      const activeTenants = TenantService.getAllTenants().filter((t) => t.status === 'active');
      const nextRunNumber = (campaign.run_count || 0) + 1;

      const channelsToSend: ('whatsapp' | 'telegram')[] =
        campaign.channel === 'both'
          ? ['whatsapp', 'telegram']
          : campaign.channel === 'whatsapp'
          ? ['whatsapp']
          : ['telegram'];

      // Eksekusi paralel (karena tiap tenant pakai akun WA & Telegram masing-masing)
      const deliveryTasks: Promise<DeliveryResultItem>[] = [];
      for (const tenant of activeTenants) {
        for (const ch of channelsToSend) {
          deliveryTasks.push(this.sendSingleTenantChannel(tenant, ch, campaign.message));
        }
      }

      const settledResults = await Promise.all(deliveryTasks);

      let waSuccess = 0;
      let waFailed = 0;
      let tgSuccess = 0;
      let tgFailed = 0;

      const insertLogStmt = db.prepare(`
        INSERT INTO broadcast_logs (
          campaign_id, run_number, tenant_id, store_name, owner_name,
          channel, target, status, error_message, rendered_message, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const saveLogsTx = db.transaction((items: DeliveryResultItem[]) => {
        for (const item of items) {
          insertLogStmt.run(
            campaignId,
            nextRunNumber,
            item.tenant_id,
            item.store_name,
            item.owner_name,
            item.channel,
            item.target,
            item.status,
            item.error_message,
            item.rendered_message,
            item.sent_at
          );

          if (item.channel === 'whatsapp') {
            if (item.status === 'success') waSuccess += 1;
            else waFailed += 1;
          } else {
            if (item.status === 'success') tgSuccess += 1;
            else tgFailed += 1;
          }
        }
      });

      saveLogsTx(settledResults);

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const isRecurring =
        campaign.schedule_type === 'daily' ||
        campaign.schedule_type === 'weekly' ||
        campaign.schedule_type === 'monthly';

      let finalStatus: BroadcastCampaign['status'];
      let nextRunAt: string | null = null;

      if (isRecurring) {
        finalStatus = 'active_recurring';
        // Jika manual "Kirim Sekarang" sebelum jadwal tiba, pertahankan next_run_at lama jika masih di masa depan
        const existingNextMs = campaign.next_run_at ? new Date(campaign.next_run_at).getTime() : 0;
        if (options?.triggeredManually && existingNextMs > nowMs + 10000) {
          nextRunAt = campaign.next_run_at;
        } else {
          nextRunAt = computeNextRecurringRunUtc(
            {
              schedule_type: campaign.schedule_type,
              recurrence_time: campaign.recurrence_time,
              recurrence_day_of_week: campaign.recurrence_day_of_week,
              recurrence_day_of_month: campaign.recurrence_day_of_month,
            },
            nowMs
          );
        }
      } else {
        finalStatus = evaluateCampaignRunStatus({
          totalSuccess: waSuccess + tgSuccess,
          totalFailed: waFailed + tgFailed,
        });
        nextRunAt = null;
      }

      db.prepare(
        `UPDATE broadcast_campaigns
         SET status = ?, next_run_at = ?, total_targets = ?,
             wa_success = ?, wa_failed = ?, tg_success = ?, tg_failed = ?,
             run_count = ?, last_run_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        finalStatus,
        nextRunAt,
        activeTenants.length,
        waSuccess,
        waFailed,
        tgSuccess,
        tgFailed,
        nextRunNumber,
        nowIso,
        nowIso,
        campaignId
      );

      console.log(
        `[Broadcast] Kampanye #${campaignId} ("${campaign.title}") selesai dieksekusi (Run #${nextRunNumber}). Target: ${activeTenants.length} toko | WA: ${waSuccess}/${waSuccess + waFailed} | TG: ${tgSuccess}/${tgSuccess + tgFailed}`
      );

      return this.getCampaignById(campaignId)!;
    } finally {
      executingCampaignIds.delete(campaignId);
    }
  }

  /**
   * Mengirim ulang seluruh log yang gagal pada eksekusi terakhir (atau run tertentu).
   */
  static async retryFailedLogs(
    campaignId: number,
    targetRunNumber?: number
  ): Promise<{ campaign: BroadcastCampaign; retriedCount: number; newlySucceeded: number }> {
    const campaign = this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Kampanye broadcast tidak ditemukan.');
    }

    const db = getMasterDb();
    const runNumber = targetRunNumber || campaign.run_count || 1;
    const failedLogs = db
      .prepare(
        `SELECT * FROM broadcast_logs
         WHERE campaign_id = ? AND run_number = ? AND status = 'failed'`
      )
      .all(campaignId, runNumber) as BroadcastLogEntry[];

    if (failedLogs.length === 0) {
      return { campaign, retriedCount: 0, newlySucceeded: 0 };
    }

    const activeTenantsMap = new Map(
      TenantService.getAllTenants()
        .filter((t) => t.status === 'active')
        .map((t) => [t.tenant_id, t])
    );

    const tasks = failedLogs.map(async (log) => {
      const tenant = activeTenantsMap.get(log.tenant_id);
      if (!tenant) {
        return {
          logId: log.id,
          status: 'failed' as const,
          target: log.target,
          error_message: 'Status akun tenant tidak lagi Active (Expired atau Suspended)',
          rendered_message: log.rendered_message || campaign.message,
          sent_at: new Date().toISOString(),
        };
      }

      const result = await this.sendSingleTenantChannel(tenant, log.channel, campaign.message);
      return {
        logId: log.id,
        status: result.status,
        target: result.target,
        error_message: result.error_message,
        rendered_message: result.rendered_message,
        sent_at: result.sent_at,
      };
    });

    const settled = await Promise.all(tasks);
    let newlySucceeded = 0;

    const updateStmt = db.prepare(`
      UPDATE broadcast_logs
      SET status = ?, target = ?, error_message = ?, rendered_message = ?, sent_at = ?
      WHERE id = ?
    `);

    const tx = db.transaction(() => {
      for (const item of settled) {
        if (item.status === 'success') newlySucceeded += 1;
        updateStmt.run(
          item.status,
          item.target,
          item.error_message,
          item.rendered_message,
          item.sent_at,
          item.logId
        );
      }
    });
    tx();

    // Hitung ulang statistik untuk runNumber ini
    if (runNumber === campaign.run_count) {
      const statsRows = db
        .prepare(
          `SELECT channel, status, COUNT(*) as cnt
           FROM broadcast_logs
           WHERE campaign_id = ? AND run_number = ?
           GROUP BY channel, status`
        )
        .all(campaignId, runNumber) as { channel: string; status: string; cnt: number }[];

      let waSuccess = 0;
      let waFailed = 0;
      let tgSuccess = 0;
      let tgFailed = 0;

      for (const r of statsRows) {
        if (r.channel === 'whatsapp' && r.status === 'success') waSuccess = r.cnt;
        if (r.channel === 'whatsapp' && r.status === 'failed') waFailed = r.cnt;
        if (r.channel === 'telegram' && r.status === 'success') tgSuccess = r.cnt;
        if (r.channel === 'telegram' && r.status === 'failed') tgFailed = r.cnt;
      }

      const newStatus =
        campaign.status === 'active_recurring' || campaign.status === 'cancelled'
          ? campaign.status
          : evaluateCampaignRunStatus({
              totalSuccess: waSuccess + tgSuccess,
              totalFailed: waFailed + tgFailed,
            });

      db.prepare(
        `UPDATE broadcast_campaigns
         SET wa_success = ?, wa_failed = ?, tg_success = ?, tg_failed = ?,
             status = ?, updated_at = ?
         WHERE id = ?`
      ).run(waSuccess, waFailed, tgSuccess, tgFailed, newStatus, new Date().toISOString(), campaignId);
    }

    return {
      campaign: this.getCampaignById(campaignId)!,
      retriedCount: failedLogs.length,
      newlySucceeded,
    };
  }

  /**
   * Memeriksa dan mengeksekusi jadwal broadcast yang sudah jatuh tempo.
   */
  static async checkDueBroadcasts(): Promise<number> {
    if (isProcessingDueBroadcasts) return 0;
    isProcessingDueBroadcasts = true;

    try {
      const db = getMasterDb();
      const nowIso = new Date().toISOString();
      const dueCampaigns = db
        .prepare(
          `SELECT id FROM broadcast_campaigns
           WHERE status IN ('scheduled', 'active_recurring')
             AND next_run_at IS NOT NULL
             AND next_run_at <= ?
           ORDER BY next_run_at ASC`
        )
        .all(nowIso) as { id: number }[];

      for (const row of dueCampaigns) {
        try {
          await this.executeCampaign(row.id);
        } catch (err) {
          console.error(`[Broadcast Scheduler] Gagal eksekusi kampanye #${row.id}:`, err);
        }
      }

      return dueCampaigns.length;
    } finally {
      isProcessingDueBroadcasts = false;
    }
  }
}

export function startBroadcastScheduler(): void {
  if (broadcastSchedulerInterval) return;

  console.log('[Broadcast Scheduler] Scheduler pesan siaran otomatis aktif (interval pengecekan: 20 detik).');

  broadcastStartupTimer = setTimeout(() => {
    BroadcastService.checkDueBroadcasts().catch((err) =>
      console.error('[Broadcast Scheduler] Gagal pengecekan awal:', err)
    );
  }, 5000);

  broadcastSchedulerInterval = setInterval(() => {
    BroadcastService.checkDueBroadcasts().catch((err) =>
      console.error('[Broadcast Scheduler] Error interval:', err)
    );
  }, 20 * 1000);
}

export function stopBroadcastScheduler(): void {
  if (broadcastStartupTimer) {
    clearTimeout(broadcastStartupTimer);
    broadcastStartupTimer = null;
  }
  if (broadcastSchedulerInterval) {
    clearInterval(broadcastSchedulerInterval);
    broadcastSchedulerInterval = null;
  }
}
