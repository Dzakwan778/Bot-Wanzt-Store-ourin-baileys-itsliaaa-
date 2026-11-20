/**
 * Memastikan URL eksternal (seperti link checkout QRIS) hanya menggunakan protokol HTTPS yang valid
 * sebelum dirender ke tautan <a href>. Mengembalikan string kosong bila tidak aman/tidak valid.
 */
export function sanitizeSafeHttpsUrl(rawUrl?: string | null): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}
