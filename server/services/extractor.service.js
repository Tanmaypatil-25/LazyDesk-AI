import fs from 'fs';
import pdfParse from 'pdf-parse';
import { MAX_TEXT_EXTRACT_CHARS } from '../config/constants.js';

/**
 * Validate file signature (magic bytes) to ensure file matches declared type
 */
export function validateFileHeader(buffer, mimeType) {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  if (mimeType === 'application/pdf') {
    // PDF files start with %PDF- (hex: 25 50 44 46 2D)
    const header = buffer.toString('utf-8', 0, 5);
    return header.startsWith('%PDF-');
  }

  if (mimeType === 'text/plain') {
    // Ensure no binary null characters in the first 512 bytes
    const checkLength = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLength; i++) {
      if (buffer[i] === 0) {
        return false; // Binary file disguised as text
      }
    }
    return true;
  }

  return false;
}

/**
 * Extract clean, normalized text from a TXT or PDF buffer
 */
export async function extractDocumentText(buffer, mimeType) {
  if (!buffer || buffer.length === 0) {
    return { text: '', length: 0, truncated: false };
  }

  let rawText = '';

  if (mimeType === 'application/pdf') {
    try {
      const data = await pdfParse(buffer);
      rawText = data.text || '';
    } catch (err) {
      throw new Error(`PDF parsing failed: ${err.message}`);
    }
  } else if (mimeType === 'text/plain') {
    rawText = buffer.toString('utf-8');
  } else {
    throw new Error(`Unsupported MIME type for text extraction: ${mimeType}`);
  }

  // Normalize whitespace and remove control characters
  const cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const truncated = cleaned.length > MAX_TEXT_EXTRACT_CHARS;
  const safeText = truncated ? cleaned.slice(0, MAX_TEXT_EXTRACT_CHARS) : cleaned;

  return {
    text: safeText,
    length: safeText.length,
    originalLength: cleaned.length,
    truncated
  };
}
