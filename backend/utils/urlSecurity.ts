import dns from 'node:dns/promises';
import net from 'node:net';

export class UrlSecurityError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'UrlSecurityError';
    this.statusCode = statusCode;
  }
}

export interface HostLookupResult {
  address: string;
  family?: number;
}

export type HostResolverFn = (hostname: string) => Promise<HostLookupResult[]>;

const BLOCKED_HOSTNAME_EXACT = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.localdomain',
  '.home.arpa',
];

function stripIpv6Zone(ip: string): string {
  const idx = ip.indexOf('%');
  return idx >= 0 ? ip.slice(0, idx) : ip;
}

function parseIpv4ToUint32(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let val = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    if (part.length > 1 && part.startsWith('0')) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    val = (val << 8) | n;
  }
  return val >>> 0;
}

export function isPrivateOrReservedIpv4(ip: string): boolean {
  const num = parseIpv4ToUint32(ip.trim());
  if (num === null) return true;

  const b0 = (num >>> 24) & 0xff;
  const b1 = (num >>> 16) & 0xff;
  const b2 = (num >>> 8) & 0xff;

  if (b0 === 0) return true; // 0.0.0.0/8 (Current network)
  if (b0 === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (b0 === 127) return true; // 127.0.0.0/8 (Loopback)
  if (b0 === 169 && b1 === 254) return true; // 169.254.0.0/16 (Link-local / Cloud Metadata)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (b0 === 192 && b1 === 0 && b2 === 0) return true; // 192.0.0.0/24
  if (b0 === 192 && b1 === 0 && b2 === 2) return true; // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 88 && b2 === 99) return true; // 192.88.99.0/24 (6to4)
  if (b0 === 192 && b1 === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true; // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && b1 === 51 && b2 === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 203 && b1 === 0 && b2 === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (b0 >= 224) return true; // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved

  return false;
}

function expandIpv6ToWords(rawIp: string): number[] | null {
  let clean = stripIpv6Zone(rawIp.trim().toLowerCase());
  if (!clean || net.isIPv6(clean) === false) return null;

  // Handle embedded IPv4 tail such as ::ffff:127.0.0.1 or ::127.0.0.1
  const lastColon = clean.lastIndexOf(':');
  if (lastColon !== -1 && clean.slice(lastColon + 1).includes('.')) {
    const ipv4Part = clean.slice(lastColon + 1);
    const v4Num = parseIpv4ToUint32(ipv4Part);
    if (v4Num === null) return null;
    const hi = ((v4Num >>> 16) & 0xffff).toString(16);
    const lo = (v4Num & 0xffff).toString(16);
    clean = `${clean.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = clean.split('::');
  if (halves.length > 2) return null;

  const parseHalf = (half: string): number[] | null => {
    if (!half) return [];
    const parts = half.split(':');
    const out: number[] = [];
    for (const part of parts) {
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      out.push(parseInt(part, 16));
    }
    return out;
  };

  if (halves.length === 1) {
    const words = parseHalf(halves[0]);
    return words && words.length === 8 ? words : null;
  }

  const left = parseHalf(halves[0]);
  const right = parseHalf(halves[1]);
  if (!left || !right) return null;
  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;

  return [...left, ...new Array<number>(missing).fill(0), ...right];
}

export function isPrivateOrReservedIpv6(ip: string): boolean {
  const words = expandIpv6ToWords(ip);
  if (!words) return true;

  const allZeroExceptLast =
    words[0] === 0 &&
    words[1] === 0 &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0;

  // Unspecified (::) and loopback (::1)
  if (allZeroExceptLast && words[6] === 0 && (words[7] === 0 || words[7] === 1)) {
    return true;
  }

  // IPv4-compatible (::/96)
  if (allZeroExceptLast && (words[6] !== 0 || words[7] > 1)) {
    const ipv4 = `${(words[6] >>> 8) & 0xff}.${words[6] & 0xff}.${(words[7] >>> 8) & 0xff}.${words[7] & 0xff}`;
    return isPrivateOrReservedIpv4(ipv4);
  }

  // IPv4-mapped IPv6 (::ffff:0:0/96)
  if (
    words[0] === 0 &&
    words[1] === 0 &&
    words[2] === 0 &&
    words[3] === 0 &&
    words[4] === 0 &&
    words[5] === 0xffff
  ) {
    const ipv4 = `${(words[6] >>> 8) & 0xff}.${words[6] & 0xff}.${(words[7] >>> 8) & 0xff}.${words[7] & 0xff}`;
    return isPrivateOrReservedIpv4(ipv4);
  }

  // IPv4-translated / NAT64 (64:ff9b::/96 and 64:ff9b:1::/48)
  if (words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 0 && words[3] === 0 && words[4] === 0 && words[5] === 0) {
    const ipv4 = `${(words[6] >>> 8) & 0xff}.${words[6] & 0xff}.${(words[7] >>> 8) & 0xff}.${words[7] & 0xff}`;
    return isPrivateOrReservedIpv4(ipv4);
  }
  if (words[0] === 0x0064 && words[1] === 0xff9b && words[2] === 0x0001) {
    return true;
  }

  // Discard-Only (100::/64)
  if (words[0] === 0x0100 && words[1] === 0 && words[2] === 0 && words[3] === 0) {
    return true;
  }

  // Teredo (2001::/32) & Documentation (2001:db8::/32)
  if (words[0] === 0x2001 && (words[1] === 0 || words[1] === 0x0db8)) {
    return true;
  }

  // Unique Local Addresses (fc00::/7)
  if ((words[0] & 0xfe00) === 0xfc00) {
    return true;
  }

  // Link-local (fe80::/10)
  if ((words[0] & 0xffc0) === 0xfe80) {
    return true;
  }

  // Deprecated site-local (fec0::/10)
  if ((words[0] & 0xffc0) === 0xfec0) {
    return true;
  }

  // Multicast (ff00::/8)
  if ((words[0] & 0xff00) === 0xff00) {
    return true;
  }

  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = (ip || '').trim().replace(/^\[|\]$/g, '');
  if (!clean) return true;
  const version = net.isIP(stripIpv6Zone(clean));
  if (version === 4) return isPrivateOrReservedIpv4(clean);
  if (version === 6) return isPrivateOrReservedIpv6(clean);
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const clean = (hostname || '').trim().toLowerCase().replace(/\.+$/, '');
  if (!clean) return true;
  if (BLOCKED_HOSTNAME_EXACT.has(clean)) return true;
  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (clean.endsWith(suffix)) return true;
  }
  // Hostnames without a dot (unless literal IPv6 already handled separately) target internal services/containers
  if (!clean.includes('.') && net.isIP(clean) === 0) return true;
  return false;
}

/**
 * Validasi sinkron sintaks URL eksternal aman:
 * - Wajib HTTPS (https://)
 * - Tidak boleh menyertakan username/password dalam URL
 * - Tidak boleh berupa localhost, hostname internal, atau literal IP privat/loopback/link-local
 */
export function validateExternalHttpsUrlSyntax(rawUrl: string): URL {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    throw new UrlSecurityError('Base URL tidak boleh kosong.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UrlSecurityError('Format Base URL tidak valid.');
  }

  if (parsed.protocol !== 'https:') {
    throw new UrlSecurityError('Base URL wajib menggunakan protokol HTTPS yang aman (https://).');
  }

  if (parsed.username || parsed.password) {
    throw new UrlSecurityError('Base URL tidak boleh mengandung kredensial (username/password).');
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) {
    throw new UrlSecurityError('Hostname Base URL tidak valid.');
  }

  if (net.isIP(stripIpv6Zone(host)) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      throw new UrlSecurityError('Akses ke alamat IP privat, loopback, atau link-local ditolak.');
    }
    return parsed;
  }

  if (isBlockedHostname(host)) {
    throw new UrlSecurityError('Hostname internal atau lokal tidak diizinkan.');
  }

  return parsed;
}

const defaultResolver: HostResolverFn = async (hostname: string) => {
  return dns.lookup(hostname, { all: true });
};

/**
 * Validasi penuh anti-SSRF sebelum melakukan request keluar:
 * 1. Validasi skema HTTPS & hostname
 * 2. Resolusi DNS ke semua alamat IP, lalu menolak jika ada satu pun IP privat/reserved
 */
export async function assertSafeExternalHttpsUrl(
  rawUrl: string,
  options?: { resolveHost?: HostResolverFn }
): Promise<URL> {
  const parsed = validateExternalHttpsUrlSyntax(rawUrl);
  const host = parsed.hostname.replace(/^\[|\]$/g, '');

  if (net.isIP(stripIpv6Zone(host)) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      throw new UrlSecurityError('Akses ke alamat IP privat, loopback, atau link-local ditolak.');
    }
    return parsed;
  }

  const resolveHost = options?.resolveHost || defaultResolver;
  let records: HostLookupResult[];
  try {
    records = await resolveHost(host);
  } catch {
    throw new UrlSecurityError(`Gagal melakukan resolusi DNS untuk host "${host}".`);
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new UrlSecurityError(`Host "${host}" tidak memiliki alamat IP yang valid.`);
  }

  for (const record of records) {
    if (!record?.address || isPrivateOrReservedIp(record.address)) {
      throw new UrlSecurityError(
        `Akses ditolak: host "${host}" mengarah ke alamat IP privat atau terlarang.`
      );
    }
  }

  return parsed;
}

/**
 * Wrapper fetch eksternal anti-SSRF:
 * - Memvalidasi URL & hasil resolusi DNS sebelum koneksi dibuka
 * - Memaksa redirect: 'error' agar redirect 30x tidak membelokkan ke jaringan internal
 * - Memberlakukan timeout bawaan agar koneksi tidak menggantung
 */
export async function safeExternalFetch(
  rawUrl: string,
  init: RequestInit = {},
  options?: {
    timeoutMs?: number;
    resolveHost?: HostResolverFn;
    fetchFn?: typeof fetch;
  }
): Promise<Response> {
  const parsed = await assertSafeExternalHttpsUrl(rawUrl, {
    resolveHost: options?.resolveHost,
  });

  const timeoutMs = options?.timeoutMs ?? 15000;
  const fetchFn = options?.fetchFn ?? fetch;

  return fetchFn(parsed.toString(), {
    ...init,
    redirect: 'error',
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
}
