import { useEffect } from 'react';

export function useInfiniteScroll(target: HTMLElement | null, onIntersect: () => void, options?: IntersectionObserverInit) {
  useEffect(() => {
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onIntersect();
        }
      }
    }, options ?? { root: null, rootMargin: '0px', threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
    // We intentionally do not include `options` to avoid re-subscribing on shallow changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, onIntersect]);
}


