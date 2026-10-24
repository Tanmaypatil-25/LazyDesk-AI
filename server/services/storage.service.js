import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads are strictly contained in server/uploads
export const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

// Ensure directory exists synchronously at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Generate a safe unique internal filename that preserves only the safe extension
 */
export function generateSafeStorageName(originalFilename) {
  const ext = path.extname(originalFilename).toLowerCase();
  const safeExt = ext === '.pdf' ? '.pdf' : '.txt';
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();
  return `${timestamp}-${uniqueId}${safeExt}`;
}

/**
 * Sanitize a human-friendly suggested filename for presentation or download
 * Never allows path traversal (removes slashes, backslashes, control characters)
 */
export function sanitizeFilename(filename, fallbackExtension = '.txt') {
  if (!filename || typeof filename !== 'string') {
    return `document-${Date.now()}${fallbackExtension}`;
  }

  // Remove path traversal and directory navigation patterns
  let clean = filename
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\.{2,}/g, '')
    .trim();

  // Strip leading and trailing dots
  clean = clean.replace(/^\.+/, '').replace(/\.+$/, '');

  // Truncate length
  if (clean.length > 100) {
    const parts = clean.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop() : fallbackExtension;
    clean = parts.join('.').slice(0, 90) + ext;
  }

  // Ensure it has an extension
  if (!clean.endsWith('.pdf') && !clean.endsWith('.txt')) {
    clean += fallbackExtension;
  }

  return clean || `document-${Date.now()}${fallbackExtension}`;
}

/**
 * Resolves a safe path inside UPLOAD_DIR preventing path traversal
 */
export function resolveSafePath(storedFilename) {
  if (
    typeof storedFilename !== 'string' ||
    storedFilename.includes('..') ||
    path.basename(storedFilename) !== storedFilename
  ) {
    throw new Error('Security Error: Path traversal attempt detected');
  }

  const resolved = path.resolve(UPLOAD_DIR, storedFilename);
  
  if (!resolved.startsWith(UPLOAD_DIR)) {
    throw new Error('Security Error: Path traversal attempt detected');
  }
  return resolved;
}

/**
 * Delete a file safely
 */
export async function removeFileSafe(storedFilename) {
  try {
    const filePath = resolveSafePath(storedFilename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.warn(`[Storage] Could not delete file ${storedFilename}:`, err.message);
  }
}
