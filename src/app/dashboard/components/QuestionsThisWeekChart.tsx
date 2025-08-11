'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false }) as any;

type HistoryRecord = { questionsAttempted: number; correctAnswers: number; eventsPracticed?: string[] };

export default function QuestionsThisWeekChart({
  historyData,
  darkMode,
}: {
  historyData: Record<string, HistoryRecord>;
  darkMode: boolean;
}) {
  const [chartType, setChartType] = useState<'line' | 'heatmap'>('line');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const chartAreaRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [chartAreaHeight, setChartAreaHeight] = useState<number>(0);
  const targetCellSizePx = 22; // desired square size
  const gapPx = 2; // space between squares
  const minCols = 10;
  const weeksCount = useMemo(() => {
    if (containerWidth <= 0) return 5;
    const cols = Math.floor((containerWidth + gapPx) / (targetCellSizePx + gapPx));
    return Math.max(minCols, cols);
  }, [containerWidth]);
  const cellSizePx = useMemo(() => {
    if (containerWidth <= 0) return targetCellSizePx;
    const widthConstrained = Math.floor((containerWidth - (weeksCount - 1) * gapPx) / weeksCount);
    const heightConstrained = chartAreaHeight > 0 ? Math.floor((chartAreaHeight - (7 - 1) * gapPx) / 7) : widthConstrained;
    return Math.max(6, Math.min(widthConstrained, heightConstrained));
  }, [containerWidth, weeksCount, chartAreaHeight]);

  const last7Days = useMemo(() => {
    const days: { label: string; key: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const value = historyData[key]?.correctAnswers ?? 0;
      days.push({ label, key, value });
    }
    return days;
  }, [historyData]);

  const weeklyTotals = useMemo(() => {
    // Current week total (last 7 days) vs previous 7 days
    const now = new Date();
    let current = 0;
    let previous = 0;
    for (let i = 0; i < 7; i++) {
      const d1 = new Date(now);
      d1.setDate(now.getDate() - i);
      const d2 = new Date(now);
      d2.setDate(now.getDate() - 7 - i);
      const k1 = d1.toISOString().split('T')[0];
      const k2 = d2.toISOString().split('T')[0];
      current += historyData[k1]?.correctAnswers ?? 0;
      previous += historyData[k2]?.correctAnswers ?? 0;
    }
    return { current, previous };
  }, [historyData]);

  const todayTotals = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yKey = yesterday.toISOString().split('T')[0];
    const today = historyData[todayKey]?.correctAnswers ?? 0;
    const y = historyData[yKey]?.correctAnswers ?? 0;
    return { today, yesterday: y };
  }, [historyData]);

  const monthTotals = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const endOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));

    let currentMonth = 0;
    let previousMonth = 0;

    // Sum current month
    for (
      let d = new Date(startOfMonth);
      d <= now;
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1))
    ) {
      const key = new Date(d).toISOString().split('T')[0];
      currentMonth += historyData[key]?.correctAnswers ?? 0;
    }

    // Sum previous month
    for (
      let d = new Date(startOfPrevMonth);
      d <= endOfPrevMonth;
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1))
    ) {
      const key = new Date(d).toISOString().split('T')[0];
      previousMonth += historyData[key]?.correctAnswers ?? 0;
    }
    return { currentMonth, previousMonth };
  }, [historyData]);

  const getDelta = (current: number, previous: number) => {
    if (current === 0 && previous === 0) return 0;
    if (previous === 0) return 100; // treat as full increase from zero
    return ((current - previous) / previous) * 100;
  };

  const weeklyDelta = getDelta(weeklyTotals.current, weeklyTotals.previous);
  const todayDelta = getDelta(todayTotals.today, todayTotals.yesterday);
  const monthDelta = getDelta(monthTotals.currentMonth, monthTotals.previousMonth);

  const sharedTheme = {
    foreColor: darkMode ? '#e5e7eb' : '#111827',
  } as const;

  const lineOptions = useMemo(() => ({
    chart: { type: 'area', toolbar: { show: false }, foreColor: sharedTheme.foreColor },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    xaxis: { categories: last7Days.map(d => d.label) },
    yaxis: { decimalsInFloat: 0 },
    grid: { borderColor: darkMode ? '#374151' : '#e5e7eb' },
    colors: [darkMode ? '#60a5fa' : '#2563eb'],
    tooltip: { theme: darkMode ? 'dark' : 'light' },
  }), [darkMode, last7Days, sharedTheme.foreColor]);

  const lineSeries = useMemo(() => ([
    { name: 'Answered', data: last7Days.map(d => d.value) },
  ]), [last7Days]);

  // Build a GitHub-style 7 x N grid (rows: Sun-Sat, cols: weeks)
  const gridData = useMemo(() => {
    const today = new Date();
    const endWeekday = today.getDay();
    const rows = 7;
    const cols = weeksCount;
    const matrix: Array<Array<{ date: Date; key: string; value: number; isFuture: boolean }>> = [];

    for (let r = 0; r < rows; r++) {
      const row: Array<{ date: Date; key: string; value: number; isFuture: boolean }> = [];
      for (let c = 0; c < cols; c++) {
        const colShiftDays = (cols - 1 - c) * 7 + (endWeekday - r);
        const cellDate = new Date(today);
        cellDate.setDate(today.getDate() - colShiftDays);
        const key = cellDate.toISOString().split('T')[0];
        const isFuture = colShiftDays < 0;
        const value = isFuture ? 0 : (historyData[key]?.correctAnswers ?? 0);
        row.push({ date: cellDate, key, value, isFuture });
      }
      matrix.push(row);
    }
    return matrix;
  }, [historyData, weeksCount]);

  const maxValueInGrid = useMemo(() => {
    let max = 0;
    for (const row of gridData) {
      for (const cell of row) max = Math.max(max, cell.value);
    }
    return max;
  }, [gridData]);

  const getCellColor = (v: number) => {
    if (v <= 0) return darkMode ? '#1f2937' : '#e5e7eb';
    if (maxValueInGrid <= 1) return '#22c55e';
    const level = Math.min(4, Math.ceil((v / maxValueInGrid) * 4));
    switch (level) {
      case 1: return '#bbf7d0';
      case 2: return '#86efac';
      case 3: return '#22c55e';
      case 4: return '#166534';
      default: return '#22c55e';
    }
  };

  useEffect(() => {
    const RO = (typeof ResizeObserver !== 'undefined') ? ResizeObserver : (window as any).ResizeObserver;
    if (wrapperRef.current) {
      const el = wrapperRef.current;
      const ro = new RO((entries: any[]) => {
        for (const entry of entries) {
          const cw = entry.contentRect?.width ?? el.clientWidth;
          setContainerWidth(Math.max(0, cw));
        }
      });
      ro.observe(el);
      setContainerWidth(el.clientWidth);
      const cleanup1 = () => ro.disconnect();
      // also observe chart area height
      if (chartAreaRef.current) {
        const ca = chartAreaRef.current;
        const ro2 = new RO((entries2: any[]) => {
          for (const entry of entries2) {
            const ch = entry.contentRect?.height ?? ca.clientHeight;
            setChartAreaHeight(Math.max(0, ch));
          }
        });
        ro2.observe(ca);
        setChartAreaHeight(ca.clientHeight);
        return () => {
          cleanup1();
          ro2.disconnect();
        };
      }
      return cleanup1;
    }
  }, []);

  const chip = (label: string, delta: number, Icon: typeof ArrowUpRight | typeof ArrowDownRight) => (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${darkMode ? 'bg-gray-800/60 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
      <Icon size={14} className={delta >= 0 ? 'text-green-500' : 'text-red-500'} />
      <span>{label} {Math.abs(delta).toFixed(1)}%</span>
    </div>
  );

  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`} style={{ height: 300 }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Questions Answered This Week</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-2.5 py-1 rounded-md text-sm font-medium border ${chartType === 'line' ? (darkMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-600') : (darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200')}`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('heatmap')}
            className={`px-2.5 py-1 rounded-md text-sm font-medium border ${chartType === 'heatmap' ? (darkMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-600') : (darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200')}`}
          >
            Heatmap
          </button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        {chip('Today', todayDelta, todayDelta >= 0 ? ArrowUpRight : ArrowDownRight)}
        {chip('This week', weeklyDelta, weeklyDelta >= 0 ? ArrowUpRight : ArrowDownRight)}
        {chip('This month', monthDelta, monthDelta >= 0 ? ArrowUpRight : ArrowDownRight)}
      </div>

      <div className="w-full h-[calc(100%-88px)] flex-1" ref={wrapperRef}>
        <div className="w-full h-full" ref={chartAreaRef}>
          {chartType === 'line' ? (
            <ReactApexChart options={lineOptions} series={lineSeries} type="area" height={"100%"} width={"100%"} />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeksCount}, ${cellSizePx}px)`,
                gridTemplateRows: `repeat(7, ${cellSizePx}px)`,
                gap: `${gapPx}px`,
                width: '100%',
                height: '100%',
                alignContent: 'start',
                justifyContent: 'space-between',
              }}
            >
              {gridData.flatMap((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const label = `${cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${cell.value} answered`;
                  const isFuture = cell.isFuture;
                  return (
                    <div key={`${rIdx}-${cIdx}`} className="relative group">
                      <div
                        aria-label={isFuture ? undefined : label}
                        style={{
                          width: `${cellSizePx}px`,
                          height: `${cellSizePx}px`,
                          backgroundColor: isFuture ? 'transparent' : getCellColor(cell.value),
                        }}
                      />
                      {!isFuture && (
                        <div
                          className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs border shadow transition-opacity ${
                            darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
                          } opacity-0 group-hover:opacity-100`}
                        >
                          {label}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


