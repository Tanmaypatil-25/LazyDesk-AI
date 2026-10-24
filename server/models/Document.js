import mongoose from 'mongoose';
import { ALLOWED_CATEGORIES, DEFAULT_CATEGORY, REVIEW_STATUSES } from '../config/constants.js';

const documentSchema = new mongoose.Schema(
  {
    originalFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    storedFilename: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    suggestedFilename: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0
    },
    mimeType: {
      type: String,
      required: true
    },
    extractedText: {
      type: String,
      default: ''
    },
    extractedLength: {
      type: Number,
      default: 0
    },
    summary: {
      type: String,
      default: 'Awaiting AI analysis'
    },
    category: {
      type: String,
      enum: ALLOWED_CATEGORIES,
      default: DEFAULT_CATEGORY
    },
    tags: {
      type: [String],
      default: []
    },
    reviewStatus: {
      type: String,
      enum: Object.values(REVIEW_STATUSES),
      default: REVIEW_STATUSES.PENDING
    },
    analyzedAt: {
      type: Date,
      default: null
    },
    modelUsed: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast searching and filtering
documentSchema.index({ originalFilename: 'text', summary: 'text', tags: 'text' });
documentSchema.index({ category: 1, createdAt: -1 });

export const DocumentModel = mongoose.model('Document', documentSchema);
