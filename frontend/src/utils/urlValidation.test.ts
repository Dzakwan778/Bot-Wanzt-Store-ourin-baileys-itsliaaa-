import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSafeHttpsUrl } from './urlValidation';

test('sanitizeSafeHttpsUrl only permits valid https URLs and rejects unsafe schemes', () => {
  assert.equal(
    sanitizeSafeHttpsUrl('https://checkout.lunasqris.my.id/pay/TRX-123'),
    'https://checkout.lunasqris.my.id/pay/TRX-123'
  );
  assert.equal(
    sanitizeSafeHttpsUrl('  https://example.com/invoice?id=1  '),
    'https://example.com/invoice?id=1'
  );

  // Reject non-https or malformed links
  assert.equal(sanitizeSafeHttpsUrl('http://checkout.lunasqris.my.id/pay/123'), '');
  assert.equal(sanitizeSafeHttpsUrl('javascript:alert(document.cookie)'), '');
  assert.equal(sanitizeSafeHttpsUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(sanitizeSafeHttpsUrl('vbscript:msgbox(1)'), '');
  assert.equal(sanitizeSafeHttpsUrl('/relative/path'), '');
  assert.equal(sanitizeSafeHttpsUrl('not a url'), '');
  assert.equal(sanitizeSafeHttpsUrl(''), '');
  assert.equal(sanitizeSafeHttpsUrl(null), '');
  assert.equal(sanitizeSafeHttpsUrl(undefined), '');
});
