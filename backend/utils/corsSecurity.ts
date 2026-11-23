export function parseAllowedCorsOrigins(rawEnv?: string): string[] {
  if (!rawEnv || typeof rawEnv !== 'string') return [];

  return rawEnv
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter((entry) => {
      if (!entry || entry === '*') return false;
      try {
        const parsed = new URL(entry);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    });
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  options: {
    corsOriginsEnv?: string;
    requestHost?: string;
    isProduction?: boolean;
  }
): boolean {
  if (!origin || typeof origin !== 'string') return false;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin.trim());
  } catch {
    return false;
  }

  if (parsedOrigin.protocol !== 'https:' && parsedOrigin.protocol !== 'http:') {
    return false;
  }

  const normalizedOrigin = parsedOrigin.origin;
  const allowlist = parseAllowedCorsOrigins(options.corsOriginsEnv);
  if (allowlist.includes(normalizedOrigin)) {
    return true;
  }

  const cleanReqHost = typeof options.requestHost === 'string' ? options.requestHost.trim().toLowerCase() : '';
  if (cleanReqHost && parsedOrigin.host.toLowerCase() === cleanReqHost) {
    return true;
  }

  if (!options.isProduction) {
    const devOrigins = new Set([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ]);
    if (devOrigins.has(normalizedOrigin)) {
      return true;
    }
  }

  return false;
}
