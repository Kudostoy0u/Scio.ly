'use client';

import { memo } from 'react';
import { ModalProps } from '../types';

const getSimilarityColor = (similarity: number) => {
  if (similarity >= 0.8) return 'text-red-600 bg-red-50';
  if (similarity >= 0.6) return 'text-orange-600 bg-orange-50';
  if (similarity >= 0.4) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
};

const getSimilarityLabel = (similarity: number) => {
  if (similarity >= 0.8) return 'Very High Risk';
  if (similarity >= 0.6) return 'High Risk';
  if (similarity >= 0.4) return 'Low Risk';
  return 'No Risk';
};

export const PlagiarismModal = memo(({ isOpen, onClose, summary }: ModalProps) => {
  if (!isOpen || !summary) return null;

  const { highRiskMatches, mediumRiskMatches, lowRiskMatches, matches, totalMatches } = summary;
  const highRiskCount = highRiskMatches.length;
  const mediumRiskCount = mediumRiskMatches.length;
  const lowRiskCount = lowRiskMatches.length;
  const totalMatchesCount = matches.length;
  const hasMatches = totalMatchesCount > 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Question {summary.questionIndex + 1} - Plagiarism Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Original Question</h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <p className="text-slate-800 mb-4 text-base leading-relaxed break-words">{summary.question.question}</p>
              {summary.question.options && (
                <div className="space-y-2 mt-4">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Options</div>
                  {summary.question.options.map((option, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-relaxed break-words">{option}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  summary.question.type === 'mcq'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {summary.question.type === 'mcq' ? 'Multiple Choice' : 'Free Response'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Match Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
                <div className="text-sm text-red-700">High Risk Matches</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{mediumRiskCount}</div>
                <div className="text-sm text-orange-700">Medium Risk Matches</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{lowRiskCount}</div>
                <div className="text-sm text-yellow-700">Low Risk Matches</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-800 mb-3">
              Top Matches ({totalMatchesCount})
              {totalMatches > totalMatchesCount && (
                <span className="text-sm text-slate-500 ml-2">(showing top 5 of {totalMatches} total)</span>
              )}
            </h3>
            {hasMatches ? (
              <div className="space-y-4">
                {matches.map((match, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className={`p-3 ${getSimilarityColor(match.similarity)}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getSimilarityLabel(match.similarity)} - {(match.similarity * 100).toFixed(1)}%</span>
                        <span className="text-xs font-medium">Match Type: {match.matchType === 'question' ? 'Question Text' : 'Answer Options'}</span>
                      </div>
                    </div>
                    <div className="p-6 bg-white">
                      <h4 className="font-medium text-slate-800 mb-3">Matched Official Question:</h4>
                      <p className="text-slate-700 text-sm bg-blue-50 p-4 rounded-lg mb-4 leading-relaxed break-words">{match.matchedQuestion.question}</p>
                      {match.matchedQuestion.options?.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Options</div>
                          {match.matchedQuestion.options.map((option, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-600 leading-relaxed break-words">{option}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">🏆 {match.matchedQuestion.tournament}</span>
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">📚 Division {match.matchedQuestion.division}</span>
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                          ⭐ Difficulty: {(() => {
                            const v = Number(match.matchedQuestion.difficulty);
                            return Number.isFinite(v) ? (v * 100).toFixed(0) + '%' : '—';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No significant matches found for this question.</p>
                <p className="text-sm mt-1">This question appears to be original content.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

PlagiarismModal.displayName = 'PlagiarismModal';


