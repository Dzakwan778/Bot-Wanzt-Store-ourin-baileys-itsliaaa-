import fs from 'fs';
import path from 'path';

export interface GroupItem {
  id: string;
  subject: string;
  memberCount: number;
  creation?: number;
  owner?: string;
  desc?: string;
  enabled: boolean;
}

export interface GroupsConfigFile {
  toggledGroups: Record<string, boolean>;
  lastUpdated?: number;
}

const DATABASE_DIR = path.join(process.cwd(), 'database');
const GROUPS_CONFIG_FILE = path.join(DATABASE_DIR, 'groups_config.json');

export function loadGroupsConfig(): Record<string, boolean> {
  try {
    if (!fs.existsSync(DATABASE_DIR)) {
      fs.mkdirSync(DATABASE_DIR, { recursive: true });
    }
    if (fs.existsSync(GROUPS_CONFIG_FILE)) {
      const content = fs.readFileSync(GROUPS_CONFIG_FILE, 'utf-8');
      const data = JSON.parse(content) as GroupsConfigFile;
      return data.toggledGroups || {};
    }
  } catch (err) {
    console.error('Gagal membaca groups_config.json:', err);
  }
  return {};
}

export function saveGroupsConfig(toggledGroups: Record<string, boolean>): void {
  try {
    if (!fs.existsSync(DATABASE_DIR)) {
      fs.mkdirSync(DATABASE_DIR, { recursive: true });
    }
    const data: GroupsConfigFile = {
      toggledGroups,
      lastUpdated: Date.now(),
    };
    fs.writeFileSync(GROUPS_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan groups_config.json:', err);
  }
}

export function setGroupToggle(groupId: string, enabled: boolean): Record<string, boolean> {
  const current = loadGroupsConfig();
  current[groupId] = enabled;
  saveGroupsConfig(current);
  return current;
}
