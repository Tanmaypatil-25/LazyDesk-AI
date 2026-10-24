import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateFileHeader,
  extractDocumentText
} from '../services/extractor.service.js';

describe('Document Extractor Service', () => {
  it('validates plain text files and rejects binary headers', () => {
    const validTextBuffer = Buffer.from('Quarterly financial report 2026. Revenue grew by 15%.', 'utf-8');
    assert.strictEqual(validateFileHeader(validTextBuffer, 'text/plain'), true);

    // Buffer with binary null byte disguised as text
    const binaryBuffer = Buffer.from([0x00, 0x12, 0x34, 0x56]);
    assert.strictEqual(validateFileHeader(binaryBuffer, 'text/plain'), false);
  });

  it('validates PDF magic bytes', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
    assert.strictEqual(validateFileHeader(validPdfBuffer, 'application/pdf'), true);

    const fakePdfBuffer = Buffer.from('Not a real PDF file');
    assert.strictEqual(validateFileHeader(fakePdfBuffer, 'application/pdf'), false);
  });

  it('extracts plain text cleanly and normalizes whitespace', async () => {
    const input = '   Line 1\r\n\r\nLine 2   with   spaces\t\ttab   ';
    const buffer = Buffer.from(input, 'utf-8');

    const result = await extractDocumentText(buffer, 'text/plain');
    assert.ok(result.text.includes('Line 1'));
    assert.ok(result.text.includes('Line 2 with spaces tab'));
    assert.strictEqual(result.truncated, false);
  });

  it('truncates text that exceeds maximum length safety limits', async () => {
    const longString = 'A'.repeat(9000);
    const buffer = Buffer.from(longString, 'utf-8');

    const result = await extractDocumentText(buffer, 'text/plain');
    assert.strictEqual(result.truncated, true);
    assert.strictEqual(result.length, 8000);
  });

  it('extracts real text from valid PDF document file', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const samplePdfPath = path.resolve('samples/software-consulting-agreement.pdf');
    if (fs.existsSync(samplePdfPath)) {
      const buffer = fs.readFileSync(samplePdfPath);
      const result = await extractDocumentText(buffer, 'application/pdf');
      assert.ok(result.text.includes('CONSULTING AGREEMENT'));
      assert.ok(result.text.includes('LazyDesk AI'));
      assert.ok(result.length > 50);
    }
  });
});
