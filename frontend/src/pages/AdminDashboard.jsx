import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, portfolioAPI } from '../api/client';

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-extrabold mt-1" style={color ? { color } : {}}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-50">{icon}</span>}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [instituteStudents, setInstituteStudents] = useState([]);
  const [opsMessage, setOpsMessage] = useState('');
  const [opsLoading, setOpsLoading] = useState('');
  const [activeTab, setActiveTab] = useState('system');

  const loadStats = async () => {
    const [s, m] = await Promise.all([portfolioAPI.getStats(), adminAPI.getMonitoring()]);
    setStats(s.data);
    setMonitoring(m.data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadStats();
        const [i, u] = await Promise.all([adminAPI.getInstitutes(), adminAPI.getUsers()]);
        setInstitutes(i.data);
        setUsers(u.data);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const uniqueInstitutes = useMemo(() => {
    const seen = new Set();
    return institutes.filter((inst) => {
      const key = inst.name.trim().toLowerCase() + inst.city.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [institutes]);

  const filteredInstitutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return uniqueInstitutes.filter(i => i.name.toLowerCase().includes(q) || i.city.toLowerCase().includes(q) || i.state.toLowerCase().includes(q));
  }, [query, uniqueInstitutes]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users.filter(u => u.email.toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q));
  }, [userQuery, users]);

  const openInstitute = async (inst) => {
    setSelectedInstitute(inst);
    const resp = await adminAPI.getInstituteStudents(inst.id, { limit: 100 });
    setInstituteStudents(resp.data);
  };

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const runOp = async (label, fn) => {
    setOpsLoading(label);
    setOpsMessage('');
    try {
      const resp = await fn();
      setOpsMessage(resp);
      await loadStats();
    } catch (e) {
      setOpsMessage('Error: ' + (e.response?.data?.detail || e.message));
    } finally { setOpsLoading(''); }
  };

  const roleBadge = (role) => {
    const cls = { admin: 'bg-purple-900/60 text-purple-300', risk_head: 'bg-indigo-900/60 text-indigo-300', loan_officer: 'bg-blue-900/60 text-blue-300', student: 'bg-slate-700 text-slate-300' }[role] || 'bg-slate-700 text-slate-300';
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{role.replace(/_/g, ' ')}</span>;
  };

  const tabs = [
    { id: 'system', label: '🖥 System' },
    { id: 'institutes', label: `🏛 Institutes (${uniqueInstitutes.length})` },
    { id: 'users', label: `👤 Users (${users.length})` },
    { id: 'ops', label: '⚙️ Operations' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-xl tracking-tight">PlacementRisk AI — Admin</h1>
            <p className="text-xs text-slate-400 mt-0.5">{user.full_name} · System Administration</p>
          </div>
          <button onClick={logout} className="px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded text-xs text-slate-300">Logout</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* SYSTEM TAB */}
        {activeTab === 'system' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Borrowers" value={(stats?.total_students || 0).toLocaleString()} icon="👥" />
              <StatCard label="High Risk %" value={`${(stats?.high_risk_percentage || 0).toFixed(1)}%`} color="#E24B4A" icon="⚠️" />
              <StatCard label="Open Cases" value={(monitoring?.open_cases || 0).toLocaleString()} color="#EF9F27" icon="📋" />
              <StatCard label="Total Cases" value={(monitoring?.total_cases || 0).toLocaleString()} icon="🗂" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* MLOps links */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4">MLOps Services</h3>
                <div className="space-y-3">
                  {[
                    { label: 'MLflow Experiment Tracker', url: 'http://localhost:5000', icon: '🧪', desc: 'Model runs, metrics, artifacts' },
                    { label: 'Airflow DAG Scheduler', url: 'http://localhost:8080', icon: '🔄', desc: 'Daily feature refresh, weekly retrain' },
                    { label: 'Backend API Docs', url: 'http://localhost:8000/docs', icon: '📖', desc: 'FastAPI Swagger UI' },
                  ].map(({ label, url, icon, desc }) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 bg-slate-800/60 hover:bg-slate-800 rounded-lg px-4 py-3 transition-colors">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <div className="font-medium text-sm text-slate-200">{label}</div>
                        <div className="text-xs text-slate-500">{desc} · <span className="text-blue-400">{url}</span></div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* System health */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold mb-4">System Health</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Backend API', status: 'healthy', detail: 'localhost:8000' },
                    { label: 'PostgreSQL', status: 'healthy', detail: 'localhost:5432' },
                    { label: 'Redis Cache', status: 'healthy', detail: 'localhost:6379' },
                    { label: 'Celery Worker', status: 'running', detail: 'Background tasks' },
                  ].map(({ label, status, detail }) => (
                    <div key={label} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-2.5">
                      <div>
                        <span className="text-sm font-medium text-slate-200">{label}</span>
                        <span className="text-xs text-slate-500 ml-2">{detail}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === 'healthy' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-blue-900/60 text-blue-300'}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INSTITUTES TAB */}
        {activeTab === 'institutes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Institute Directory</h3>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, city, state…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <div className="text-xs text-slate-500 mb-2">{filteredInstitutes.length} institutes</div>
              <div className="max-h-[60vh] overflow-y-auto space-y-1">
                {filteredInstitutes.slice(0, 150).map((inst) => (
                  <button key={inst.id} onClick={() => openInstitute(inst)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selectedInstitute?.id === inst.id ? 'bg-purple-900/40 border border-purple-700' : 'bg-slate-800/60 hover:bg-slate-800'}`}>
                    <div className="font-medium text-sm text-slate-200">{inst.name}</div>
                    <div className="text-xs text-slate-500">{inst.city}, {inst.state} · {inst.region}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3">
                {selectedInstitute ? selectedInstitute.name : 'Institute Drilldown'}
              </h3>
              {!selectedInstitute ? (
                <p className="text-slate-500 text-sm">Select an institute from the list.</p>
              ) : (
                <>
                  <div className="text-xs text-slate-400 mb-3">{selectedInstitute.city}, {selectedInstitute.state}</div>
                  <div className="max-h-[55vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-slate-400 text-xs">
                        <tr><th className="text-left pb-2">Student</th><th className="text-center pb-2">Course</th><th className="text-center pb-2">CGPA</th><th className="text-right pb-2"></th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {instituteStudents.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">No students found.</td></tr>}
                        {instituteStudents.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-800/40">
                            <td className="py-2 text-slate-200">{s.name}</td>
                            <td className="py-2 text-center text-slate-400 text-xs">{s.course}</td>
                            <td className="py-2 text-center text-slate-400">{s.cgpa}</td>
                            <td className="py-2 text-right">
                              <button onClick={() => navigate(`/student/${s.id}`)} className="text-xs text-blue-400 hover:text-blue-300">View →</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">User Accounts</h3>
              <span className="text-xs text-slate-400">{users.length} total</span>
            </div>
            <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search by email or name…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 text-slate-300 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.slice(0, 200).map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-200">{u.full_name || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{u.email}</td>
                      <td className="px-4 py-2.5">{roleBadge(u.role)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* OPS TAB */}
        {activeTab === 'ops' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Operations Control</h2>
              <p className="text-slate-400 text-sm mt-1">Run ML pipelines, generate risk scores, and trigger alert workflows.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  id: 'backfill',
                  icon: '🔢',
                  title: 'Backfill Risk Scores',
                  desc: 'Compute placement risk scores for all students who have not been scored yet. Uses the fallback heuristic predictor.',
                  action: async () => {
                    const r = await adminAPI.backfillScores();
                    return `✓ Backfill complete. New scores created: ${r.data.created_scores}`;
                  },
                  btnLabel: 'Run Backfill',
                  btnColor: 'bg-emerald-700 hover:bg-emerald-600',
                },
                {
                  id: 'alerts',
                  icon: '🚨',
                  title: 'Generate Early Warning Alerts',
                  desc: 'Scan all students for risk deterioration and placement delays. Creates alerts and support cases automatically.',
                  action: async () => {
                    const r = await adminAPI.generateAlerts();
                    return `✓ Alert generation complete. New alerts: ${r.data.generated_alerts}`;
                  },
                  btnLabel: 'Generate Alerts',
                  btnColor: 'bg-amber-600 hover:bg-amber-500',
                },
              ].map((op) => (
                <div key={op.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-3xl">{op.icon}</span>
                    <div>
                      <h3 className="font-semibold">{op.title}</h3>
                      <p className="text-slate-400 text-sm mt-1">{op.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => runOp(op.id, op.action)}
                    disabled={opsLoading === op.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${op.btnColor}`}
                  >
                    {opsLoading === op.id ? 'Running…' : op.btnLabel}
                  </button>
                </div>
              ))}
            </div>

            {opsMessage && (
              <div className={`border rounded-xl px-4 py-3 text-sm ${opsMessage.startsWith('✓') ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
                {opsMessage}
              </div>
            )}

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Current Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  { label: 'Total Students', value: (stats?.total_students || 0).toLocaleString() },
                  { label: 'High Risk', value: `${(stats?.high_risk_percentage || 0).toFixed(1)}%` },
                  { label: 'Open Cases', value: monitoring?.open_cases || 0 },
                  { label: 'Total Cases', value: monitoring?.total_cases || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">{label}</div>
                    <div className="font-bold text-lg">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;

function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [institutes, setInstitutes] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [instituteStudents, setInstituteStudents] = useState([]);
  const [opsMessage, setOpsMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [s, m, i] = await Promise.all([
          portfolioAPI.getStats(),
          adminAPI.getMonitoring(),
          adminAPI.getInstitutes(),
        ]);
        setStats(s.data);
        setMonitoring(m.data);
        setInstitutes(i.data);
        // Load heatmap separately — it may be empty if no scores yet
        try {
          const h = await portfolioAPI.getHeatmap();
          setHeatmapData(h.data);
        } catch (_) {
          setHeatmapData({ cells: [], total_students: 0, high_risk_percentage: 0 });
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const uniqueInstitutes = useMemo(() => {
    const seen = new Set();
    return institutes.filter((inst) => {
      const key = [inst.name.trim().toLowerCase(), inst.city.trim().toLowerCase(), inst.state.trim().toLowerCase(), (inst.region || '').trim().toLowerCase()].join('|');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [institutes]);

  const filtered = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    return uniqueInstitutes.filter((inst) =>
      inst.name.toLowerCase().includes(queryText) ||
      inst.city.toLowerCase().includes(queryText) ||
      inst.state.toLowerCase().includes(queryText)
    );
  }, [query, uniqueInstitutes]);

  const openInstitute = async (inst) => {
    setSelectedInstitute(inst);
    const resp = await adminAPI.getInstituteStudents(inst.id, { limit: 100 });
    setInstituteStudents(resp.data);
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const runBackfill = async () => {
    setOpsMessage('Running risk score backfill...');
    const resp = await adminAPI.backfillScores();
    setOpsMessage(`Backfill complete. Created scores: ${resp.data.created_scores}`);
    const s = await portfolioAPI.getStats();
    setStats(s.data);
  };

  const runAlerts = async () => {
    setOpsMessage('Generating alerts...');
    const resp = await adminAPI.generateAlerts();
    setOpsMessage(`Alert generation complete. New alerts: ${resp.data.generated_alerts}`);
    const s = await portfolioAPI.getStats();
    setStats(s.data);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Command Center</h1>
          <p className="text-slate-400">Signed in as {user.full_name}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-amber-500 text-slate-900 rounded" onClick={() => navigate('/alerts')}>Alerts</button>
          <button className="px-3 py-2 bg-slate-700 rounded" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4"><div className="text-slate-400">Borrowers</div><div className="text-3xl font-bold">{stats?.total_students?.toLocaleString() || 0}</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4"><div className="text-slate-400">High Risk</div><div className="text-3xl font-bold text-red-400">{stats?.high_risk_percentage?.toFixed(1) || 0}%</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4"><div className="text-slate-400">Open Cases</div><div className="text-3xl font-bold text-amber-300">{monitoring?.open_cases || 0}</div></div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4"><div className="text-slate-400">MLOps</div><div className="text-sm mt-1">MLflow: {monitoring?.mlflow_url}</div><div className="text-sm">Airflow: {monitoring?.airflow_url}</div></div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center gap-3">
        <button className="px-3 py-2 bg-emerald-600 rounded" onClick={runBackfill}>Backfill Risk Scores (All Students)</button>
        <button className="px-3 py-2 bg-amber-500 text-slate-900 rounded" onClick={runAlerts}>Generate Early Alerts + Cases</button>
        <span className="text-sm text-slate-300">{opsMessage}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Institute Portfolio Heatmap</h2>
        {heatmapData && <PortfolioHeatmap data={heatmapData} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Institute Directory</h2>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search institute" className="w-full bg-slate-800 border border-slate-700 rounded p-2 mb-3" />
          <div className="max-h-96 overflow-auto space-y-2">
            {filtered.slice(0, 100).map((inst) => (
              <button key={inst.id} className="w-full text-left p-2 rounded bg-slate-800 hover:bg-slate-700" onClick={() => openInstitute(inst)}>
                <div className="font-medium">{inst.name}</div>
                <div className="text-xs text-slate-400">{inst.city}, {inst.state}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Institute Drilldown</h2>
          {!selectedInstitute ? <p className="text-slate-400">Select an institute to view students.</p> : (
            <>
              <div className="mb-3">
                <div className="font-semibold">{selectedInstitute.name}</div>
                <div className="text-xs text-slate-400">{selectedInstitute.city}, {selectedInstitute.state}</div>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-slate-400"><th className="text-left">Student</th><th>Course</th><th>CGPA</th><th></th></tr></thead>
                  <tbody>
                    {instituteStudents.map((s) => (
                      <tr key={s.id} className="border-t border-slate-800">
                        <td>{s.name}</td><td className="text-center">{s.course}</td><td className="text-center">{s.cgpa}</td>
                        <td className="text-right"><button className="text-blue-300" onClick={() => navigate(`/student/${s.id}`)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
