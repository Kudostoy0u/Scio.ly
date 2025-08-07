'use client';
import React from 'react';

interface ProgressBarProps {
  answeredCount: number;
  totalCount: number;
  isSubmitted: boolean;
}

export default function ProgressBar({ answeredCount, totalCount, isSubmitted }: ProgressBarProps) {
  return (
    <div
      className={`${isSubmitted ? '' : 'sticky top-6'} z-10 w-full max-w-3xl bg-white border-2 border-gray-300 rounded-full h-5 mb-6 shadow-lg`}
    >
      <div
        className="bg-blue-500 h-4 rounded-full transition-[width] duration-700 ease-in-out shadow-md"
        style={{ width: `${(answeredCount / totalCount) * 100}%` }}
      ></div>
    </div>
  );
}
