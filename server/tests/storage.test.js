import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateSafeStorageName,
  sanitizeFilename,
  resolveSafePath,
  UPLOAD_DIR
} from '../services/storage.service.js';

describe('Storage Service Security Guardrails', () => {
  it('generates a unique safe internal filename retaining safe extension', () => {
    const original = '../../../etc/passwd.txt';
    const safeName = generateSafeStorageName(original);

    assert.ok(safeName.endsWith('.txt'), 'Should retain .txt extension');
    assert.ok(!safeName.includes('/'), 'Should not contain forward slashes');
    assert.ok(!safeName.includes('\\'), 'Should not contain backslashes');
    assert.ok(!safeName.includes('..'), 'Should not contain parent directory dots');
  });

  it('prevents path traversal in resolveSafePath', () => {
    assert.throws(
      () => {
        resolveSafePath('../../../../windows/system32/cmd.exe');
      },
      /Security Error: Path traversal attempt detected/,
      'Should throw security error for path traversal'
    );
  });

  it('sanitizes human suggested filenames properly', () => {
    const maliciousName = '2026/10/20\\invoice:final*draft?.pdf';
    const sanitized = sanitizeFilename(maliciousName, '.pdf');

    assert.strictEqual(sanitized, '2026-10-20-invoice-final-draft-.pdf');
    assert.ok(!sanitized.includes('/'));
    assert.ok(!sanitized.includes('\\'));
    assert.ok(!sanitized.includes(':'));
  });

  it('adds default extension if missing from suggested name', () => {
    const raw = 'my-quarterly-report';
    const sanitized = sanitizeFilename(raw, '.pdf');
    assert.strictEqual(sanitized, 'my-quarterly-report.pdf');
  });
});
