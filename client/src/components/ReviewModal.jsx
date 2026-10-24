import React, { useState } from 'react';
import {
  X,
  Check,
  Sparkles,
  FileText,
  Tag,
  Folder,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ALLOWED_CATEGORIES = [
  'Invoices & Receipts',
  'Contracts & Legal',
  'Research & Notes',
  'Tech & Code',
  'Identity & Personal',
  'Financial & Tax',
  'Work & Operations',
  'General & Other'
];

export default function ReviewModal({
  doc,
  onClose,
  onUpdate,
  onAnalyze,
  isAnalyzing
}) {
  if (!doc) return null;

  const [category, setCategory] = useState(doc.category || 'General & Other');
  const [customName, setCustomName] = useState(doc.originalFilename || '');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAcceptSuggested = async () => {
    setIsSaving(true);
    try {
      await onUpdate(doc._id, {
        acceptSuggestedName: true,
        category,
        reviewStatus: 'accepted'
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeepOriginal = async () => {
    setIsSaving(true);
    try {
      await onUpdate(doc._id, {
        customFilename: customName,
        category,
        reviewStatus: 'accepted'
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    setIsSaving(true);
    try {
      await onUpdate(doc._id, {
        reviewStatus: 'rejected'
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Review AI Suggestions</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Verify and approve AI-generated metadata before updating records
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Filename Comparison */}
        <div className="review-section">
          <div className="review-section-title">Filename Comparison</div>
          <div className="review-name-compare">
            <div className="compare-row">
              <span className="compare-label">Current Filename:</span>
              <span className="compare-val" style={{ color: '#94a3b8' }}>
                {doc.originalFilename}
              </span>
            </div>

            {doc.suggestedFilename && (
              <div className="compare-row" style={{ marginTop: '0.5rem' }}>
                <span className="compare-label" style={{ color: '#a5b4fc', fontWeight: 600 }}>
                  AI Suggested Name:
                </span>
                <span className="compare-val" style={{ color: '#38bdf8', fontWeight: 600 }}>
                  {doc.suggestedFilename}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Custom Filename Edit */}
        <div className="review-section">
          <label className="review-section-title" htmlFor="custom-filename">
            Custom Filename (Optional)
          </label>
          <input
            id="custom-filename"
            type="text"
            className="search-input"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            style={{ width: '100%', marginTop: '0.35rem' }}
          />
        </div>

        {/* AI Summary */}
        <div className="review-section">
          <div className="review-section-title">Document Summary</div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.92rem',
              lineHeight: 1.6
            }}
          >
            {doc.summary || 'No summary generated yet.'}
          </div>
        </div>

        {/* Category & Tags Selection */}
        <div className="review-section">
          <div className="review-section-title">Category Assignment</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              background: 'var(--bg-card)',
              color: '#fff',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem'
            }}
          >
            {ALLOWED_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} style={{ background: '#111624' }}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="review-section">
            <div className="review-section-title">Extracted Tags</div>
            <div className="doc-tags-row">
              {doc.tags.map((tag, idx) => (
                <span key={idx} className="tag-pill" style={{ fontSize: '0.8rem' }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Extracted Raw Text */}
        <div className="review-section">
          <button
            className="btn-secondary"
            onClick={() => setShowExtractedText(!showExtractedText)}
            style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.82rem' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={15} />
              Extracted Raw Text ({doc.extractedLength || 0} characters)
            </span>
            {showExtractedText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showExtractedText && (
            <div className="extracted-text-box" style={{ marginTop: '0.5rem' }}>
              {doc.extractedText || 'No text extracted.'}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          {/* Re-analyze with Local Ollama */}
          <button
            className="btn-secondary"
            onClick={() => onAnalyze(doc._id)}
            disabled={isAnalyzing}
            title="Re-run Local AI model on document"
          >
            {isAnalyzing ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Sparkles size={16} color="#6366f1" />
            )}
            Re-analyze
          </button>

          {/* Reject */}
          <button
            className="btn-secondary"
            onClick={handleReject}
            disabled={isSaving}
          >
            Reject
          </button>

          {/* Accept Suggested Filename */}
          {doc.suggestedFilename && (
            <button
              className="btn-primary"
              onClick={handleAcceptSuggested}
              disabled={isSaving}
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              <Check size={16} />
              Accept Suggested Name
            </button>
          )}

          {/* Save / Keep Name */}
          <button
            className="btn-primary"
            onClick={handleKeepOriginal}
            disabled={isSaving}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
