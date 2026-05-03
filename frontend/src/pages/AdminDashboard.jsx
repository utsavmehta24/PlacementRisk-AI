import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, portfolioAPI } from '../api/client';
import PortfolioHeatmap from '../components/PortfolioHeatmap';

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
