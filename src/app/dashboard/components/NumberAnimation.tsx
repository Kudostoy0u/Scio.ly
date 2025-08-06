'use client';

import { useEffect, useState } from 'react';
import { NumberAnimationProps } from '../types';

export default function NumberAnimation({ value, className }: NumberAnimationProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [displayValue, setDisplayValue] = useState(0); // Start with 0 to avoid hydration mismatch

  useEffect(() => {
    setIsMounted(true);
    setDisplayValue(value); // Set the initial value after mounting
  }, [value]);

  useEffect(() => {
    if (!isMounted) return;

    let start = 0;
    const end = value;
    const duration = 1000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, isMounted]);

  // Return the value directly if not mounted (server-side rendering)
  if (!isMounted) {
    return <span className={className}>{value}</span>;
  }

  return <span className={className}>{displayValue}</span>;
} 