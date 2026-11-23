import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseOrderButtonPayload } from './orderPricingUtils.ts';

test('parseOrderButtonPayload parses product & variant and strips tampered price segment', () => {
  const parsed = parseOrderButtonPayload('order_var:YouTube|YouTube%20Premium%2012%20Bulan|1');
  assert.deepEqual(parsed, {
    productName: 'YouTube',
    variantName: 'YouTube Premium 12 Bulan',
  });

  const cleanTwoParts = parseOrderButtonPayload('order_var:Netflix|Netflix%20Sharing%201%20Bulan');
  assert.deepEqual(cleanTwoParts, {
    productName: 'Netflix',
    variantName: 'Netflix Sharing 1 Bulan',
  });
});

test('parseOrderButtonPayload rejects legacy arbitrary order_ formats without catalog key', () => {
  assert.equal(parseOrderButtonPayload('order_custom_free'), null);
  assert.equal(parseOrderButtonPayload('order_var:YouTube'), null);
  assert.equal(parseOrderButtonPayload('order_var:|Varian'), null);
  assert.equal(parseOrderButtonPayload('order_var:YouTube|'), null);
});

test('resolveAuthoritativeOrderItem enforces catalog pricing in isolated DB', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'order-pricing-test-'));
  const repoRoot = process.cwd();

  const script = `
    import assert from 'node:assert/strict';
    import { initDatabase, savePricingConfig, saveVariantPricing, calculateSellingPriceForVariant } from ${JSON.stringify(path.join(repoRoot, 'backend/database/sqlite.ts'))};
    import { resolveAuthoritativeOrderItem } from ${JSON.stringify(path.join(repoRoot, 'backend/handlers/orderPricingUtils.ts'))};

    initDatabase();
    savePricingConfig('rp', 1500);
    saveVariantPricing('yt-12m', {
      productName: 'YouTube',
      variantName: 'YouTube Premium 12 Bulan',
      pricingType: 'custom',
      mode: 'rp',
      value: 3000,
    });

    const mockVariants = [
      { id: 'yt-1m', name: 'YouTube', variant: 'YouTube Famplan 1 Bulan', stock: 10, price: 3500, category: 'Streaming' },
      { id: 'yt-12m', name: 'YouTube', variant: 'YouTube Premium 12 Bulan', stock: 5, price: 35000, category: 'Streaming' },
      { id: 'yt-0', name: 'YouTube', variant: 'YouTube Kosong', stock: 0, price: 4000, category: 'Streaming' },
    ];

    const config = { commandPrefix: '!' };
    const fetchVariants = async () => mockVariants;

    // 1. Tampered price |1 MUST be ignored; server computes 35000 + 3000 = 38000
    const res1 = await resolveAuthoritativeOrderItem(
      'order_var:YouTube|YouTube%20Premium%2012%20Bulan|1',
      config,
      { fetchVariants, calculatePrice: calculateSellingPriceForVariant }
    );
    assert.equal(res1.ok, true);
    if (res1.ok) {
      assert.equal(res1.costPrice, 35000);
      assert.equal(res1.sellingPrice, 38000);
      assert.equal(res1.initialMargin, 3000);
      assert.equal(res1.variantId, 'yt-12m');
    }

    // 2. General markup variant: 3500 + 1500 = 5000
    const res2 = await resolveAuthoritativeOrderItem(
      'order_var:YouTube|YouTube%20Famplan%201%20Bulan|10',
      config,
      { fetchVariants, calculatePrice: calculateSellingPriceForVariant }
    );
    assert.equal(res2.ok, true);
    if (res2.ok) {
      assert.equal(res2.costPrice, 3500);
      assert.equal(res2.sellingPrice, 5000);
      assert.equal(res2.initialMargin, 1500);
    }

    // 3. Unknown variant MUST be rejected (no fallback Rp 5000)
    const res3 = await resolveAuthoritativeOrderItem(
      'order_var:YouTube|Paket%20Palsu|1',
      config,
      { fetchVariants, calculatePrice: calculateSellingPriceForVariant }
    );
    assert.equal(res3.ok, false);
    if (!res3.ok) assert.equal(res3.reason, 'variant_not_found');

    // 4. Out-of-stock variant MUST be rejected
    const res4 = await resolveAuthoritativeOrderItem(
      'order_var:YouTube|YouTube%20Kosong|1',
      config,
      { fetchVariants, calculatePrice: calculateSellingPriceForVariant }
    );
    assert.equal(res4.ok, false);
    if (!res4.ok) assert.equal(res4.reason, 'out_of_stock');

    console.log('ALL_ORDER_PRICING_OK');
  `;

  try {
    const out = execFileSync(
      process.execPath,
      [path.join(repoRoot, 'node_modules/tsx/dist/cli.mjs'), '--input-type=module', '-e', script],
      { cwd: tmpDir, encoding: 'utf-8' }
    );
    assert.match(out, /ALL_ORDER_PRICING_OK/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
