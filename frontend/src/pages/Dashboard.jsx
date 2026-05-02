import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI } from '../api/client';
import PortfolioHeatmap from '../components/PortfolioHeatmap';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, heatmapRes] = await Promise.all([
        portfolioAPI.getStats(),
        portfolioAPI.getHeatmap()
      ]);
      setStats(statsRes.data);
      setHeatmapData(heatmapRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PlacementRisk AI</h1>
            <p className="text-sm text-gray-600">Welcome, {user.full_name}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/alerts')}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
            >
              Alerts
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Borrowers</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {stats?.total_students?.toLocaleString() || 0}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">High Risk %</div>
            <div className="text-3xl font-bold text-risk-high mt-2">
              {stats?.high_risk_percentage?.toFixed(1) || 0}%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Avg Placement Prob</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {((stats?.avg_placement_prob_6mo || 0) * 100).toFixed(0)}%
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Alerts Today</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {stats?.alerts_today || 0}
            </div>
          </div>
        </div>

        {/* Portfolio Heatmap */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Portfolio Risk Heatmap
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Risk distribution by institute and course type
          </p>
          {heatmapData && <PortfolioHeatmap data={heatmapData} />}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
