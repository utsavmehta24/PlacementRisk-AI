import React from 'react';

function RiskBadge({ level, score, large = false }) {
  const getColorClass = () => {
    switch (level) {
      case 'HIGH':
        return 'bg-risk-high';
      case 'MEDIUM':
        return 'bg-risk-medium';
      case 'LOW':
        return 'bg-risk-low';
      default:
        return 'bg-gray-500';
    }
  };

  const sizeClass = large ? 'px-6 py-3 text-lg' : 'px-3 py-1 text-sm';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`${getColorClass()} ${sizeClass} inline-flex items-center font-semibold rounded-lg text-white`}
      >
        {level}
      </span>
      {score !== undefined && (
        <span className="text-sm text-gray-600">
          Score: {(score * 100).toFixed(1)}
        </span>
      )}
    </div>
  );
}

export default RiskBadge;
