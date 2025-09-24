'use client';

import React from 'react';

export default function MatchSummary({
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
}: {
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-slate-800 mb-3">Match Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
          <div className="text-sm text-red-700">High Risk Matches</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{mediumRiskCount}</div>
          <div className="text-sm text-orange-700">Medium Risk Matches</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{lowRiskCount}</div>
          <div className="text-sm text-yellow-700">Low Risk Matches</div>
        </div>
      </div>
    </div>
  );
}


