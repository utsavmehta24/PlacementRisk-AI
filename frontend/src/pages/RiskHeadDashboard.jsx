// placeholder

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI, caseAPI } from '../api/client';
import PortfolioHeatmap from '../components/PortfolioHeatmap';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';

const RISK_COLORS = { HIGH: '#E24B4A', MEDIUM: '#EF9F27', LOW: '#1D9E75' };

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-extrabold mt-1" style={color ? { color } : {}}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </div>
  );
}

function SeverityBadge({ s }) {
  const cls = s === 'high' ? 'bg-red-900/60 text-red-300 border-red-700' : s === 'medium' ? 'bg-amber-900/60 text-amber-300 border-amber-700' : 'bg-blue-900/60 text-blue-300 border-blue-700';
  return <span className={`px-2 py-0.5 rounded border text-xs font-semibold uppercase ${cls}`}>{s}</span>;
}

function RiskHeadDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cases, setCases] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, a, c] = await Promise.all([
          portfolioAPI.getStats(),
          portfolioAPI.getAlerts({ limit: 50 }),
          caseAPI.list({ limit: 200 }),
        ]);
        setStats(s.data);
        setAlerts(Array.isArray(a.data) ? a.data : []);
        setCases(Array.isArray(c.data) ? c.data : []);
        try {
          const h = await portfolioAPI.getHeatmap();
          setHeatmap(h.data);
        } catch (_) {
          setHeatmap({ cells: [], total_students: 0, high_risk_percentage: 0 });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  // Derived chart data
  const riskPie = [
    { name: 'High Risk', value: stats?.high_risk_count || 0, color: '#E24B4A' },
    { name: 'Others', value: Math.max(0, (stats?.total_students || 0) - (stats?.high_risk_count || 0)), color: '#334155' },
  ];

  const statusBreakdown = cases.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const statusBar = Object.entries(statusBreakdown).map(([status, count]) => ({ status: status.replace(/_/g, ' '), count })).sort((a, b) => b.count - a.count);

  const courseRisk = (heatmap?.cells || []).reduce((acc, cell) => {
    const key = cell.course_type;
    if (!acc[key]) acc[key] = { course: key, high: 0, medium: 0, low: 0, total: 0 };
    acc[key].high += cell.high_risk_count;
    acc[key].medium += cell.medium_risk_count;
    acc[key].low += cell.low_risk_count;
    acc[key].total += cell.student_count;
    return acc;
  }, {});
  const courseBar = Object.values(courseRisk).sort((a, b) => b.total - a.total);

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'alerts', label: `🚨 Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
    { id: 'heatmap', label: '🗺 Portfolio Heatmap' },
    { id: 'cases', label: '📋 Cases' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-xl tracking-tight">PlacementRisk AI — Risk Head</h1>
            <p className="text-xs text-slate-400 mt-0.5">{user.full_name} · Portfolio Intelligence & Early Warning</p>
          </div>
          <div className="flex gap-2">
            <button onClick={logout} className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded text-xs text-slate-300">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-20 text-slate-400">Loading portfolio data…</div>}

        {/* OVERVIEW */}
        {!loading && activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Borrowers" value={(stats?.total_students || 0).toLocaleString()} icon="👥" />
              <StatCard label="High Risk" value={`${(stats?.high_risk_percentage || 0).toFixed(1)}%`} color="#E24B4A" sub={`${stats?.high_risk_count || 0} students`} icon="⚠️" />
              <StatCard label="Avg Placement (6m)" value={`${((stats?.avg_placement_prob_6mo || 0) * 100).toFixed(0)}%`} color="#60a5fa" icon="📈" />
              <StatCard label="Open Alerts" value={alerts.filter(a => !a.is_resolved).length} color="#EF9F27" sub="Require attention" icon="🔔" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Risk composition pie */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4 text-sm">Portfolio Risk Composition</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskPie} dataKey="value" nameKey="name" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {riskPie.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Case status bar */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4 text-sm">Case Status Breakdown</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBar} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="status" stroke="#64748b" tick={{ fontSize: 9 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Course risk bar */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4 text-sm">Risk by Course</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseBar}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="course" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="high" fill="#E24B4A" name="High" stackId="a" />
                      <Bar dataKey="medium" fill="#EF9F27" name="Medium" stackId="a" />
                      <Bar dataKey="low" fill="#1D9E75" name="Low" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top high-risk alerts preview */}
            {alerts.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Latest High-Severity Alerts</h3>
                  <button onClick={() => setActiveTab('alerts')} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
                </div>
                <div className="space-y-2">
                  {alerts.filter(a => a.severity === 'high').slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-3 py-2">
                      <SeverityBadge s={a.severity} />
                      <button onClick={() => navigate(`/student/${a.student_id}`)} className="font-medium text-sm text-blue-300 hover:text-blue-200 truncate">{a.student_name}</button>
                      <span className="text-xs text-slate-400 truncate flex-1">{a.message}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {!loading && activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Early Warning Alerts</h2>
              <span className="text-sm text-slate-400">{alerts.length} active alerts</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-slate-300 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Institute</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">Score Δ</th>
                    <th className="px-4 py-3 text-left">Message</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {alerts.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-500">No active alerts. Run "Generate Alerts" from Admin panel.</td></tr>
                  )}
                  {alerts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/student/${a.student_id}`)} className="text-blue-300 hover:text-blue-200 font-medium">{a.student_name}</button>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{a.institute_name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{a.course_type}</td>
                      <td className="px-4 py-3"><SeverityBadge s={a.severity} /></td>
                      <td className="px-4 py-3 text-red-400 font-mono text-xs">{a.score_change ? `${(a.score_change * 100).toFixed(1)}%` : '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{a.message}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HEATMAP TAB */}
        {!loading && activeTab === 'heatmap' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Portfolio Heatmap</h2>
            <p className="text-slate-400 text-sm">Institute and course-level risk distribution across the entire borrower portfolio.</p>
            {heatmap && <PortfolioHeatmap data={heatmap} />}
          </div>
        )}

        {/* CASES TAB */}
        {!loading && activeTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">All Cases</h2>
              <span className="text-sm text-slate-400">{cases.length} total</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-slate-300 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Risk</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cases.slice(0, 100).map((c) => (
                    <tr key={c.case_id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium">{c.student_name}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.course_type}</td>
                      <td className="px-4 py-3">
                        {c.risk_level && <span className="font-bold text-xs" style={{ color: RISK_COLORS[c.risk_level] }}>{c.risk_level}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{c.status}</td>
                      <td className="px-4 py-3 text-xs text-blue-300">{c.recommended_action?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RiskHeadDashboard;
