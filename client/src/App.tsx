import { useState, useRef } from 'react';
import './App.css';
import type { AppState, PresentationData } from './types';
import Overview from './pages/Overview';
import Directory from './pages/Directory';
import DrilldownList from './pages/DrilldownList';
import ScanTargetSelection from './components/ScanTargetSelection';

const API_URL = 'http://localhost:3000';
const SNAPSHOT_PATH = '~/.local/share/dscope/snapshots/';

function App() {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    data: null,
    path: '',
    error: null,
  });

  const [targetSelected, setTargetSelected] = useState(false);
  const [scanScope, setScanScope] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'directory'>('overview');
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleTargetSelect = async (pathStr: string, type: 'home' | 'system' | 'device') => {
    setScanScope(type === 'home' ? 'Home Directory' : type === 'system' ? 'Entire System' : 'External Device');
    setTargetSelected(true);

    // Set path immediately for UI feedback if needed
    setState(prev => ({ ...prev, path: pathStr }));

    if (type === 'system') {
      // Allow UI to update before blocking
      await new Promise(r => setTimeout(r, 100));

      try {
        // @ts-ignore
        await window.api?.restartBackend(true);
        // Wait for backend to come up
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.error("Failed to restart backend", err);
        // Proceed anyway, might fail later or backend didn't die
      }
    }

    triggerScan(pathStr);
  };

  const triggerScan = async (pathStr: string) => {
    setState(prev => ({ ...prev, path: pathStr, status: 'scanning', error: null, data: null }));

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/present`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathStr }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 499) throw new Error('Scan cancelled');
        const errData = await response.json();
        throw new Error(errData.error || 'Scan failed');
      }

      const result: PresentationData = await response.json();
      setState(prev => ({ ...prev, status: 'success', data: result }));
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'Scan cancelled') {
        setState(prev => ({ ...prev, status: 'cancelled' }));
      } else {
        setState(prev => ({ ...prev, status: 'error', error: err.message }));
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleManualScan = () => {
    if (state.path) triggerScan(state.path);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState(prev => ({ ...prev, status: 'cancelled' }));
    }
  };

  const handleReset = () => {
    setTargetSelected(false);
    setState(prev => ({ ...prev, status: 'idle', data: null, error: null }));
  };

  // DRILL DOWN Logic (stays in Overview mode)
  const handleCategoryClick = (categoryId: string) => {
    setDrilldownCategory(categoryId);
  };

  const handleBackToOverview = () => {
    setDrilldownCategory(null);
  };

  const handleViewToggle = (mode: 'overview' | 'directory') => {
    setViewMode(mode);
    if (mode === 'directory') setDrilldownCategory(null);
  };

  return (
    <div className="container">
      {/* Target Selection Modal */}
      {!targetSelected && (
        <ScanTargetSelection onSelect={handleTargetSelect} />
      )}

      {/* Header */}
      <header className="header">
        <div className="logo" style={{ cursor: 'pointer' }} onClick={handleReset} title="Return to start">
          <div className="logo-icon">💿</div>
          <div className="logo-text">
            <h1>DScope Intelligence</h1>
            <p>Linux Disk Space Visualization Tool</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="scan-controls">
            <input
              type="text"
              placeholder="Path to scan"
              value={state.path}
              onChange={(e) => setState(prev => ({ ...prev, path: e.target.value }))}
              disabled={state.status === 'scanning'}
            />
            {state.status === 'scanning' ? (
              <button onClick={handleCancel} className="btn btn-danger">
                ✕ Cancel
              </button>
            ) : (
              <button
                onClick={handleManualScan}
                disabled={!state.path}
                className="btn btn-primary"
              >
                🔄 Scan
              </button>
            )}
            <button key="new" onClick={handleReset} className="btn btn-outline" title="New Scan">
              New
            </button>
          </div>
        </div>
      </header>

      {/* Scope Info */}
      {targetSelected && scanScope && (
        <div style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--gray)', fontSize: '14px' }}>
          Scan Scope: <strong>{scanScope}</strong> &nbsp;•&nbsp; Path: {state.path}
        </div>
      )}

      {/* Status Messages */}
      {(state.status === 'scanning' || state.status === 'cancelled' || state.status === 'error') && (
        <div className="status-area">
          {state.status === 'scanning' && <p className="scanning">Analyzing disk usage...</p>}
          {state.status === 'cancelled' && <p className="cancelled">Scan cancelled</p>}
          {state.status === 'error' && <p className="error">Error: {state.error}</p>}
        </div>
      )}

      {/* Main Content */}
      {state.status === 'success' && state.data && (
        <>
          {/* View Toggle */}
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'overview' ? 'active' : ''}`}
              onClick={() => handleViewToggle('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`toggle-btn ${viewMode === 'directory' ? 'active' : ''}`}
              onClick={() => handleViewToggle('directory')}
            >
              📁 Directory
            </button>
          </div>

          {/* Views */}
          {viewMode === 'overview' ? (
            drilldownCategory ? (
              <DrilldownList
                category={state.data.overview.categories.find(c => c.id === drilldownCategory)!}
                onBack={handleBackToOverview}
              />
            ) : (
              <Overview
                categories={state.data.overview.categories}
                onCategoryClick={handleCategoryClick}
              />
            )
          ) : (
            <Directory root={state.data.directory.root} />
          )}
        </>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>DScope Intelligence v1.0 | Designed for Linux Systems</p>

        <div style={{ marginTop: '15px', fontSize: '13px', color: '#6c757d' }}>
          <p>
            <strong>Last snapshot:</strong> {state.data?.overview.lastSnapshot
              ? new Date(state.data.overview.lastSnapshot).toLocaleString()
              : 'Not available'}
          </p>
          <p style={{ marginTop: '5px', opacity: 0.8, fontFamily: 'monospace' }}>
            Storage: {SNAPSHOT_PATH}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
