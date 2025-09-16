'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
// import { supabase } from '@/lib/supabase';
import { 
  coalescedSyncDashboardData as syncDashboardData, 
  getInitialDashboardData, 
  updateDashboardMetrics,
  type DashboardData,
  type HistoryRecord 
} from '@/app/utils/dashboardData';
import type { DailyMetrics } from '@/app/utils/metrics';

export interface UseDashboardDataReturn {

  metrics: DailyMetrics;
  historyData: Record<string, HistoryRecord>;
  greetingName: string;
  

  isLoading: boolean;
  error: string | null;
  

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


    if (lastSyncedUserId.current === user.id) {
      console.log('Already synced for this user ID, skipping:', user.id);
      return;
    }
    

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


  useEffect(() => {
    dataRef.current = data;
  }, [data]);


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


  useEffect(() => {
    console.log('Initial data load effect triggered with user:', user);
    if (!user) {

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


    if (lastSyncedUserId.current === user.id) {
      console.log('Already synced for this user ID, skipping initial sync:', user.id);
      return;
    }


    console.log('Initial load with valid user, syncing with server');
    
    const syncData = async () => {

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
  }, [user]);


  // Auth state handling moved to AuthContext; no additional auth listeners here

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