import { db } from '../database/sqlite.ts';

export interface GroupItem {
  id: string;
  subject: string;
  memberCount: number;
  creation?: number;
  owner?: string;
  desc?: string;
  enabled: boolean;
}

export function loadGroupsConfig(): Record<string, boolean> {
  try {
    const rows = db.prepare('SELECT group_id, enabled FROM group_whitelist').all() as {
      group_id: string;
      enabled: number;
    }[];

    const result: Record<string, boolean> = {};
    for (const row of rows) {
      result[row.group_id] = row.enabled === 1;
    }
    return result;
  } catch (err) {
    console.error('Gagal membaca whitelist grup dari SQLite:', err);
    return {};
  }
}

export function saveGroupsConfig(toggledGroups: Record<string, boolean>): void {
  try {
    const insertGroup = db.prepare(`
      INSERT OR REPLACE INTO group_whitelist (group_id, enabled, updated_at)
      VALUES (?, ?, ?)
    `);
    const now = new Date().toISOString();

    const insertMany = db.transaction((groups: Record<string, boolean>) => {
      for (const [gid, enabled] of Object.entries(groups)) {
        insertGroup.run(gid, enabled ? 1 : 0, now);
      }
    });

    insertMany(toggledGroups);
  } catch (err) {
    console.error('Gagal menyimpan whitelist grup ke SQLite:', err);
  }
}

export function setGroupToggle(groupId: string, enabled: boolean): Record<string, boolean> {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO group_whitelist (group_id, enabled, updated_at)
      VALUES (?, ?, ?)
    `).run(groupId, enabled ? 1 : 0, now);

    return loadGroupsConfig();
  } catch (err) {
    console.error(`Gagal mengubah status toggle grup ${groupId} di SQLite:`, err);
    return loadGroupsConfig();
  }
}
