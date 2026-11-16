import { CommandsConfig, ProductVariantItem } from '../types/bot.types.ts';
import { getProductVariants } from '../services/xavieraService.ts';
import { calculateSellingPriceForVariant } from '../database/sqlite.ts';

export interface ParsedOrderButtonPayload {
  productName: string;
  variantName: string;
}

export type OrderResolutionResult =
  | {
      ok: true;
      productName: string;
      variantName: string;
      variantId: string;
      costPrice: number;
      sellingPrice: number;
      initialMargin: number;
      stock: number;
      category: string;
    }
  | {
      ok: false;
      reason: 'invalid_format' | 'variant_not_found' | 'out_of_stock' | 'invalid_price';
      productName?: string;
      variantName?: string;
    };

/**
 * Mem-parsing ID tombol interaktif WhatsApp format `order_var:<produk>|<varian>`.
 * Segmen harga ke-3 (jika dikirim oleh klien atau payload lama) SELALU diabaikan.
 * Format selain `order_var:` ditolak untuk mencegah fallback harga hardcode.
 */
export function parseOrderButtonPayload(cleanBtn: string): ParsedOrderButtonPayload | null {
  const trimmed = (cleanBtn || '').trim();
  if (!trimmed.startsWith('order_var:')) {
    return null;
  }

  const raw = trimmed.slice('order_var:'.length);
  const parts = raw.split('|');
  if (parts.length < 2) {
    return null;
  }

  try {
    const productName = decodeURIComponent(parts[0] || '').trim();
    const variantName = decodeURIComponent(parts[1] || '').trim();
    if (!productName || !variantName) {
      return null;
    }
    return { productName, variantName };
  } catch {
    return null;
  }
}

export interface ResolveOrderDeps {
  fetchVariants?: (productName: string, config: CommandsConfig) => Promise<ProductVariantItem[]>;
  calculatePrice?: typeof calculateSellingPriceForVariant;
}

/**
 * Mengambil harga modal otoritatif dari katalog server (`getProductVariants`)
 * lalu menghitung harga jual & margin resmi melalui `calculateSellingPriceForVariant`.
 */
export async function resolveAuthoritativeOrderItem(
  cleanBtn: string,
  config: CommandsConfig,
  deps: ResolveOrderDeps = {}
): Promise<OrderResolutionResult> {
  const parsed = parseOrderButtonPayload(cleanBtn);
  if (!parsed) {
    return { ok: false, reason: 'invalid_format' };
  }

  const fetchVariantsFn = deps.fetchVariants || getProductVariants;
  const calculatePriceFn = deps.calculatePrice || calculateSellingPriceForVariant;

  const variants = await fetchVariantsFn(parsed.productName, config);
  if (!Array.isArray(variants) || variants.length === 0) {
    return {
      ok: false,
      reason: 'variant_not_found',
      productName: parsed.productName,
      variantName: parsed.variantName,
    };
  }

  const targetProductLower = parsed.productName.toLowerCase();
  const targetVariantLower = parsed.variantName.toLowerCase();

  // Prioritaskan kecocokan persis nama produk dan varian, lalu fallback ke nama varian persis dalam daftar produk terkait
  const exactProductAndVariant = variants.find(
    (v) =>
      (v.name || '').trim().toLowerCase() === targetProductLower &&
      (v.variant || '').trim().toLowerCase() === targetVariantLower
  );
  const matched =
    exactProductAndVariant ||
    variants.find((v) => (v.variant || '').trim().toLowerCase() === targetVariantLower);

  if (!matched) {
    return {
      ok: false,
      reason: 'variant_not_found',
      productName: parsed.productName,
      variantName: parsed.variantName,
    };
  }

  const stock = Number(matched.stock ?? 0);
  if (!Number.isFinite(stock) || stock <= 0) {
    return {
      ok: false,
      reason: 'out_of_stock',
      productName: matched.name || parsed.productName,
      variantName: matched.variant || parsed.variantName,
    };
  }

  const costPrice = Number(matched.price);
  if (!Number.isFinite(costPrice) || costPrice <= 0) {
    return {
      ok: false,
      reason: 'invalid_price',
      productName: matched.name || parsed.productName,
      variantName: matched.variant || parsed.variantName,
    };
  }

  const officialProductName = (matched.name || parsed.productName).trim();
  const officialVariantName = (matched.variant || parsed.variantName).trim();
  const variantId = String(matched.id || `${officialProductName}|${officialVariantName}`);

  const sellingCalc = calculatePriceFn(
    costPrice,
    variantId,
    officialProductName,
    officialVariantName
  );

  if (!Number.isFinite(sellingCalc.sellingPrice) || sellingCalc.sellingPrice <= 0) {
    return {
      ok: false,
      reason: 'invalid_price',
      productName: officialProductName,
      variantName: officialVariantName,
    };
  }

  return {
    ok: true,
    productName: officialProductName,
    variantName: officialVariantName,
    variantId,
    costPrice: Math.round(costPrice),
    sellingPrice: Math.round(sellingCalc.sellingPrice),
    initialMargin: Math.max(0, Math.round(sellingCalc.margin)),
    stock,
    category: (matched.category || 'Digital').trim(),
  };
}
