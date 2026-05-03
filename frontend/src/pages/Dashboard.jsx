import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI } from '../api/client';
import PortfolioHeatmap from '../components/PortfolioHeatmap';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, heatmapRes] = await Promise.all([
          portfolioAPI.getStats(),
          portfolioAPI.getHeatmap(),
        ]);
        setStats(statsRes.data);
        setHeatmapData(heatmapRes.data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-lg text-slate-700">Loading dashboard...</div>;
  }

  const cells = heatmapData?.cells || [];
  const riskMix = cells.reduce(
    (acc, row) => {
      acc.high += row.high_risk_count;
      acc.medium += row.medium_risk_count;
      acc.low += row.low_risk_count;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const pieData = [
    { name: 'High', value: riskMix.high, color: '#E24B4A' },
    { name: 'Medium', value: riskMix.medium, color: '#EF9F27' },
    { name: 'Low', value: riskMix.low, color: '#1D9E75' },
  ];
  const courseAgg = Object.values(
    cells.reduce((acc, row) => {
      const key = row.course_type;
      if (!acc[key]) {
        acc[key] = { course: key, students: 0, highRisk: 0 };
      }
      acc[key].students += row.student_count;
      acc[key].highRisk += row.high_risk_count;
      return acc;
    }, {})
  ).sort((a, b) => b.students - a.students);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-100">
      <header className="border-b border-slate-800 backdrop-blur-sm bg-slate-950/60 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">PlacementRisk AI</h1>
            <p className="text-sm text-slate-300">Career Success Linked Education Loan System</p>
            <p className="text-xs text-slate-400 mt-1">Signed in as {user.full_name || 'User'}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/alerts')} className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold">Early Alerts</button>
            <button onClick={handleLogout} className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5"><p className="text-slate-400 text-sm">Total Borrowers</p><p className="text-3xl font-extrabold mt-2">{stats?.total_students?.toLocaleString() || 0}</p></div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5"><p className="text-slate-400 text-sm">High Risk</p><p className="text-3xl font-extrabold mt-2 text-risk-high">{stats?.high_risk_percentage?.toFixed(1) || 0}%</p></div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5"><p className="text-slate-400 text-sm">Placement Probability (6m)</p><p className="text-3xl font-extrabold mt-2 text-blue-300">{((stats?.avg_placement_prob_6mo || 0) * 100).toFixed(0)}%</p></div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5"><p className="text-slate-400 text-sm">Open Alerts</p><p className="text-3xl font-extrabold mt-2 text-amber-300">{stats?.alerts_today || 0}</p></div>
        </section>

        <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-1">Portfolio Dashboard Output</h2>
          <p className="text-slate-400 text-sm mb-5">Institute and course heatmap of at-risk borrowers with trend-ready distribution.</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Risk Band Composition</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Course-wise Borrower Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseAgg}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="course" stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="students" fill="#60a5fa" name="Students" />
                    <Bar dataKey="highRisk" fill="#ef4444" name="High Risk" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          {heatmapData && <PortfolioHeatmap data={heatmapData} />}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
