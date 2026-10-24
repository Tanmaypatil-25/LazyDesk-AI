import React from 'react';
import { Files, Sparkles, Clock, FolderCheck } from 'lucide-react';

export default function StatsCards({ stats }) {
  const total = stats?.total || 0;
  const analyzed = stats?.analyzed || 0;
  const pending = stats?.pendingReview || 0;
  const accepted = stats?.accepted || 0;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">
          <Files size={24} />
        </div>
        <div>
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Documents</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon emerald">
          <Sparkles size={24} />
        </div>
        <div>
          <div className="stat-value">{analyzed}</div>
          <div className="stat-label">AI Analyzed</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon amber">
          <Clock size={24} />
        </div>
        <div>
          <div className="stat-value">{pending}</div>
          <div className="stat-label">Pending Review</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon cyan">
          <FolderCheck size={24} />
        </div>
        <div>
          <div className="stat-value">{accepted}</div>
          <div className="stat-label">Reviewed & Renamed</div>
        </div>
      </div>
    </div>
  );
}
