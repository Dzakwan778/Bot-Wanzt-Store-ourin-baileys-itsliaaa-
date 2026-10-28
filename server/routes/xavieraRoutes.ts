import { Router, Request, Response } from 'express';
import { botManager } from '../botManager.ts';

export const xavieraRouter = Router();

const getXavieraConfig = () => {
  const apiKey = botManager.config.xavieraApiKey?.trim();
  const baseUrl = (botManager.config.xavieraBaseUrl?.trim() || 'https://xavierastore.com/api/v1').replace(/\/+$/, '');
  return { apiKey, baseUrl };
};

// 1. Profil Xaviera (Saldo & Info Akun)
xavieraRouter.get('/profile', async (_req: Request, res: Response) => {
  const { apiKey, baseUrl } = getXavieraConfig();
  if (!apiKey) {
    return res.json({ configured: false, message: 'API Key belum diisi di tab Connection' });
  }

  try {
    const response = await fetch(`${baseUrl}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.json({
        configured: true,
        success: false,
        status: response.status,
        error: data.error || 'Gagal memverifikasi API Key',
      });
    }

    return res.json({ configured: true, success: true, data });
  } catch (err: any) {
    return res.json({
      configured: true,
      success: false,
      error: err?.message || 'Gagal terhubung ke server Xaviera',
    });
  }
});

// 2. Daftar Produk Digital Xaviera
xavieraRouter.get('/products', async (_req: Request, res: Response) => {
  const { apiKey, baseUrl } = getXavieraConfig();
  if (!apiKey) {
    return res.json({ configured: false, message: 'API Key belum diisi di tab Connection' });
  }

  try {
    const response = await fetch(`${baseUrl}/products`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.json({
        configured: true,
        success: false,
        status: response.status,
        error: data.error || 'Gagal memuat produk dari Xaviera API',
      });
    }

    return res.json({ configured: true, success: true, data });
  } catch (err: any) {
    return res.json({
      configured: true,
      success: false,
      error: err?.message || 'Gagal terhubung ke server Xaviera',
    });
  }
});

// 3. Layanan SMM Xaviera
xavieraRouter.get('/smm', async (_req: Request, res: Response) => {
  const { apiKey, baseUrl } = getXavieraConfig();
  if (!apiKey) {
    return res.json({ configured: false, message: 'API Key belum diisi di tab Connection' });
  }

  try {
    const response = await fetch(`${baseUrl}/smm/services`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.json({
        configured: true,
        success: false,
        status: response.status,
        error: data.error || 'Gagal memuat layanan SMM dari Xaviera API',
      });
    }

    return res.json({ configured: true, success: true, data });
  } catch (err: any) {
    return res.json({
      configured: true,
      success: false,
      error: err?.message || 'Gagal terhubung ke server Xaviera',
    });
  }
});

// 4. Layanan Game / Top Up Xaviera
xavieraRouter.get('/games', async (_req: Request, res: Response) => {
  const { apiKey, baseUrl } = getXavieraConfig();
  if (!apiKey) {
    return res.json({ configured: false, message: 'API Key belum diisi di tab Connection' });
  }

  try {
    const response = await fetch(`${baseUrl}/games`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return res.json({
        configured: true,
        success: false,
        status: response.status,
        error: data.error || 'Gagal memuat game dari Xaviera API',
      });
    }

    return res.json({ configured: true, success: true, data });
  } catch (err: any) {
    return res.json({
      configured: true,
      success: false,
      error: err?.message || 'Gagal terhubung ke server Xaviera',
    });
  }
});
