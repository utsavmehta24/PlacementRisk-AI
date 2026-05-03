import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioAPI, studentAPI } from '../api/client';

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const response = await portfolioAPI.getAlerts({ limit: 50 });
        setAlerts(response.data);
      } catch (error) {
        console.error('Error loading alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const handleInitiateSupport = async (studentId) => {
    try {
      await studentAPI.initiateAction(studentId, 'skill_up');
      alert('Support action initiated successfully.');
    } catch (error) {
      console.error('Error initiating support:', error);
      alert('Failed to initiate support action');
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-risk-high text-white';
      case 'medium':
        return 'bg-risk-medium text-slate-900';
      default:
        return 'bg-blue-200 text-blue-900';
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-lg">Loading alerts...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Early Warning Alerts</h1>
            <p className="text-sm text-slate-400">Event-driven deteriorating risk signals</p>
          </div>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500">Back to Dashboard</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Institute</th>
                <th className="px-4 py-3 text-left">Course</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Score Change</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-800/60">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/student/${alert.student_id}`)} className="text-blue-300 hover:text-blue-200 font-medium">{alert.student_name}</button>
                  </td>
                  <td className="px-4 py-3">{alert.institute_name}</td>
                  <td className="px-4 py-3">{alert.course_type}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-semibold ${getSeverityClass(alert.severity)}`}>{alert.severity.toUpperCase()}</span></td>
                  <td className="px-4 py-3 text-risk-high">{alert.score_change ? `${alert.score_change > 0 ? '+' : ''}${(alert.score_change * 100).toFixed(1)}%` : '-'}</td>
                  <td className="px-4 py-3">{alert.message}</td>
                  <td className="px-4 py-3"><button onClick={() => handleInitiateSupport(alert.student_id)} className="text-amber-300 hover:text-amber-200">Initiate Support</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          {alerts.length === 0 && <div className="text-center py-10 text-slate-400">No active alerts at this time.</div>}
        </div>
      </main>
    </div>
  );
}

export default Alerts;
