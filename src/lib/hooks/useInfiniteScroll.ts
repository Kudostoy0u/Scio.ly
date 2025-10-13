import { useEffect } from 'react';

/**
 * Custom hook for implementing infinite scroll functionality
 * Uses Intersection Observer API to detect when a target element comes into view
 * and triggers a callback function for loading more content
 * 
 * @param {HTMLElement | null} target - The DOM element to observe for intersection
 * @param {() => void} onIntersect - Callback function to execute when target intersects
 * @param {IntersectionObserverInit} [options] - Optional Intersection Observer configuration
 * @returns {void} No return value
 * @example
 * ```tsx
 * function InfiniteList() {
 *   const [items, setItems] = useState([]);
 *   const [loading, setLoading] = useState(false);
 *   const loadMoreRef = useRef<HTMLDivElement>(null);
 * 
 *   const loadMore = async () => {
 *     if (loading) return;
 *     setLoading(true);
 *     const newItems = await fetchMoreItems();
 *     setItems(prev => [...prev, ...newItems]);
 *     setLoading(false);
 *   };
 * 
 *   useInfiniteScroll(loadMoreRef.current, loadMore);
 * 
 *   return (
 *     <div>
 *       {items.map(item => <div key={item.id}>{item.name}</div>)}
 *       <div ref={loadMoreRef}>Loading...</div>
 *     </div>
 *   );
 * }
 * ```
 */
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


