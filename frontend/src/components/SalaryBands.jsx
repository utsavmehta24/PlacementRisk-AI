import React from 'react';

function SalaryBands({ p10, p50, p90, emi }) {
  const maxSalary = p90;
  const emiThreshold = emi * 12 * 3; // 3x annual EMI

  const getPosition = (value) => {
    return (value / maxSalary) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Salary Range Visualization */}
      <div className="relative h-16 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg">
        {/* P10 Marker */}
        <div
          className="absolute top-0 h-full w-1 bg-red-600"
          style={{ left: `${getPosition(p10)}%` }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap">
            P10: ₹{(p10 / 100000).toFixed(1)}L
          </div>
        </div>

        {/* P50 Marker */}
        <div
          className="absolute top-0 h-full w-2 bg-blue-600"
          style={{ left: `${getPosition(p50)}%` }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap">
            P50: ₹{(p50 / 100000).toFixed(1)}L
          </div>
        </div>

        {/* P90 Marker */}
        <div
          className="absolute top-0 h-full w-1 bg-green-600"
          style={{ left: `${getPosition(p90)}%` }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap">
            P90: ₹{(p90 / 100000).toFixed(1)}L
          </div>
        </div>

        {/* EMI Threshold Marker */}
        {emiThreshold < maxSalary && (
          <div
            className="absolute top-0 h-full w-1 bg-orange-500 border-l-2 border-dashed"
            style={{ left: `${getPosition(emiThreshold)}%` }}
          >
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-orange-600 whitespace-nowrap">
              EMI 3x: ₹{(emiThreshold / 100000).toFixed(1)}L
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-medium text-gray-700">P10 (10th percentile)</div>
          <div className="text-gray-600">₹{p10.toLocaleString()}</div>
        </div>
        <div>
          <div className="font-medium text-gray-700">P50 (Median)</div>
          <div className="text-gray-600">₹{p50.toLocaleString()}</div>
        </div>
        <div>
          <div className="font-medium text-gray-700">P90 (90th percentile)</div>
          <div className="text-gray-600">₹{p90.toLocaleString()}</div>
        </div>
        <div>
          <div className="font-medium text-gray-700">Monthly EMI</div>
          <div className="text-gray-600">₹{emi.toLocaleString()}</div>
        </div>
      </div>

      {/* Repayment Analysis */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="text-sm font-medium text-blue-900 mb-2">Repayment Capacity</div>
        <div className="text-sm text-blue-700">
          {p50 / 12 >= emi * 3 ? (
            <span className="text-green-700 font-medium">
              ✓ Comfortable repayment capacity (Salary &gt; 3x EMI)
            </span>
          ) : p50 / 12 >= emi * 2 ? (
            <span className="text-yellow-700 font-medium">
              ⚠ Moderate repayment capacity (Salary 2-3x EMI)
            </span>
          ) : (
            <span className="text-red-700 font-medium">
              ⚠ Tight repayment capacity (Salary &lt; 2x EMI)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalaryBands;
