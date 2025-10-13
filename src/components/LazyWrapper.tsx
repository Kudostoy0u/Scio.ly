'use client';

import React, { Suspense, lazy, ComponentType } from 'react';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Wrapper component for lazy loading with fallback
 */
export function LazyWrapper({ fallback, children }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback || <DefaultFallback />}>
      {children}
    </Suspense>
  );
}

/**
 * Default fallback component
 */
function DefaultFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  );
}

/**
 * Higher-order component for lazy loading components
 */
export function withLazyLoading<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyLoadedComponent(props: T) {
    return (
      <LazyWrapper fallback={fallback}>
        <LazyComponent {...props} />
      </LazyWrapper>
    );
  };
}

/**
 * Hook for lazy loading with intersection observer
 */
export function useLazyLoad(ref: React.RefObject<HTMLElement>, options: IntersectionObserverInit = {}) {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [ref, options]);
  
  return isVisible;
}
