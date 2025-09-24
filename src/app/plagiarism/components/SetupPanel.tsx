'use client';
import React from 'react';
import { SCIENCE_OLYMPIAD_EVENTS } from '../constants';
import { ProcessedQuestions, QuestionPlagiarismSummary } from '../types';

export default function SetupPanel({
  selectedEvent,
  onEventChange,
  inputText,
  onTextChange,
  fileInputRef,
  selectedFile,
  onFileUpload,
  onCheck,
  isDataLoaded,
  isAnalyzing,
  hasAnalyzed,
  loadingState,
  status,
  extractedQuestions,
  questionSummaries,
  isWorkerActive,
}: {
  selectedEvent: string;
  onEventChange: (event: string) => void | Promise<void>;
  inputText: string;
  onTextChange: (text: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheck: () => void | Promise<void>;
  isDataLoaded: boolean;
  isAnalyzing: boolean;
  hasAnalyzed: boolean;
  loadingState: 'idle' | 'loading' | 'error' | 'loaded';
  status: string;
  extractedQuestions: ProcessedQuestions | null;
  questionSummaries: QuestionPlagiarismSummary[];
  isWorkerActive: boolean;
}) {
  const isCheckEnabled = inputText.trim() && isDataLoaded && !isAnalyzing && !hasAnalyzed;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6 h-fit relative">
      <div className="absolute top-3 right-3 group">
        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-help">
          <span className="text-slate-500 text-sm">?</span>
        </div>
        <div className="absolute right-0 top-8 w-64 p-3 bg-white rounded-lg shadow-lg border border-slate-200 text-xs text-slate-600 hidden group-hover:block z-10">
          <h4 className="font-medium text-slate-800 mb-2">How to Use</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Select a Science Olympiad event from the dropdown (automatically loads questions)</li>
            <li>Paste your text or upload a document (PDF/DOCX)</li>
            <li>Click &quot;Check&quot; to extract questions and analyze for plagiarism</li>
            <li>Questions will appear in real-time as they&apos;re analyzed</li>
            <li>Click the risk bubble on any question to see detailed matches</li>
          </ol>
          <p className="mt-2 text-slate-500">The tool extracts questions using AI, then performs fast background analysis against official content.</p>
        </div>
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Setup</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="event-select" className="block text-sm font-medium text-slate-700 mb-2">
            Select Science Olympiad Event
          </label>
          <select
            id="event-select"
            value={selectedEvent}
            onChange={async (e) => {
              const event = e.target.value;
              await onEventChange(event);
            }}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
          >
            <option value="">Choose an event...</option>
            {SCIENCE_OLYMPIAD_EVENTS.map((event) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="text-input" className="block text-sm font-medium text-slate-700 mb-2">
            Test Content
          </label>
          <div className="space-y-3">
            <textarea
              id="text-input"
              value={inputText}
              onChange={(e) => onTextChange(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700 h-32 resize-none"
              placeholder="Paste your test content here..."
            />
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <hr className="flex-1 border-t border-slate-200" />
              <span className="text-slate-400">OR</span>
              <hr className="flex-1 border-t border-slate-200" />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                accept=".pdf,.docx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Upload Document
              </button>
              {selectedFile && (
                <span className="text-sm text-slate-600 truncate">
                  📄 {selectedFile.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={onCheck}
          disabled={!isCheckEnabled}
          className={`w-full px-6 py-3 rounded-lg transition-all duration-200 font-medium text-lg ${
            isCheckEnabled
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? 'Analyzing...' : hasAnalyzed ? 'Already Analyzed' : 'Check'}
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
        <div className={`w-3 h-3 rounded-full ${
          loadingState === 'idle' ? 'bg-slate-400' :
          loadingState === 'loading' ? 'bg-yellow-500 animate-pulse' :
          loadingState === 'error' ? 'bg-red-500' :
          'bg-green-500'
        }`} />
        <div className="flex-1">
          <p className="text-sm text-slate-600">{status}</p>
          {loadingState === 'loading' && extractedQuestions && (
            <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (questionSummaries.length / extractedQuestions.questions.length) * 100)}%` 
                }}
              />
            </div>
          )}
          {isWorkerActive && (
            <p className="text-xs text-blue-600 mt-1">
              ⚡ Using Web Worker
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


