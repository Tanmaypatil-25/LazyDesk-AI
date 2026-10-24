import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { DocumentModel } from '../models/Document.js';
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  ALLOWED_CATEGORIES,
  REVIEW_STATUSES
} from '../config/constants.js';
import {
  generateSafeStorageName,
  resolveSafePath,
  removeFileSafe,
  sanitizeFilename
} from '../services/storage.service.js';
import {
  validateFileHeader,
  extractDocumentText
} from '../services/extractor.service.js';
import { analyzeWithOllama } from '../services/ollama.service.js';

const router = express.Router();

// Configure multer with memory storage so we can validate headers and extract text before writing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(`Unsupported file type '${ext}'. Only .pdf and .txt files are allowed.`)
      );
    }
    cb(null, true);
  }
});

// Helper to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Middleware to ensure database is ready
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'MongoDB is currently disconnected. Please verify MongoDB is running on port 27017.'
    });
  }
  next();
};

// Safe multer wrapper to convert fileFilter or size limit errors into clean 400 responses
const safeUploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: `The uploaded file exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB size limit.`
        });
      }
      return res.status(400).json({
        error: 'Upload validation failed',
        message: err.message
      });
    }
    next();
  });
};

/**
 * POST /api/documents/upload
 * Upload document, extract text, and persist
 */
router.post('/upload', checkDbConnection, safeUploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a PDF or TXT file.' });
    }

    const { originalname, mimetype, buffer, size } = req.file;

    // Detect file type and validate magic bytes
    const ext = path.extname(originalname).toLowerCase();
    const effectiveMime = ext === '.pdf' ? 'application/pdf' : 'text/plain';

    if (!validateFileHeader(buffer, effectiveMime)) {
      return res.status(400).json({
        error: 'Invalid file content',
        message: 'File content does not match the expected format or contains forbidden binary sequences.'
      });
    }

    // Extract text safely
    const extraction = await extractDocumentText(buffer, effectiveMime);

    // Save to isolated uploads directory
    const storedFilename = generateSafeStorageName(originalname);
    const destinationPath = resolveSafePath(storedFilename);
    await fs.promises.writeFile(destinationPath, buffer);

    // Create document in MongoDB
    const doc = await DocumentModel.create({
      originalFilename: originalname,
      storedFilename,
      fileSize: size,
      mimeType: effectiveMime,
      extractedText: extraction.text,
      extractedLength: extraction.length,
      summary: 'Awaiting AI analysis',
      category: 'General & Other',
      tags: [],
      reviewStatus: REVIEW_STATUSES.PENDING
    });

    res.status(201).json({
      message: 'Document uploaded and text extracted successfully',
      document: doc,
      extractedPreview: extraction.text.slice(0, 300),
      isTruncated: extraction.truncated
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({
      error: 'Upload failed',
      message: err.message
    });
  }
});

/**
 * POST /api/documents/:id/analyze
 * Trigger Ollama local AI analysis for an extracted document
 */
router.post('/:id/analyze', checkDbConnection, async (req, res) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!doc.extractedText || doc.extractedText.trim().length === 0) {
      return res.status(400).json({
        error: 'No extracted text available for AI analysis.'
      });
    }

    const analysis = await analyzeWithOllama(doc.originalFilename, doc.extractedText);

    doc.summary = analysis.summary;
    doc.category = analysis.category;
    doc.tags = analysis.tags;
    doc.suggestedFilename = analysis.suggestedFilename;
    doc.analyzedAt = analysis.analyzedAt;
    doc.modelUsed = analysis.modelUsed;
    doc.reviewStatus = REVIEW_STATUSES.PENDING;

    await doc.save();

    res.json({
      message: 'AI analysis completed successfully',
      document: doc
    });
  } catch (err) {
    console.error('[Analysis Error]', err);
    // If Ollama is disconnected or model missing, return 503
    const isServiceDown = err.message.includes('not connected') || err.message.includes('ECONNREFUSED');
    res.status(isServiceDown ? 503 : 500).json({
      error: 'AI analysis failed',
      message: err.message
    });
  }
});

/**
 * GET /api/documents/stats
 * Aggregate dashboard statistics
 */
router.get('/stats', checkDbConnection, async (req, res) => {
  try {
    const totalCount = await DocumentModel.countDocuments();
    const pendingReviewCount = await DocumentModel.countDocuments({
      reviewStatus: REVIEW_STATUSES.PENDING
    });
    const acceptedCount = await DocumentModel.countDocuments({
      reviewStatus: REVIEW_STATUSES.ACCEPTED
    });
    const analyzedCount = await DocumentModel.countDocuments({
      analyzedAt: { $ne: null }
    });

    // Breakdown by category
    const categoryStats = await DocumentModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Breakdown by mime type
    const mimeStats = await DocumentModel.aggregate([
      { $group: { _id: '$mimeType', count: { $sum: 1 } } }
    ]);

    res.json({
      total: totalCount,
      analyzed: analyzedCount,
      pendingReview: pendingReviewCount,
      accepted: acceptedCount,
      byCategory: categoryStats.map(c => ({ category: c._id || 'Unassigned', count: c.count })),
      byType: mimeStats.map(m => ({ type: m._id, count: m.count }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch statistics', message: err.message });
  }
});

/**
 * GET /api/documents
 * List documents with searching and filtering
 */
router.get('/', checkDbConnection, async (req, res) => {
  try {
    const { q, category, status, sort = 'createdAt', order = 'desc' } = req.query;

    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (status && Object.values(REVIEW_STATUSES).includes(status)) {
      filter.reviewStatus = status;
    }

    if (q && q.trim().length > 0) {
      const escapedTerm = escapeRegex(q.trim());
      filter.$or = [
        { originalFilename: { $regex: escapedTerm, $options: 'i' } },
        { suggestedFilename: { $regex: escapedTerm, $options: 'i' } },
        { summary: { $regex: escapedTerm, $options: 'i' } },
        { tags: { $regex: escapedTerm, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    const documents = await DocumentModel.find(filter)
      .sort(sortOptions)
      .limit(100);

    res.json({
      count: documents.length,
      documents
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve documents', message: err.message });
  }
});

/**
 * GET /api/documents/:id
 * Retrieve single document details
 */
router.get('/:id', checkDbConnection, async (req, res) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document', message: err.message });
  }
});

/**
 * PATCH /api/documents/:id
 * Update review status, accept suggested filename, or edit category & tags
 */
router.patch('/:id', checkDbConnection, async (req, res) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { reviewStatus, acceptSuggestedName, customFilename, category, tags } = req.body;

    if (reviewStatus && Object.values(REVIEW_STATUSES).includes(reviewStatus)) {
      doc.reviewStatus = reviewStatus;
    }

    if (acceptSuggestedName && doc.suggestedFilename) {
      doc.originalFilename = doc.suggestedFilename;
      doc.reviewStatus = REVIEW_STATUSES.ACCEPTED;
    } else if (customFilename && typeof customFilename === 'string') {
      const ext = path.extname(doc.originalFilename);
      doc.originalFilename = sanitizeFilename(customFilename, ext);
      doc.reviewStatus = REVIEW_STATUSES.ACCEPTED;
    }

    if (category && ALLOWED_CATEGORIES.includes(category)) {
      doc.category = category;
    }

    if (Array.isArray(tags)) {
      doc.tags = tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
    }

    await doc.save();

    res.json({
      message: 'Document updated successfully',
      document: doc
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document', message: err.message });
  }
});

/**
 * GET /api/documents/:id/download
 * Download the stored document safely
 */
router.get('/:id/download', checkDbConnection, async (req, res) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const safePath = resolveSafePath(doc.storedFilename);
    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'Physical file not found on disk' });
    }

    res.download(safePath, doc.originalFilename);
  } catch (err) {
    res.status(500).json({ error: 'Download failed', message: err.message });
  }
});

/**
 * DELETE /api/documents/:id
 * Remove document record and file
 */
router.delete('/:id', checkDbConnection, async (req, res) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove file safely from disk
    await removeFileSafe(doc.storedFilename);

    // Delete record from MongoDB
    await DocumentModel.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document', message: err.message });
  }
});

export default router;
