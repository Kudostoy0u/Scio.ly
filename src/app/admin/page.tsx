'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '@/app/contexts/ThemeContext';
import api from '@/app/api';

type EditRow = {
  id: string;
  event: string;
  original: Record<string, unknown>;
  edited: Record<string, unknown>;
  updatedAt: string;
  canLocateTarget?: boolean;
};

type BlacklistRow = {
  id: string;
  event: string;
  question: Record<string, unknown>;
  createdAt: string;
  existsInQuestions?: boolean;
};

type AdminOverview = {
  edits: EditRow[];
  blacklists: BlacklistRow[];
  stats?: {
    totalEdits: number;
    totalRemoved: number;
    editsResolvable: number;
    removedResolvable: number;
    byEvent: Record<string, { edits: number; removed: number }>;
  };
};

function Q({ data }: { data: Record<string, unknown> }) {
  const question = (data.question as string) || '';
  const answers = Array.isArray(data.answers) ? (data.answers as unknown[]) : [];
  const options = Array.isArray(data.options) ? (data.options as unknown[]) : [];
  return (
    <div>
      <div className="font-medium break-words whitespace-normal">{question}</div>
      {options.length > 0 && (
        <div className="mt-2 text-sm">
          <div className="font-medium">Options</div>
          <ul className="list-disc ml-5">
            {options.map((o, i) => (
              <li key={i} className={answers.includes(i) || answers.includes(o) ? 'text-green-600 dark:text-green-400' : ''}>
                {String(o)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {options.length === 0 && answers.length > 0 && (
        <div className="mt-2 text-sm">Answer: {answers.map(a => String(a)).join(', ')}</div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { darkMode } = useTheme();
  const [data, setData] = useState<AdminOverview>({ edits: [], blacklists: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'edits' | 'removed'>('edits');
  const [bulkBusy, setBulkBusy] = useState<Record<string, boolean>>({});
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const bg = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const card = darkMode ? 'bg-gray-800' : 'bg-white';
  const border = darkMode ? 'border-gray-700' : 'border-gray-200';
  const muted = darkMode ? 'text-gray-300' : 'text-gray-700';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(api.admin);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setData(json.data as AdminOverview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedEdits = useMemo(() => {
    const map: Record<string, EditRow[]> = {};
    for (const r of data.edits) {
      if (!map[r.event]) map[r.event] = [];
      map[r.event].push(r);
    }
    return map;
  }, [data.edits]);

  const groupedRemoved = useMemo(() => {
    const map: Record<string, BlacklistRow[]> = {};
    for (const r of data.blacklists) {
      if (!map[r.event]) map[r.event] = [];
      map[r.event].push(r);
    }
    return map;
  }, [data.blacklists]);

  const act = async (
    id: string,
    action: 'undoEdit' | 'undoRemove'
  ) => {
    if (busy[id]) return;
    setBusy(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(api.admin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Empty response' }));
      if (!json.success) throw new Error(json.error || 'Action failed');
      // Optimistically remove from local state without full refresh
      if (action === 'undoEdit') {
        setData(prev => ({
          ...prev,
          edits: prev.edits.filter(e => e.id !== id),
        }));
      } else if (action === 'undoRemove') {
        setData(prev => ({
          ...prev,
          blacklists: prev.blacklists.filter(b => b.id !== id),
        }));
      }
      toast.success(json.message || 'Success');
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(prev => ({ ...prev, [id]: false }));
    }
  };

  const bulk = async (action: 'applyAllEdits' | 'applyAllRemoved') => {
    if (bulkBusy[action]) return;
    setBulkBusy(prev => ({ ...prev, [action]: true }));
    try {
      const res = await fetch(api.admin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Empty response' }));
      if (!json.success) throw new Error(json.error || 'Action failed');
      await fetchData();
      setBulkMessage(json.message || 'Done');
    } catch (e) {
      console.error(e);
      setBulkMessage(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBulkBusy(prev => ({ ...prev, [action]: false }));
    }
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="container mx-auto px-4 py-8">
        <div className={`${card} border ${border} rounded-lg p-4 mb-4`}> 
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin</h1>
            <div className="space-x-2">
              <button className={`px-3 py-1 rounded-md ${tab==='edits' ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`} onClick={() => setTab('edits')}>Edits</button>
              <button className={`px-3 py-1 rounded-md ${tab==='removed' ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`} onClick={() => setTab('removed')}>Removed</button>
            </div>
          </div>
          {data.stats && (
            <div className={`mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3`}>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md p-3`}>
                <div className={`text-sm ${muted}`}>Total Edits</div>
                <div className="text-xl font-semibold">{data.stats.totalEdits}</div>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md p-3`}>
                <div className={`text-sm ${muted}`}>Resolvable Edits</div>
                <div className="text-xl font-semibold">{data.stats.editsResolvable}</div>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md p-3`}>
                <div className={`text-sm ${muted}`}>Removed Records</div>
                <div className="text-xl font-semibold">{data.stats.totalRemoved}</div>
              </div>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md p-3`}>
                <div className={`text-sm ${muted}`}>Resolvable Removed</div>
                <div className="text-xl font-semibold">{data.stats.removedResolvable}</div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className={`${card} border ${border} rounded-lg p-6`}>Loading...</div>
        ) : error ? (
          <div className={`${card} border ${border} rounded-lg p-6 text-red-600`}>{error}</div>
        ) : (
          <div className={`${card} border ${border} rounded-lg p-4`}>
            {tab === 'edits' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => bulk('applyAllEdits')} disabled={!!bulkBusy['applyAllEdits']} className={`px-3 py-1 rounded-md ${bulkBusy['applyAllEdits'] ? 'opacity-50' : 'bg-blue-600 text-white'}`}>Apply All Edits</button>
                  <button onClick={() => bulk('applyAllEdits' as any /* placeholder to align UI */)} disabled className="hidden" />
                  <button onClick={async () => {
                    // Reuse bulk API for undo all edits
                    setBulkBusy(prev => ({ ...prev, undoAllEdits: true } as any));
                    try {
                      const res = await fetch(api.admin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'undoAllEdits' }) });
                      const json = await res.json().catch(() => ({ success: false, error: 'Empty response' }));
                      if (!json.success) throw new Error(json.error || 'Action failed');
                      setBulkMessage(json.message || 'Done');
                      await fetchData();
                      toast.success(json.message || 'Done');
                    } catch (e) {
                      setBulkMessage(e instanceof Error ? e.message : 'Action failed');
                      toast.error(e instanceof Error ? e.message : 'Action failed');
                    } finally {
                      setBulkBusy(prev => ({ ...prev, undoAllEdits: false } as any));
                    }
                  }} disabled={!!(bulkBusy as any)['undoAllEdits']} className={`px-3 py-1 rounded-md ${(bulkBusy as any)['undoAllEdits'] ? 'opacity-50' : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>Undo All Edits</button>
                  {bulkMessage && <span className={`text-sm ${muted}`}>{bulkMessage}</span>}
                </div>
                {Object.entries(groupedEdits).map(([event, rows]) => (
                  <div key={event} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{event}</h2>
                      <span className={`${muted} text-sm`}>{rows.length} edits</span>
                    </div>
                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                      {rows.map(r => (
                        <div key={r.id} className={`border ${border} rounded-md p-3`}>
                          <div className="text-xs mb-2 ${muted}">Updated {new Date(r.updatedAt).toLocaleString()}</div>
                          <div className="text-xs mb-2 ${muted}">Target: {r.canLocateTarget ? 'Resolvable' : 'Needs manual mapping'}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className={`${muted} text-sm mb-1`}>Original</div>
                              <Q data={r.original} />
                            </div>
                            <div>
                              <div className={`${muted} text-sm mb-1`}>Edited</div>
                              <Q data={r.edited} />
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => act(r.id, 'undoEdit')} disabled={!!busy[r.id]} className={`px-3 py-1 rounded-md ${busy[r.id] ? 'opacity-50' : darkMode ? 'bg-yellow-600 text-white' : 'bg-yellow-500 text-white'}`}>Undo Edit</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'removed' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => bulk('applyAllRemoved')} disabled={!!bulkBusy['applyAllRemoved']} className={`px-3 py-1 rounded-md ${bulkBusy['applyAllRemoved'] ? 'opacity-50' : 'bg-blue-600 text-white'}`}>Apply All Removes</button>
                  <button onClick={async () => {
                    // Undo all removes (restore all)
                    setBulkBusy(prev => ({ ...prev, restoreAllRemoved: true } as any));
                    try {
                      const res = await fetch(api.admin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restoreAllRemoved' }) });
                      const json = await res.json().catch(() => ({ success: false, error: 'Empty response' }));
                      if (!json.success) throw new Error(json.error || 'Action failed');
                      setBulkMessage(json.message || 'Done');
                      await fetchData();
                      toast.success(json.message || 'Done');
                    } catch (e) {
                      setBulkMessage(e instanceof Error ? e.message : 'Action failed');
                      toast.error(e instanceof Error ? e.message : 'Action failed');
                    } finally {
                      setBulkBusy(prev => ({ ...prev, restoreAllRemoved: false } as any));
                    }
                  }} disabled={!!(bulkBusy as any)['restoreAllRemoved']} className={`px-3 py-1 rounded-md ${(bulkBusy as any)['restoreAllRemoved'] ? 'opacity-50' : darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100'}`}>Undo All Removes</button>
                  {bulkMessage && <span className={`text-sm ${muted}`}>{bulkMessage}</span>}
                </div>
                {Object.entries(groupedRemoved).map(([event, rows]) => (
                  <div key={event} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{event}</h2>
                      <span className={`${muted} text-sm`}>{rows.length} removed</span>
                    </div>
                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                      {rows.map(r => (
                        <div key={r.id} className={`border ${border} rounded-md p-3`}>
                          <div className="text-xs mb-2 ${muted}">Removed {new Date(r.createdAt).toLocaleString()}</div>
                          <Q data={r.question} />
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => act(r.id, 'undoRemove')} disabled={!!busy[r.id]} className={`px-3 py-1 rounded-md ${busy[r.id] ? 'opacity-50' : 'bg-green-600 text-white'}`}>Undo Removal</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


