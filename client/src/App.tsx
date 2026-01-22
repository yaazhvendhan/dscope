import { useState, useRef, useEffect } from 'react';
import './App.css';
import type { AppState, PresentationData } from './types';
import Overview from './pages/Overview';
import Directory from './pages/Directory';
import DrilldownList from './pages/DrilldownList';

const API_URL = 'http://localhost:3000';

function App() {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    data: null,
    path: '',
    error: null,
  });

  const [viewMode, setViewMode] = useState<'overview' | 'directory'>('overview');
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Default Auto-Scan
  useEffect(() => {
    const init = async () => {
      // @ts-ignore - exposed by preload
      const homeDir = await window.api?.getHomeDir();
      if (homeDir) {
        triggerScan(homeDir);
      }
    };
    init();
  }, []);

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

  // DRILL DOWN Logic (stays in Overview mode)
  const handleCategoryClick = (categoryId: string) => {
    setDrilldownCategory(categoryId);
  };

  const handleBackToOverview = () => {
    setDrilldownCategory(null);
  };

  const handleViewToggle = (mode: 'overview' | 'directory') => {
    setViewMode(mode);
    // Clear drilldown when switching modes
    if (mode === 'directory') setDrilldownCategory(null);
  };

  return (
    <div className="container">
      <h1>DScope Intelligence</h1>

      <div className="scan-controls">
        <input
          type="text"
          placeholder="/path/to/scan (optional, auto-scans HOME)"
          value={state.path}
          onChange={(e) => setState(prev => ({ ...prev, path: e.target.value }))}
          disabled={state.status === 'scanning'}
        />

        {state.status === 'scanning' ? (
          <button onClick={handleCancel} className="cancel-btn">Cancel</button>
        ) : (
          <button onClick={handleManualScan} disabled={!state.path}>Analyze</button>
        )}
      </div>

      <div className="status-area">
        {state.status === 'scanning' && <p className="scanning">Analyzing disk usage...</p>}
        {state.status === 'cancelled' && <p className="cancelled">Scan cancelled</p>}
        {state.status === 'error' && <p className="error">Error: {state.error}</p>}
      </div>

      {state.status === 'success' && state.data && (
        <div className="results-container">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'overview' ? 'active' : ''}`}
              onClick={() => handleViewToggle('overview')}
            >
              Overview
            </button>
            <button
              className={`toggle-btn ${viewMode === 'directory' ? 'active' : ''}`}
              onClick={() => handleViewToggle('directory')}
            >
              Directory
            </button>
          </div>

          <div className="view-content">
            {viewMode === 'overview' ? (
              // Overview mode: show either category cards or drilldown list
              drilldownCategory ? (
                <DrilldownList
                  root={state.data.directory.root}
                  categoryId={drilldownCategory}
                  onBack={handleBackToOverview}
                />
              ) : (
                <Overview
                  categories={state.data.overview.categories}
                  onCategoryClick={handleCategoryClick}
                />
              )
            ) : (
              // Directory mode: show file explorer (no filtering)
              <Directory root={state.data.directory.root} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
