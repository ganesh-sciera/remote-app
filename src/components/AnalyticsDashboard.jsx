/**
 * AnalyticsDashboard — the primary component exposed by the Analytics remote.
 *
 * Props injected by the shell at runtime:
 *   token   {string}  JWT bearer token (from shell's AuthContext)
 *   user    {object}  Current user object from the shell
 *   apiBase {string}  Shared API base URL (e.g. "http://localhost:3001")
 *
 * This component is self-contained: it owns its fetch logic, loading/error
 * states, and scoped styles — no dependency on the shell's context or store.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import eventBus from '../utils/eventBus';
import '../styles/analytics.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
function colourFor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, colour }) {
  return (
    <div className="mf-stat-card">
      <div className="mf-stat-label">{label}</div>
      <div className="mf-stat-value" style={{ color: colour }}>{value}</div>
      {sub && <div className="mf-stat-sub">{sub}</div>}
    </div>
  );
}

function RoleBar({ admins, regular, total }) {
  if (!total) return null;
  const adminPct = Math.round((admins / total) * 100);
  return (
    <div className="mf-card">
      <h2>Role distribution</h2>
      <div className="mf-dist-bar">
        <div className="mf-dist-segment" style={{ width: `${adminPct}%`, background: '#6366f1' }} />
        <div className="mf-dist-segment" style={{ width: `${100 - adminPct}%`, background: '#1e3a5f' }} />
      </div>
      <div className="mf-dist-legend">
        <div className="mf-dist-legend-item">
          <div className="mf-dist-dot" style={{ background: '#6366f1' }} />
          Admins — {admins} ({adminPct}%)
        </div>
        <div className="mf-dist-legend-item">
          <div className="mf-dist-dot" style={{ background: '#1e3a5f', border: '1px solid #334155' }} />
          Users — {regular} ({100 - adminPct}%)
        </div>
      </div>
    </div>
  );
}

function RecentTable({ users }) {
  return (
    <div className="mf-card">
      <h2>Recently registered</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="mf-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <div className="mf-avatar" style={{ background: colourFor(u.name) }}>
                      {initials(u.name)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ color: '#94a3b8' }}>{u.email}</td>
                <td><span className={`mf-role-badge mf-role-${u.role}`}>{u.role}</span></td>
                <td style={{ color: '#64748b', fontSize: '.8rem' }}>{fmtDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FederationInfo({ user, token, apiBase }) {
  return (
    <div style={{
      background: 'rgba(99,102,241,.05)',
      border: '1px solid rgba(99,102,241,.15)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#6366f1', marginBottom: '.85rem' }}>
        Module Federation context
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '.75rem' }}>
        {[
          ['Shell user',       user?.name || '—'],
          ['Shell role',       user?.role || '—'],
          ['Auth token',       token ? `${token.slice(0, 14)}…` : 'none'],
          ['API base',         apiBase || 'relative'],
          ['Remote name',      'analyticsApp'],
          ['Entry file',       '/assets/remoteEntry.js'],
          ['Shared: react',    'singleton ✓'],
          ['Shared: react-dom','singleton ✓'],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: '.7rem', color: '#475569', fontWeight: 600, marginBottom: '.15rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k}</div>
            <div style={{ fontSize: '.82rem', color: '#cbd5e1', fontFamily: 'monospace', wordBreak: 'break-all' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ token = '', user = null, apiBase = '' }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [ts,      setTs]      = useState(null);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('No auth token provided by shell.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/users?limit=100&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) throw new Error('Admin access required to view analytics.');
      if (res.status === 401) throw new Error('Session expired — please log in again.');
      if (!res.ok)            throw new Error(`API responded with ${res.status}`);

      const json = await res.json();
      const all  = json.users ?? [];
      const admins  = all.filter(u => u.role === 'admin').length;
      const regular = all.length - admins;
      const recent  = [...all]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      setData({ total: json.pagination?.total ?? all.length, admins, regular, recent });
      setTs(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, apiBase]);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Listen for shell events requesting a refresh
  useEffect(() => {
    const unsub = eventBus.on('analytics:refresh', () => fetchData());
    return unsub;
  }, [fetchData]);

  return (
    <div className="mf-analytics">
      {/* ── Header ── */}
      <div className="mf-header">
        <div>
          <h1>Analytics</h1>
          <p>Live user data — served independently by the Analytics micro-frontend</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          {ts && <span style={{ fontSize: '.78rem', color: '#475569' }}>Updated {ts.toLocaleTimeString()}</span>}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)',
              color: '#818cf8', borderRadius: 8, padding: '.4rem .9rem',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '.85rem', fontWeight: 600,
              opacity: loading ? .55 : 1, fontFamily: 'inherit', transition: 'opacity .2s',
            }}
          >
            ↻ Refresh
          </button>
          <div className="mf-badge-remote">Micro-Frontend</div>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem', gap: '1rem' }}>
          <div className="mf-spinner" />
          <span style={{ color: '#64748b', fontSize: '.9rem' }}>Loading analytics…</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="mf-error">
          <div style={{ fontSize: '1.75rem', marginBottom: '.5rem' }}>⚠️</div>
          <div style={{ fontWeight: 700, marginBottom: '.35rem' }}>Failed to load analytics</div>
          <div style={{ fontSize: '.875rem', opacity: .8 }}>{error}</div>
          <button onClick={fetchData} style={{ marginTop: '1rem', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', padding: '.4rem 1rem', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 600 }}>
            Try again
          </button>
        </div>
      )}

      {/* ── Data ── */}
      {data && !error && (
        <>
          <div className="mf-stat-grid">
            <StatCard label="Total Users's"   value={data.total}   sub="All registered accounts"    colour="#6366f1" />
            <StatCard label="Admins"        value={data.admins}  sub="With admin privileges"      colour="#8b5cf6" />
            <StatCard label="Regular Users" value={data.regular} sub="Standard accounts"          colour="#10b981" />
            <StatCard
              label="Admin Ratio"
              value={data.total > 0 ? `${Math.round((data.admins / data.total) * 100)}%` : '—'}
              sub="Of all accounts"
              colour="#f59e0b"
            />
          </div>

          <RoleBar admins={data.admins} regular={data.regular} total={data.total} />
          <RecentTable users={data.recent} />
          <FederationInfo user={user} token={token} apiBase={apiBase} />
        </>
      )}
    </div>
  );
}
