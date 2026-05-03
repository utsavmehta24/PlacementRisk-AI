import React from 'react';

function PortfolioHeatmap({ data }) {
  if (!data || !data.cells || data.cells.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm border border-slate-700 rounded-xl">
        No scored students yet. Click <strong>Backfill Risk Scores</strong> above to generate scores.
      </div>
    );
  }
  const getRiskLabel = (avgScore) => {
    if (avgScore < 0.4) return 'HIGH';
    if (avgScore < 0.65) return 'MEDIUM';
    return 'LOW';
  };

  const getRiskBadge = (avgScore) => {
    if (avgScore < 0.4) return 'bg-risk-high text-white';
    if (avgScore < 0.65) return 'bg-risk-medium text-slate-900';
    return 'bg-risk-low text-white';
  };

  const rows = [...(data?.cells || [])]
    .sort((a, b) => b.high_risk_count - a.high_risk_count)
    .slice(0, 30);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800 text-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">Institute</th>
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-left">Students</th>
              <th className="px-4 py-3 text-left">Risk Band</th>
              <th className="px-4 py-3 text-left">Avg Score</th>
              <th className="px-4 py-3 text-left">H / M / L</th>
            </tr>
          </thead>
          <tbody className="bg-slate-900/50 divide-y divide-slate-800 text-slate-100">
            {rows.map((cell) => (
              <tr key={`${cell.institute_name}-${cell.course_type}`} className="hover:bg-slate-800/60">
                <td className="px-4 py-3">{cell.institute_name}</td>
                <td className="px-4 py-3">{cell.course_type}</td>
                <td className="px-4 py-3">{cell.student_count}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getRiskBadge(cell.avg_risk_score)}`}>
                    {getRiskLabel(cell.avg_risk_score)}
                  </span>
                </td>
                <td className="px-4 py-3">{(cell.avg_risk_score * 100).toFixed(1)}%</td>
                <td className="px-4 py-3">
                  <span className="text-risk-high">{cell.high_risk_count}</span>
                  {' / '}
                  <span className="text-risk-medium">{cell.medium_risk_count}</span>
                  {' / '}
                  <span className="text-risk-low">{cell.low_risk_count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-300">
        Total students: {(data.total_students || 0).toLocaleString()} | High risk percentage: {(data.high_risk_percentage || 0).toFixed(1)}%
      </p>
    </div>
  );
}

export default PortfolioHeatmap;
