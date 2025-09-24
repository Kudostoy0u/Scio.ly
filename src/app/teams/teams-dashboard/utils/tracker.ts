export function formatDayAndDate(dt: Date): string {
  const day = dt.toLocaleDateString(undefined, { weekday: 'long' });
  const dateStr = dt.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day}, ${dateStr}`;
}

export function getCountdownParts(targetISO: string): {
  past: boolean;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const target = new Date(targetISO);
  let diffMs = target.getTime() - now.getTime();
  const past = diffMs <= 0;
  if (past) diffMs = Math.abs(diffMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const months = Math.floor(totalSeconds / (30 * 24 * 3600));
  let rem = totalSeconds % (30 * 24 * 3600);
  const weeks = Math.floor(rem / (7 * 24 * 3600));
  rem = rem % (7 * 24 * 3600);
  const days = Math.floor(rem / (24 * 3600));
  rem = rem % (24 * 3600);
  const hours = Math.floor(rem / 3600);
  rem = rem % 3600;
  const minutes = Math.floor(rem / 60);
  const seconds = rem % 60;
  return { past, months, weeks, days, hours, minutes, seconds };
}

export function getTopThreeUnits(parts: {
  past: boolean;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}): Array<{ key: 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds'; label: string; value: number }> {
  const ordered: Array<{
    key: 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';
    label: string;
    value: number;
  }> = [
    { key: 'months', label: 'Months', value: parts.months },
    { key: 'weeks', label: 'Weeks', value: parts.weeks },
    { key: 'days', label: 'Days', value: parts.days },
    { key: 'hours', label: 'Hours', value: parts.hours },
    { key: 'minutes', label: 'Minutes', value: parts.minutes },
    { key: 'seconds', label: 'Seconds', value: parts.seconds },
  ];
  const highestIdx = ordered.findIndex((u) => u.value > 0);
  if (highestIdx === -1) return [ordered[ordered.length - 1]];
  const highestKey = ordered[highestIdx].key;
  if (highestKey === 'months' || highestKey === 'weeks') {
    const next1 = ordered[highestIdx + 1]?.value || 0;
    const next2 = ordered[highestIdx + 2]?.value || 0;
    if (next1 === 0 && next2 === 0) return [ordered[highestIdx]];
    const nonzero = ordered.slice(highestIdx).filter((u) => u.value > 0).slice(0, 3);
    return nonzero.length > 0 ? nonzero : [ordered[highestIdx]];
  }
  if (highestKey === 'days') {
    return [ordered[2], ordered[4], ordered[5]];
  }
  const nonzero = ordered.slice(highestIdx).filter((u) => u.value > 0).slice(0, 3);
  return nonzero.length > 0 ? nonzero : [ordered[highestIdx]];
}


