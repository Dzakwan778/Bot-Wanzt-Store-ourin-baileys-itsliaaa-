import { serverApp } from './app.ts';

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

serverApp.listen(PORT, HOST, () => {
  console.log(`[Backend Server] Berjalan secara mandiri di http://${HOST}:${PORT}`);
  console.log(`[Backend Server] API Endpoints aktif di http://${HOST}:${PORT}/api/`);
});
