'use client';

import React, { useState } from 'react';
import { Subteam } from './rosterUtils';

interface SubteamSelectorProps {
  darkMode: boolean;
  subteams: Subteam[];
  activeSubteamId?: string | null;
  isCaptain: boolean;
  onSubteamChange?: (subteamId: string) => void;
  onCreateSubteam?: (name: string) => void;
  onEditSubteam?: (subteamId: string, newName: string) => void;
  onDeleteSubteam?: (subteamId: string, subteamName: string) => void;
}

export default function SubteamSelector({
  darkMode,
  subteams,
  activeSubteamId,
  isCaptain,
  onSubteamChange,
  onCreateSubteam,
  onEditSubteam,
  onDeleteSubteam
}: SubteamSelectorProps) {
  const [showSubteamSelector, setShowSubteamSelector] = useState(false);
  const [newSubteamName, setNewSubteamName] = useState('');
  const [editingSubteamId, setEditingSubteamId] = useState<string | null>(null);
  const [editingSubteamName, setEditingSubteamName] = useState('');

  console.log('🔍 [SubteamSelector] Component state:', {
    subteams,
    subteamsLength: subteams.length,
    activeSubteamId,
    isCaptain
  });

  if (subteams.length === 0) {
    console.log('🔍 [SubteamSelector] No subteams found, returning null');
    return null;
  }

  return (
    <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {subteams.map((subteam) => (
          <div
            key={subteam.id}
            className={`flex items-center space-x-1 px-4 py-3 rounded-lg border-2 min-w-fit cursor-pointer transition-all ${
              activeSubteamId === subteam.id
                ? (darkMode 
                    ? 'bg-blue-900/30 border-blue-500 text-blue-300' 
                    : 'bg-blue-50 border-blue-500 text-blue-700')
                : (darkMode 
                    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
            }`}
            onClick={() => onSubteamChange?.(subteam.id)}
          >
            {editingSubteamId === subteam.id ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={editingSubteamName}
                  onChange={(e) => setEditingSubteamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingSubteamId(null);
                      setEditingSubteamName('');
                    }
                  }}
                  className={`bg-transparent border-none outline-none font-medium w-20 ${
                    activeSubteamId === subteam.id
                      ? (darkMode ? 'text-blue-300' : 'text-blue-700')
                      : (darkMode ? 'text-gray-300' : 'text-gray-700')
                  }`}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (editingSubteamName.trim() && onEditSubteam) {
                      onEditSubteam(editingSubteamId, editingSubteamName.trim());
                      setEditingSubteamId(null);
                      setEditingSubteamName('');
                    }
                  }}
                  disabled={!editingSubteamName.trim()}
                  className={`p-1 rounded transition-colors ${
                    editingSubteamName.trim()
                      ? (darkMode ? 'hover:bg-green-400/20 text-green-400' : 'hover:bg-green-500/20 text-green-600')
                      : (darkMode ? 'text-gray-500' : 'text-gray-400')
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setEditingSubteamId(null);
                    setEditingSubteamName('');
                  }}
                  className={`p-1 rounded transition-colors ${
                    darkMode ? 'hover:bg-red-400/20 text-red-400' : 'hover:bg-red-500/20 text-red-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <span className="font-medium">{subteam.name}</span>
                {isCaptain && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSubteamId(subteam.id);
                        setEditingSubteamName(subteam.name);
                      }}
                      className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                        activeSubteamId === subteam.id
                          ? 'hover:bg-blue-400'
                          : 'hover:bg-gray-400'
                      }`}
                      title="Edit subteam"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {subteams.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSubteam?.(subteam.id, subteam.name);
                        }}
                        className={`p-1 rounded hover:bg-opacity-20 transition-colors ${
                          activeSubteamId === subteam.id
                            ? 'hover:bg-red-400'
                            : 'hover:bg-red-400'
                        }`}
                        title="Delete subteam"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        
        {/* Add Subteam Button */}
        {isCaptain && (
          <div
            className={`flex items-center space-x-1 px-2 py-2 rounded-lg border-2 min-w-fit cursor-pointer transition-all ${
              showSubteamSelector
                ? (darkMode 
                    ? 'bg-green-900/30 border-green-500 text-green-300' 
                    : 'bg-green-50 border-green-500 text-green-700')
                : (darkMode 
                    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
            }`}
            onClick={() => setShowSubteamSelector(!showSubteamSelector)}
          >
            {showSubteamSelector ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={newSubteamName}
                  onChange={(e) => setNewSubteamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSubteamSelector(false);
                      setNewSubteamName('');
                    }
                  }}
                  placeholder="Enter subteam name"
                  className={`bg-transparent border-none outline-none font-medium w-24 ${
                    darkMode ? 'text-green-300 placeholder-green-400' : 'text-green-700 placeholder-green-500'
                  }`}
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (newSubteamName.trim() && onCreateSubteam) {
                      onCreateSubteam(newSubteamName.trim());
                      setNewSubteamName('');
                      setShowSubteamSelector(false);
                    }
                  }}
                  disabled={!newSubteamName.trim()}
                  className={`p-1 rounded transition-colors ${
                    newSubteamName.trim()
                      ? (darkMode ? 'hover:bg-green-400/20 text-green-400' : 'hover:bg-green-500/20 text-green-600')
                      : (darkMode ? 'text-gray-500' : 'text-gray-400')
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setShowSubteamSelector(false);
                    setNewSubteamName('');
                  }}
                  className={`p-1 rounded transition-colors ${
                    darkMode ? 'hover:bg-red-400/20 text-red-400' : 'hover:bg-red-500/20 text-red-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-medium">Add Subteam</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
