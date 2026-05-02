import React from 'react';

function PortfolioHeatmap({ data }) {
  const getRiskColor = (avgScore) => {
    if (avgScore < 0.40) return 'bg-risk-high';
    if (avgScore < 0.65) return 'bg-risk-medium';
    return 'bg-risk-low';
  };

  const getRiskLabel = (avgScore) => {
    if (avgScore < 0.40) return 'HIGH';
    if (avgScore < 0.65) return 'MEDIUM';
    return 'LOW';
  };

  // Group by institute
  const groupedData = data.cells.reduce((acc, cell) => {
    if (!acc[cell.institute_name]) {
      acc[cell.institute_name] = [];
    }
    acc[cell.institute_name].push(cell);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Institute
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Course
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Students
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Distribution
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.entries(groupedData).slice(0, 20).map(([institute, cells]) =>
            cells.map((cell, idx) => (
              <tr key={`${institute}-${cell.course_type}`} className="hover:bg-gray-50">
                {idx === 0 && (
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                    rowSpan={cells.length}
                  >
                    {institute}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {cell.course_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {cell.student_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white ${getRiskColor(
                      cell.avg_risk_score
                    )}`}
                  >
                    {getRiskLabel(cell.avg_risk_score)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(cell.avg_risk_score * 100).toFixed(1)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex gap-2 text-xs">
                    <span className="text-risk-high">H: {cell.high_risk_count}</span>
                    <span className="text-risk-medium">M: {cell.medium_risk_count}</span>
                    <span className="text-risk-low">L: {cell.low_risk_count}</span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          Total Students: {data.total_students.toLocaleString()} | High Risk:{' '}
          {data.high_risk_percentage.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

export default PortfolioHeatmap;
