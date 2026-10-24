import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';

export default function UploadZone({ onUploadSuccess, onError }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') {
      onError(`Unsupported file type '.${ext}'. Please upload a PDF or TXT document.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('File size exceeds the 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      onUploadSuccess(data.document, `Uploaded "${file.name}" and extracted text!`);
    } catch (err) {
      onError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`upload-card ${isDragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={isUploading}
      />

      <div className="upload-icon-wrapper">
        {isUploading ? (
          <Loader2 size={32} className="spin" />
        ) : (
          <UploadCloud size={32} />
        )}
      </div>

      <h3>
        {isUploading
          ? 'Extracting Document Text...'
          : 'Drop your messy PDFs and TXT files here'}
      </h3>
      <p>
        {isUploading
          ? 'Parsing document contents and validating structure'
          : 'Let local Gemma AI organize, summarize, and rename them so you don’t have to'}
      </p>

      <div className="upload-badges">
        <span className="format-badge">📄 PDF Documents</span>
        <span className="format-badge">📝 Plain Text (TXT)</span>
        <span className="format-badge">🔒 100% Local Inference</span>
      </div>
    </div>
  );
}
