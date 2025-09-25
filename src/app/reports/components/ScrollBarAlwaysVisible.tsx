'use client';

import React from 'react';

export const ScrollBarAlwaysVisible = ({ children, darkMode }: { children: React.ReactNode; darkMode: boolean }) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const thumbRef = React.useRef<HTMLDivElement>(null);
  const [thumbTop, setThumbTop] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [isScrollable, setIsScrollable] = React.useState(false);
  const rafPendingRef = React.useRef(false);

  const recalc = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const trackHeight = el.clientHeight;
    const total = el.scrollHeight;
    const minThumb = 24;
    const hasOverflow = total > trackHeight + 1;
    setIsScrollable(hasOverflow);
    if (!hasOverflow) {
      setThumbHeight(0);
      setThumbTop(0);
      if (thumbRef.current) {
        thumbRef.current.style.height = '0px';
        thumbRef.current.style.transform = 'translateY(0px)';
      }
      return;
    }
    const computedThumbHeight = Math.max(minThumb, Math.floor((trackHeight / total) * trackHeight));
    const maxScroll = Math.max(1, total - trackHeight);
    const maxTop = Math.max(0, trackHeight - computedThumbHeight);
    let newTop = Math.round((el.scrollTop / maxScroll) * maxTop);
    if (el.scrollTop >= maxScroll - 1) newTop = maxTop;
    setThumbHeight(computedThumbHeight);
    setThumbTop(newTop);
    if (thumbRef.current) {
      thumbRef.current.style.transform = `translateY(${newTop}px)`;
      thumbRef.current.style.height = `${computedThumbHeight}px`;
    }
  };

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    recalc();
    const onScroll = () => {
      if (rafPendingRef.current) return;
      rafPendingRef.current = true;
      requestAnimationFrame(() => {
        rafPendingRef.current = false;
        recalc();
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => recalc());
      ro.observe(el);
    } catch {}
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (ro) {
        try { ro.disconnect(); } catch {}
      }
    };
  }, []);

  React.useEffect(() => { recalc(); });

  return (
    <div className="h-full relative">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto pr-2 native-scroll-hidden">{children}</div>
      {isScrollable && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1.5">
          <div className={`absolute inset-y-0 right-0 w-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <div ref={thumbRef} className={`absolute right-0 w-1.5 rounded-full will-change-transform ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ transform: `translateY(${thumbTop}px)`, height: `${thumbHeight}px` }} />
        </div>
      )}
    </div>
  );
};


