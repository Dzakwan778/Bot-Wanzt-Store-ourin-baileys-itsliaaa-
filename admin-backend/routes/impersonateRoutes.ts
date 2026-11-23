import { Router, Request, Response } from 'express';
import { TenantService } from '../services/tenantService.ts';
import { AdminAuthService } from '../services/adminAuthService.ts';

export const impersonateRouter = Router();

impersonateRouter.post('/tenants/:id/impersonate', (req: Request, res: Response) => {
  try {
    const tenantId = String(req.params.id);
    const tenant = TenantService.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' });
    }

    const adminId = Number((req as any).masterAdmin?.id || 0);
    const adminSessionToken = String((req as any).masterAdminSessionToken || '');
    if (!adminId || !adminSessionToken) {
      return res.status(401).json({ success: false, message: 'Sesi Master Admin tidak valid.' });
    }

    const impCode = AdminAuthService.createImpersonationCode(tenantId, adminId, adminSessionToken);

    return res.json({
      success: true,
      code: impCode,
      redirectUrl: `/#impersonate_code=${impCode}`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Gagal membuat sesi impersonasi' });
  }
});
