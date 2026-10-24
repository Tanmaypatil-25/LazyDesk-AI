import React from 'react';
import {
  FileText,
  FileCode,
  Sparkles,
  CheckCircle2,
  Trash2,
  Download,
  Eye,
  Loader2
} from 'lucide-react';

export default function DocumentCard({
  doc,
  onOpenReview,
  onAnalyze,
  onDelete,
  isAnalyzing
}) {
  const isPdf = doc.mimeType === 'application/pdf';
  const hasAnalysis = Boolean(doc.analyzedAt);

  const formattedDate = new Date(doc.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const formattedSize = (doc.fileSize / 1024).toFixed(1) + ' KB';

  return (
    <div className="doc-card">
      <div>
        {/* Header */}
        <div className="doc-card-header">
          <div className="doc-meta">
            <div className={`doc-type-icon ${isPdf ? 'pdf' : 'txt'}`}>
              {isPdf ? <FileCode size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <div className="doc-title" title={doc.originalFilename}>
                {doc.originalFilename}
              </div>
              <div className="doc-date">
                {formattedDate} • {formattedSize}
              </div>
            </div>
          </div>

          <span className={`status-badge ${doc.reviewStatus}`}>
            {doc.reviewStatus}
          </span>
        </div>

        {/* AI Summary */}
        <p className="doc-summary" title={doc.summary}>
          {doc.summary || 'Awaiting AI analysis. Click "Analyze" below.'}
        </p>

        {/* Suggested Filename Preview */}
        {doc.suggestedFilename && (
          <div className="suggested-name-box">
            <div className="suggested-label">Suggested Filename:</div>
            <div className="suggested-value">{doc.suggestedFilename}</div>
          </div>
        )}

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="doc-tags-row">
            {doc.tags.map((tag, idx) => (
              <span key={idx} className="tag-pill">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div className="doc-card-footer">
        <span className="category-tag">{doc.category || 'Uncategorized'}</span>

        <div className="doc-actions">
          {/* Analyze / Re-analyze */}
          <button
            className="btn-icon"
            onClick={() => onAnalyze(doc._id)}
            title={hasAnalysis ? 'Re-analyze with Local AI' : 'Analyze with Local AI'}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Sparkles size={16} color="#6366f1" />
            )}
          </button>

          {/* Open Review Modal */}
          <button
            className="btn-icon"
            onClick={() => onOpenReview(doc)}
            title="Review & Accept AI Suggestions"
          >
            <Eye size={16} />
          </button>

          {/* Download Original File */}
          <a
            href={`/api/documents/${doc._id}/download`}
            className="btn-icon"
            title="Download Document"
            download
          >
            <Download size={16} />
          </a>

          {/* Delete Document */}
          <button
            className="btn-icon danger"
            onClick={() => onDelete(doc._id, doc.originalFilename)}
            title="Delete Document"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
