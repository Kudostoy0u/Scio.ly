'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { 
  syncDashboardData, 
  getInitialDashboardData, 
  updateDashboardMetrics,
  type DashboardData,
  type HistoryRecord 
} from '@/app/utils/dashboardData';
import type { DailyMetrics } from '@/app/utils/metrics';

export interface UseDashboardDataReturn {
  // Data
  metrics: DailyMetrics;
  historyData: Record<string, HistoryRecord>;
  greetingName: string;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  updateMetrics: (updates: {
    questionsAttempted?: number;
    correctAnswers?: number;
    eventName?: string;
  }) => Promise<void>;
}

export function useDashboardData(user: User | null): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardData>(() => getInitialDashboardData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSyncedUserId = useRef<string | null>(null);
  const dataRef = useRef(data);

  // Refresh data from server
  const refreshData = useCallback(async () => {
    console.log('refreshData called with user:', user);
    if (!user || !user.id) {
      console.log('No user or user.id, returning early');
      return;
    }
    
    if (typeof user.id !== 'string' || user.id.trim() === '') {
      console.warn('Invalid user.id:', user.id);
      return;
    }

        // Prevent duplicate calls for the same user
    if (lastSyncedUserId.current === user.id) {
      console.log('Already synced for this user ID, skipping:', user.id);
      return;
    }
    
    // Only show loading if we don't have any meaningful data yet
    const hasData = data.metrics.questionsAttempted > 0 || data.metrics.correctAnswers > 0 || Object.keys(data.historyData).length > 0;
    if (!hasData) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      console.log('Calling syncDashboardData with userId:', user.id);
      const newData = await syncDashboardData(user.id);
      setData(newData);
      lastSyncedUserId.current = user.id;
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [user, data.metrics.questionsAttempted, data.metrics.correctAnswers, data.historyData]);

  // Update dataRef when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Update metrics
  const updateMetrics = useCallback(async (updates: {
    questionsAttempted?: number;
    correctAnswers?: number;
    eventName?: string;
  }) => {
    const userId = user?.id || null;
    
    try {
      const updatedMetrics = await updateDashboardMetrics(userId, updates);
      if (updatedMetrics) {
        setData(prev => ({
          ...prev,
          metrics: updatedMetrics,
        }));
      }
    } catch (err) {
      console.error('Error updating metrics:', err);
      setError('Failed to update metrics');
    }
  }, [user]);

  // Initial data load
  useEffect(() => {
    console.log('Initial data load effect triggered with user:', user);
    if (!user) {
      // Anonymous user: use local data only
      console.log('No user, using local data only');
      setData(getInitialDashboardData());
      lastSyncedUserId.current = null;
      return;
    }

    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      console.log('Invalid user ID, using local data only');
      setData(getInitialDashboardData());
      lastSyncedUserId.current = null;
      return;
    }

    // If we already have synced data for this user, don't sync again
    if (lastSyncedUserId.current === user.id) {
      console.log('Already synced for this user ID, skipping initial sync:', user.id);
      return;
    }

    // For initial load with a valid user, sync with server
    console.log('Initial load with valid user, syncing with server');
    
    const syncData = async () => {
      // Only show loading if we don't have any meaningful data yet
      const hasData = dataRef.current.metrics.questionsAttempted > 0 || dataRef.current.metrics.correctAnswers > 0 || Object.keys(dataRef.current.historyData).length > 0;
      if (!hasData) {
        setIsLoading(true);
      }
      setError(null);
      
      try {
        console.log('Calling syncDashboardData with userId:', user.id);
        const newData = await syncDashboardData(user.id);
        setData(newData);
        lastSyncedUserId.current = user.id;
      } catch (err) {
        console.error('Error refreshing dashboard data:', err);
        setError('Failed to refresh data');
      } finally {
        setIsLoading(false);
      }
    };
    
    syncData();
  }, [user]); // Remove refreshData from dependencies

  // Listen for auth state changes
  useEffect(() => {
    let unsub: (() => void) | undefined;
    
    (async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log('Auth state changed:', _event, session?.user?.id);
        if (session?.user) {
          // User logged in: sync Supabase data with localStorage and update metrics
          console.log('User logged in, syncing data from Supabase to localStorage');
          
          const syncDataOnLogin = async () => {
            try {
              // Sync all data from Supabase to localStorage
              const newData = await syncDashboardData(session.user.id);
              
              // Update the component state with the synced data
              setData(newData);
              lastSyncedUserId.current = session.user.id;
              
              console.log('Successfully synced data on login');
            } catch (err) {
              console.error('Error syncing data on login:', err);
              setError('Failed to sync data on login');
            }
          };
          
          syncDataOnLogin();
        } else {
          // User logged out: reset to local data
          console.log('User logged out, resetting to local data');
          setData(getInitialDashboardData());
          lastSyncedUserId.current = null;
        }
      });
      unsub = () => subscription.unsubscribe();
    })();
    
    return () => {
      if (unsub) unsub();
    };
  }, []); // Use ref to avoid stale closures

  return {
    metrics: data.metrics,
    historyData: data.historyData,
    greetingName: data.greetingName,
    isLoading,
    error,
    refreshData,
    updateMetrics,
  };
}
