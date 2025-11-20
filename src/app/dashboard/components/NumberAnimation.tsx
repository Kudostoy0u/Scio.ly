"use client";

import { useEffect, useRef, useState } from "react";
import type { NumberAnimationProps } from "@/app/dashboard/types";

export default function NumberAnimation({ value, className }: NumberAnimationProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const prev = prevValueRef.current;
    prevValueRef.current = value;

    if (prev === null) {
      setDisplayValue(value);
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const startValue = prev;
    const endValue = value;
    if (startValue === endValue) {
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();

    const easeOut = (t: number) => 1 - (1 - t) ** 3;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOut(t);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, isMounted]);

  if (!isMounted) {
    return <span className={className}>{value}</span>;
  }

  return <span className={className}>{displayValue}</span>;
}
