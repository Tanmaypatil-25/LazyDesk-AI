import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter
} from 'lucide-react';

import Navbar from './components/Navbar.jsx';
import StatsCards from './components/StatsCards.jsx';
import UploadZone from './components/UploadZone.jsx';
import DocumentCard from './components/DocumentCard.jsx';
import ReviewModal from './components/ReviewModal.jsx';

const CATEGORIES = [
  'All',
  'Invoices & Receipts',
  'Contracts & Legal',
  'Research & Notes',
  'Tech & Code',
  'Identity & Personal',
  'Financial & Tax',
  'Work & Operations',
  'General & Other'
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReviewDoc, setActiveReviewDoc] = useState(null);
  const [analyzingDocId, setAnalyzingDocId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch health status
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.warn('Could not fetch health status', err);
    }
  }, []);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Could not fetch stats', err);
    }
  }, []);

  // Fetch documents with filters
  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.warn('Could not fetch documents', err);
    }
  }, [selectedCategory, searchQuery]);

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHealth(), fetchStats(), fetchDocuments()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
  }, [fetchHealth, fetchStats, fetchDocuments]);

  // Handle document upload
  const handleUploadSuccess = (newDoc, message) => {
    showToast(message, 'success');
    fetchStats();
    fetchDocuments();
    // Open review modal immediately for newly uploaded document
    setActiveReviewDoc(newDoc);
  };

  // Trigger Ollama AI analysis
  const handleAnalyze = async (docId) => {
    setAnalyzingDocId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/analyze`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Analysis failed');
      }

      showToast('Document analyzed by local Gemma model!', 'success');
      fetchStats();
      fetchDocuments();

      // If review modal is open for this doc, update it
      if (activeReviewDoc && activeReviewDoc._id === docId) {
        setActiveReviewDoc(data.document);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAnalyzingDocId(null);
    }
  };

  // Update document metadata (review step)
  const handleUpdate = async (docId, updates) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Update failed');
      }

      showToast('Document updated successfully', 'success');
      fetchStats();
      fetchDocuments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete document
  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Delete failed');
      }

      showToast(`Deleted "${filename}"`, 'success');
      fetchStats();
      fetchDocuments();

      if (activeReviewDoc && activeReviewDoc._id === docId) {
        setActiveReviewDoc(null);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isOllamaConnected = health?.services?.ollama?.connected;
  const isMongoConnected = health?.services?.mongodb?.connected;
  const targetModel = health?.services?.ollama?.targetModel || 'gemma3:1b';

  return (
    <div className="app-container">
      {/* Navbar with Live Indicators */}
      <Navbar
        health={health}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
      />

      {/* Hero Header */}
      <header className="hero">
        <div className="hero-text">
          <h1>Effortless Document Organization</h1>
          <p>
            Drop messy invoices, legal papers, notes, or code specs. Your local Gemma
            open-weight model organizes, categorizes, summarizes, and renames them — keeping
            your private files 100% on your device.
          </p>
        </div>
      </header>

      {/* Dependency Warning Banners */}
      {!isMongoConnected && (
        <div className="notice-banner danger">
          <AlertTriangle className="notice-icon" size={22} />
          <div className="notice-content">
            <strong>MongoDB Database Disconnected</strong>
            Please ensure MongoDB is running on port 27017 (`mongodb://127.0.0.1:27017/lazydesk-ai`).
            Document storage and querying require an active database connection.
          </div>
        </div>
      )}

      {!isOllamaConnected && (
        <div className="notice-banner">
          <AlertTriangle className="notice-icon" size={22} />
          <div className="notice-content">
            <strong>Local AI Service (Ollama) Disconnected</strong>
            To run local AI inference, start Ollama and make sure your model is pulled:
            <br />
            <span className="code-snippet">ollama run {targetModel}</span>
            <br />
            LazyDesk AI will automatically detect when Ollama becomes available.
          </div>
        </div>
      )}

      {/* Dashboard Stats */}
      <StatsCards stats={stats} />

      {/* Drag & Drop Upload Zone */}
      <UploadZone
        onUploadSuccess={handleUploadSuccess}
        onError={(err) => showToast(err, 'error')}
      />

      {/* Library Section */}
      <section className="library-section">
        <div className="library-header">
          <h2 className="library-title">
            <FileText size={22} color="#6366f1" />
            Document Library
          </h2>

          <div className="search-input-wrapper">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search by title, summary, or tag..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="category-filter-bar">
          <Filter size={16} color="var(--text-muted)" style={{ marginLeft: '0.25rem' }} />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Documents Grid / Empty State */}
        {documents.length > 0 ? (
          <div className="documents-grid">
            {documents.map((doc) => (
              <DocumentCard
                key={doc._id}
                doc={doc}
                onOpenReview={(d) => setActiveReviewDoc(d)}
                onAnalyze={handleAnalyze}
                onDelete={handleDelete}
                isAnalyzing={analyzingDocId === doc._id}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🦥</div>
            <h3>No documents found</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search terms or category filter.'
                : 'Drag and drop your first PDF or TXT file above to get started!'}
            </p>
          </div>
        )}
      </section>

      {/* Review & Edit Modal */}
      {activeReviewDoc && (
        <ReviewModal
          doc={activeReviewDoc}
          onClose={() => setActiveReviewDoc(null)}
          onUpdate={handleUpdate}
          onAnalyze={handleAnalyze}
          isAnalyzing={analyzingDocId === activeReviewDoc._id}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} color="#10b981" />
          ) : (
            <AlertCircle size={18} color="#f43f5e" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
