import { serverApp } from './app.ts';

const PORT = parseInt(process.env.PORT || process.env.BACKEND_PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

serverApp.listen(PORT, HOST, () => {
  console.log(`[Wanzt Store Backend] Berjalan di http://${HOST}:${PORT}`);
  console.log(`[Wanzt Store Backend] API Endpoints aktif di http://${HOST}:${PORT}/api/`);
});
