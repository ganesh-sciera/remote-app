/**
 * Standalone wrapper — used only when running this repo without the shell.
 * Simulates the props the shell would inject so you can develop independently.
 */
import React from 'react';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import './styles/analytics.css';

export default function App() {
  // Simulate shell-provided props for local dev
  const token = localStorage.getItem('token') || '';
  const user  = { name: 'Dev User', role: 'admin' };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="standalone-banner">
          ⚡ Standalone mode — running without the shell host.
          Paste a valid JWT into <code>localStorage.token</code> and refresh to load live data.
        </div>
        <AnalyticsDashboard
          token={token}
          user={user}
          apiBase="http://localhost:3001"
        />
      </div>
    </div>
  );
}
