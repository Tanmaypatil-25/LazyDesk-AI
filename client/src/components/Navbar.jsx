import React from 'react';
import { Database, Cpu, RefreshCw } from 'lucide-react';

export default function Navbar({ health, onRefresh, isRefreshing }) {
  const mongoConnected = health?.services?.mongodb?.connected;
  const ollamaConnected = health?.services?.ollama?.connected;
  const targetModel = health?.services?.ollama?.targetModel || 'gemma3:1b';
  const hasModel = health?.services?.ollama?.isTargetModelAvailable;

  return (
    <nav className="navbar">
      <div className="brand">
        <div className="brand-icon">🦥</div>
        <div>
          <div className="brand-title">LazyDesk AI</div>
          <div className="brand-subtitle">
            <span>Hacktoberfest 2026 Week 3</span>
            <span>•</span>
            <span>Slow and Steady</span>
          </div>
        </div>
      </div>

      <div className="service-pills">
        {/* MongoDB Status */}
        <div className="service-pill" title={mongoConnected ? 'MongoDB connected and active' : 'MongoDB offline'}>
          <Database size={15} color={mongoConnected ? '#10b981' : '#f43f5e'} />
          <span>MongoDB:</span>
          <span className={`dot ${mongoConnected ? 'online' : 'offline'}`} />
          <span style={{ color: mongoConnected ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
            {mongoConnected ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Ollama Local AI Status */}
        <div
          className="service-pill"
          title={
            ollamaConnected
              ? `Ollama connected (${hasModel ? targetModel : 'Model missing'})`
              : 'Ollama service is not reachable on localhost:11434'
          }
        >
          <Cpu size={15} color={ollamaConnected ? '#6366f1' : '#f43f5e'} />
          <span>Local AI ({targetModel}):</span>
          <span className={`dot ${ollamaConnected ? 'online' : 'offline'}`} />
          <span style={{ color: ollamaConnected ? '#a5b4fc' : '#f43f5e', fontWeight: 600 }}>
            {ollamaConnected ? (hasModel ? 'Ready' : 'Pull Model') : 'Disconnected'}
          </span>
        </div>

        {/* Refresh health & docs */}
        <button
          onClick={onRefresh}
          className="btn-icon"
          title="Refresh Services & Data"
          disabled={isRefreshing}
        >
          <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
        </button>
      </div>
    </nav>
  );
}
