import { useState, useRef } from 'react';
import './App.css';
import type { AppState, PresentationData } from './types';
import Overview from './pages/Overview';

const API_URL = 'http://localhost:3000';

function App() {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    data: null,
    path: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleScan = async () => {
    if (!state.path) return;

    // cleanup previous controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState(prev => ({ ...prev, status: 'scanning', error: null, data: null }));

    try {
      const response = await fetch(`${API_URL}/present`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: state.path }),
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

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState(prev => ({ ...prev, status: 'cancelled' }));
    }
  };

  return (
    <div className="container">
      <h1>DScope Intelligence</h1>

      <div className="scan-controls">
        <input
          type="text"
          placeholder="/path/to/scan"
          value={state.path}
          onChange={(e) => setState(prev => ({ ...prev, path: e.target.value }))}
          disabled={state.status === 'scanning'}
        />

        {state.status === 'scanning' ? (
          <button onClick={handleCancel} className="cancel-btn">Cancel</button>
        ) : (
          <button onClick={handleScan} disabled={!state.path}>Analyze</button>
        )}
      </div>

      <div className="status-area">
        {state.status === 'scanning' && <p className="scanning">Analyzing disk usage...</p>}
        {state.status === 'cancelled' && <p className="cancelled">Scan cancelled</p>}
        {state.status === 'error' && <p className="error">Error: {state.error}</p>}
      </div>

      {state.status === 'success' && state.data && (
        <div className="results-area">
          {/* Render Overview Mode by default */}
          <Overview categories={state.data.overview.categories} />
        </div>
      )}
    </div>
  );
}

export default App;
