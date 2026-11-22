export type TenantStatus = 'active' | 'expired' | 'suspended';

export interface TenantRecord {
  id: string;
  unit_number: string;
  name: string;
  username: string;
  password_hash: string;
  salt: string;
  phone_number: string;
  plan_name: string;
  status: TenantStatus;
  start_date: string;
  expired_date: string;
  max_groups: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface TenantDTO {
  id: string;
  unitNumber: string;
  name: string;
  username: string;
  phoneNumber: string;
  planName: string;
  status: TenantStatus;
  startDate: string;
  expiredDate: string;
  daysRemaining: number;
  isExpired: boolean;
  maxGroups: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApartmentStats {
  totalTenants: number;
  activeTenants: number;
  expiredTenants: number;
  suspendedTenants: number;
}

export interface CreateTenantInput {
  unitNumber?: string;
  name: string;
  username: string;
  password: string;
  phoneNumber?: string;
  planName?: string;
  durationDays: number;
  maxGroups?: number;
  notes?: string;
}

export interface ExtendLeaseInput {
  additionalDays?: number;
  newExpiredDate?: string;
}

export interface MasterAdminAuthConfig {
  username: string;
  salt: string;
  hash: string;
  updatedAt: string;
}
