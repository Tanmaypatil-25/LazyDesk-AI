/**
 * Application Constants and Security Guardrails for LazyDesk AI
 */

export const ALLOWED_CATEGORIES = [
  'Invoices & Receipts',
  'Contracts & Legal',
  'Research & Notes',
  'Tech & Code',
  'Identity & Personal',
  'Financial & Tax',
  'Work & Operations',
  'General & Other'
];

export const DEFAULT_CATEGORY = 'General & Other';

export const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/pdf'
];

export const ALLOWED_EXTENSIONS = ['.txt', '.pdf'];

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '10485760', 10); // 10MB
export const MAX_TEXT_EXTRACT_CHARS = parseInt(process.env.MAX_TEXT_EXTRACT_CHARS || '8000', 10); // Context window safety

export const REVIEW_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};
