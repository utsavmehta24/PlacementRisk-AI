function SalaryBands({ p10, p50, p90, emi }) {
  const maxSalary = Math.max(p90, 1);
  const emiThreshold = emi * 12 * 3;

  const getPosition = (value) => (value / maxSalary) * 100;
  const formatLakh = (value) => `Rs.${(value / 100000).toFixed(1)}L`;
  const formatMoney = (value) => `Rs.${value.toLocaleString()}`;

  return (
    <div className="space-y-4">
      <div className="relative h-16 bg-gradient-to-r from-risk-high/25 via-risk-medium/25 to-risk-low/25 rounded-lg border border-slate-200">
        <div className="absolute top-0 h-full w-1 bg-red-600" style={{ left: `${getPosition(p10)}%` }}>
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap">
            P10: {formatLakh(p10)}
          </div>
        </div>

        <div className="absolute top-0 h-full w-2 bg-blue-600" style={{ left: `${getPosition(p50)}%` }}>
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap">
            P50: {formatLakh(p50)}
          </div>
        </div>

        <div className="absolute top-0 h-full w-1 bg-green-600" style={{ left: `${getPosition(p90)}%` }}>
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap">
            P90: {formatLakh(p90)}
          </div>
        </div>

        {emiThreshold < maxSalary && (
          <div className="absolute top-0 h-full w-1 bg-orange-500 border-l-2 border-dashed" style={{ left: `${getPosition(emiThreshold)}%` }}>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-orange-600 whitespace-nowrap">
              EMI 3x: {formatLakh(emiThreshold)}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><div className="font-medium text-gray-700">P10 (10th percentile)</div><div className="text-gray-600">{formatMoney(p10)}</div></div>
        <div><div className="font-medium text-gray-700">P50 (Median)</div><div className="text-gray-600">{formatMoney(p50)}</div></div>
        <div><div className="font-medium text-gray-700">P90 (90th percentile)</div><div className="text-gray-600">{formatMoney(p90)}</div></div>
        <div><div className="font-medium text-gray-700">Monthly EMI</div><div className="text-gray-600">{formatMoney(emi)}</div></div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="text-sm font-medium text-blue-900 mb-2">Repayment Capacity</div>
        <div className="text-sm text-blue-700">
          {p50 / 12 >= emi * 3 ? (
            <span className="text-green-700 font-medium">Comfortable repayment capacity (Salary &gt; 3x EMI)</span>
          ) : p50 / 12 >= emi * 2 ? (
            <span className="text-yellow-700 font-medium">Moderate repayment capacity (Salary 2-3x EMI)</span>
          ) : (
            <span className="text-red-700 font-medium">Tight repayment capacity (Salary &lt; 2x EMI)</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalaryBands;
