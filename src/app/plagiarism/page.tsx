'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import api from '../api';
import { QuestionItem } from './components/QuestionItem';
import { PlagiarismModal } from './components/PlagiarismModal';
import { ExtractedQuestion, ProcessedQuestions, OfficialQuestion, PlagiarismMatch, QuestionPlagiarismSummary } from './types';

// PDF processing will be handled by the backend API instead of client-side

// types moved to ./types

// Helper functions moved outside component to prevent re-creation on every render
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

const getRiskColor = (riskLevel: string | null) => {
  if (riskLevel === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (riskLevel === 'medium') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (riskLevel === 'low') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const getRiskText = (riskLevel: string | null) => {
  if (riskLevel === 'high') return 'High Risk';
  if (riskLevel === 'medium') return 'Medium Risk';
  if (riskLevel === 'low') return 'Low Risk';
  return 'No Risk';
};

// Memoized Modal component (moved to components) retained here for backward compatibility export if needed
const PlagiarismModalLegacy = memo(({ isOpen, onClose, summary }: { isOpen: boolean; onClose: () => void; summary: QuestionPlagiarismSummary | null }) => {
  if (!isOpen || !summary) return null;

  // All data is pre-calculated - zero processing needed
  const { highRiskMatches, mediumRiskMatches, lowRiskMatches, matches, totalMatches } = summary;
  const highRiskCount = highRiskMatches.length;
  const mediumRiskCount = mediumRiskMatches.length;
  const lowRiskCount = lowRiskMatches.length;
  const totalMatchesCount = matches.length;
  const hasMatches = totalMatchesCount > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">
            Question {summary.questionIndex + 1} - Plagiarism Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                      {/* Original Question */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-slate-800 mb-3">Original Question</h3>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <p className="text-slate-800 mb-4 text-base leading-relaxed break-words">{summary.question.question}</p>
                {summary.question.options && (
                  <div className="space-y-2 mt-4">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Options
                    </div>
                    {summary.question.options.map((option, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
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

          {/* Match Summary */}
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

          {/* All Matches */}
          <div>
            <h3 className="text-lg font-medium text-slate-800 mb-3">
              Top Matches ({totalMatchesCount})
              {totalMatches > totalMatchesCount && (
                <span className="text-sm text-slate-500 ml-2">
                  (showing top 5 of {totalMatches} total)
                </span>
              )}
            </h3>
            {hasMatches ? (
              <div className="space-y-4">
                {matches.map((match, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className={`p-3 ${getSimilarityColor(match.similarity)}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {getSimilarityLabel(match.similarity)} - {(match.similarity * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs font-medium">
                          Match Type: {match.matchType === 'question' ? 'Question Text' : 'Answer Options'}
                        </span>
                      </div>
                    </div>
                    
                                          <div className="p-6 bg-white">
                        <h4 className="font-medium text-slate-800 mb-3">Matched Official Question:</h4>
                        <p className="text-slate-700 text-sm bg-blue-50 p-4 rounded-lg mb-4 leading-relaxed break-words">
                          {match.matchedQuestion.question}
                        </p>
                        {match.matchedQuestion.options?.length > 0 && (
                          <div className="mb-4 space-y-2">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                              Options
                            </div>
                            {match.matchedQuestion.options.map((option, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-600 leading-relaxed break-words">{option}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                            🏆 {match.matchedQuestion.tournament}
                          </span>
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                            📚 Division {match.matchedQuestion.division}
                          </span>
                           <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                             ⭐ Difficulty: {(() => {
                               const value = Number(match.matchedQuestion.difficulty);
                               if (Number.isFinite(value)) return (value * 100).toFixed(0) + '%';
                               return '—';
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

PlagiarismModalLegacy.displayName = 'PlagiarismModalLegacy';

// Memoized Question Item component to prevent re-renders
const QuestionItemLegacy = memo(({ 
  question, 
  index, 
  questionSummaries, 
  onOpenModal 
}: {
  question: ExtractedQuestion;
  index: number;
  questionSummaries: QuestionPlagiarismSummary[];
  onOpenModal: (summary: QuestionPlagiarismSummary) => void;
}) => {
  const summary = questionSummaries.find(s => s && s.questionIndex === index);
  const hasMatches = summary && summary.matches && summary.matches.length > 0;
  
  const getRiskLevel = (questionIndex: number): string | null => {
    const summary = questionSummaries.find(s => s && s.questionIndex === questionIndex);
    if (!summary || !summary.matches || summary.matches.length === 0) return null;
    
    const highestSimilarity = summary.highestSimilarity;
    if (highestSimilarity >= 0.95) return 'high';
    if (highestSimilarity >= 0.85) return 'medium';
    if (highestSimilarity >= 0.40) return 'low';
    return null;
  };

  const riskLevel = hasMatches ? getRiskLevel(index) : null;

  return (
    <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 font-medium text-base leading-relaxed break-words">
                {question.question}
              </p>
            </div>
            {(() => {
              // Show analysis status if this question hasn't been processed yet
              if (!summary) {
                return (
                  <span className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                      Analyzing...
                    </div>
                  </span>
                );
              }
              
              // Show risk bubble if we have matches
              if (riskLevel && hasMatches) {
                return (
                  <button
                    onClick={() => onOpenModal(summary)}
                    className={`ml-4 flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium border-2 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 ${getRiskColor(riskLevel)}`}
                  >
                    {getRiskText(riskLevel)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              }
              
              if (hasMatches) {
                return (
                  <span className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    No Risk
                  </span>
                );
              }
              
              return (
                <span className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  No Matches
                </span>
              );
            })()}
          </div>
          
          {question.type === 'mcq' && question.options && (
            <div className="space-y-2 mb-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Options
              </div>
              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed break-words">
                      {option}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              question.type === 'mcq' 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {question.type === 'mcq' ? 'Multiple Choice' : 'Free Response'}
            </span>
            {summary && hasMatches && (
              <span className="text-xs text-slate-500">
                {summary.matches.length} match{summary.matches.length !== 1 ? 'es' : ''} found
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

QuestionItemLegacy.displayName = 'QuestionItemLegacy';

// Web Worker for fuzzy matching
const createFuzzyMatchingWorker = () => {
  const workerCode = `
    // Optimized string similarity function
    function stringSimilarity(str1, str2) {
      if (str1 === str2) return 1;
      if (str1.length === 0 || str2.length === 0) return 0;
      
      // Quick length-based similarity check
      const lengthDiff = Math.abs(str1.length - str2.length);
      const maxLength = Math.max(str1.length, str2.length);
      if (lengthDiff / maxLength > 0.7) return 0; // Too different in length
      
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      const editDistance = levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    }
    
    // Optimized Levenshtein distance with early termination
    function levenshteinDistance(str1, str2) {
      const len1 = str1.length;
      const len2 = str2.length;
      
      // Early termination for very different lengths
      if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.7) {
        return Math.max(len1, len2);
      }
      
      // Use only 2 rows instead of full matrix for memory efficiency
      let prev = new Array(len2 + 1);
      let curr = new Array(len2 + 1);
      
      for (let j = 0; j <= len2; j++) {
        prev[j] = j;
      }
      
      for (let i = 1; i <= len1; i++) {
        curr[0] = i;
        
        for (let j = 1; j <= len2; j++) {
          if (str1[i - 1] === str2[j - 1]) {
            curr[j] = prev[j - 1];
          } else {
            curr[j] = Math.min(prev[j - 1] + 1, curr[j - 1] + 1, prev[j] + 1);
          }
        }
        
        [prev, curr] = [curr, prev];
      }
      
      return prev[len2];
    }
    
    self.onmessage = function(e) {
      const { inputQuestion, officialQuestions, questionIndex } = e.data;
      
      const questionMatches = [];
      const maxMatches = 5; // Only keep top 5
      
      for (const officialQuestion of officialQuestions) {
        // Compare question text
        const questionSimilarity = stringSimilarity(inputQuestion.question, officialQuestion.question);
        
        if (questionSimilarity > 0.3) {
          questionMatches.push({
            inputQuestion,
            matchedQuestion: officialQuestion,
            similarity: questionSimilarity,
            matchType: 'question'
          });
          
          // Keep only top matches to save memory
          if (questionMatches.length > maxMatches) {
            questionMatches.sort((a, b) => b.similarity - a.similarity);
            questionMatches.splice(maxMatches);
          }
        }
        
        // If MCQ, also compare options (but only if we don't have enough matches)
        if (questionMatches.length < maxMatches && inputQuestion.type === 'mcq' && inputQuestion.options && officialQuestion.options?.length > 0) {
          const inputOptionsText = inputQuestion.options.join(' ');
          const officialOptionsText = officialQuestion.options.join(' ');
          const optionsSimilarity = stringSimilarity(inputOptionsText, officialOptionsText);
          
          if (optionsSimilarity > 0.4) {
            questionMatches.push({
              inputQuestion,
              matchedQuestion: officialQuestion,
              similarity: optionsSimilarity,
              matchType: 'options'
            });
            
            // Keep only top matches
            if (questionMatches.length > maxMatches) {
              questionMatches.sort((a, b) => b.similarity - a.similarity);
              questionMatches.splice(maxMatches);
            }
          }
        }
      }
      
      // Final sort and limit to exactly 5
      questionMatches.sort((a, b) => b.similarity - a.similarity);
      const limitedMatches = questionMatches.slice(0, 5);
      
      // Group matches by risk level with stricter thresholds
      const highRiskMatches = limitedMatches.filter(match => match.similarity >= 0.95);
      const mediumRiskMatches = limitedMatches.filter(match => match.similarity >= 0.85 && match.similarity < 0.95);
      const lowRiskMatches = limitedMatches.filter(match => match.similarity >= 0.40 && match.similarity < 0.85);
      
      const summary = {
        question: inputQuestion,
        questionIndex,
        matches: limitedMatches,
        highRiskMatches,
        mediumRiskMatches,
        lowRiskMatches,
        totalMatches: questionMatches.length,
        highestSimilarity: limitedMatches.length > 0 ? limitedMatches[0].similarity : 0
      };
      
      // Ensure the summary is properly structured
      if (!summary.matches) summary.matches = [];
      if (!summary.highRiskMatches) summary.highRiskMatches = [];
      if (!summary.mediumRiskMatches) summary.mediumRiskMatches = [];
      if (!summary.lowRiskMatches) summary.lowRiskMatches = [];
      
      self.postMessage({ summary, questionIndex });
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

const SCIENCE_OLYMPIAD_EVENTS = [
  "Anatomy - Skeletal",
  "Anatomy - Muscular", 
  "Anatomy - Integumentary",
  "Anatomy - Cardiovascular",
  "Anatomy - Lymphatic",
  "Anatomy - Excretory",
  "Anatomy - Respiratory",
  "Anatomy - Digestive",
  "Anatomy - Immune",
  "Anatomy - Nervous",
  "Anatomy - Sense Organs",
  "Anatomy - Endocrine",
  "Astronomy",
  "Botany",
  "Cell Biology",
  "Chemistry Lab",
  "Circuit Lab",
  "Codebusters",
  "Designer Genes",
  "Detector Building",
  "Disease Detectives",
  "Dynamic Planet - Glaciers",
  "Dynamic Planet - Earthquakes, Volcanoes, and Tectonics",
  "Dynamic Planet - Earth's Fresh Waters",
  "Dynamic Planet - Oceanography",
  "Dynamic Planet - Tectonics",
  "Ecology",
  "Entomology",
  "Environmental Chemistry",
  "Fermi Questions",
  "Forensics",
  "Forestry",
  "Fossils",
  "Geologic Mapping",
  "Gravity Vehicle",
  "Green Generation",
  "Helicopter",
  "Heredity",
  "Herpetology",
  "Hovercraft",
  "Invasive Species",
  "It's About Time",
  "Machines",
  "Materials Science - Ceramics",
  "Materials Science - Polymers and Plastics",
  "Materials Science - General",
  "Microbe Mission",
  "Mission Possible",
  "Meteorology",
  "Metric Mastery",
  "Mousetrap Vehicle",
  "Optics",
  "Ornithology",
  "Physics Lab",
  "Rocks and Minerals",
  "Reach for the Stars",
  "Solar System",
  "Sounds of Music",
  "Thermodynamics",
  "Water Quality - Freshwater",
  "Water Quality - Marine/Estuaries",
  "Water Quality - Freshwater/Estuaries",
  "Wind Power",
  "Potions and Poisons",
  "Crave the Wave",
  "Food Science"
];

export default function PlagiarismPage() {
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [status, setStatus] = useState<string>('Select an event and add content to begin analysis');
  const [inputText, setInputText] = useState<string>('');
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'error' | 'loaded'>('idle');
  const [extractedQuestions, setExtractedQuestions] = useState<ProcessedQuestions | null>(null);
  const [officialQuestions, setOfficialQuestions] = useState<OfficialQuestion[]>([]);
  const [questionSummaries, setQuestionSummaries] = useState<QuestionPlagiarismSummary[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalData, setModalData] = useState<{ isOpen: boolean; summary: QuestionPlagiarismSummary | null }>({
    isOpen: false,
    summary: null
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [lastInputHash, setLastInputHash] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerActive, setIsWorkerActive] = useState(false);
  const analysisScrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const questionSummariesRef = useRef<QuestionPlagiarismSummary[]>([]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Preserve scroll position during updates - only update when summaries actually change
  useEffect(() => {
    if (analysisScrollRef.current && scrollPositionRef.current > 0) {
      analysisScrollRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [questionSummaries]);

  // Save scroll position when user scrolls
  const handleScroll = useCallback(() => {
    if (analysisScrollRef.current) {
      scrollPositionRef.current = analysisScrollRef.current.scrollTop;
    }
  }, []);

  // Check if input has changed to reset button state
  const checkInputChange = useCallback((newInput: string) => {
    // Use a more robust hashing function that handles any characters
    const newHash = newInput.length.toString() + newInput.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (newHash !== lastInputHash) {
      setLastInputHash(newHash);
      setIsAnalyzing(false);
      setHasAnalyzed(false);
      setQuestionSummaries([]);
      setExtractedQuestions(null);
    }
  }, [lastInputHash]);

  // Stable callback for opening modal
  const handleOpenModal = useCallback((summary: QuestionPlagiarismSummary) => {
    setModalData({ isOpen: true, summary });
  }, []);

  // Stable callback for closing modal
  const handleCloseModal = useCallback(() => {
    setModalData({ isOpen: false, summary: null });
  }, []);

  const handleLoadData = useCallback(async (event?: string) => {
    const eventToLoad = event || selectedEvent;
    if (!eventToLoad) {
      setStatus('Please select an event first');
      setLoadingState('idle');
      return;
    }

    setStatus(`Fetching official questions for ${eventToLoad}...`);
    setLoadingState('loading');
    setIsDataLoaded(false);
    
    try {
      // Fetch questions for the selected event with high limit to get all questions
      const response = await fetch(`${api.questions}?event=${encodeURIComponent(eventToLoad)}&limit=50000`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setOfficialQuestions(data.data);
        setStatus(`Data loaded successfully! Found ${data.data.length} official questions for ${eventToLoad}.`);
        setLoadingState('loaded');
        setIsDataLoaded(true);
      } else {
        setStatus('No questions found for this event');
        setLoadingState('error');
        setIsDataLoaded(false);
      }
    } catch (error) {
      setStatus('Error: ' + (error as Error).message);
      setLoadingState('error');
      setIsDataLoaded(false);
    }
  }, [selectedEvent]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setStatus('Processing document...');
    setLoadingState('loading');

    try {
      // Convert file to base64 for backend processing
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          if (result && result.includes(',')) {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error('Failed to convert file to base64.'));
          }
        };
        reader.onerror = (error) => reject(error);
      });
      
      // Send to backend for document processing
      const response = await fetch(api.processPdf, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfData: base64,
          filename: file.name
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const newText = inputText ? `${inputText}\n\n${data.text}` : data.text;
        setInputText(newText);
        checkInputChange(newText);
        setStatus('Document processed successfully.');
        setLoadingState('loaded');
      } else {
        setStatus('Error processing document: ' + data.error);
        setLoadingState('error');
      }
    } catch (error) {
      setStatus('Error processing document: ' + (error as Error).message);
      setLoadingState('error');
    }
  }, [inputText, checkInputChange]);

  const handlePlagiarismAnalysis = useCallback(async () => {
    if (!inputText.trim() || !isDataLoaded) {
      setStatus('Please provide text and load official data first');
      return;
    }

    setStatus('Step 1: Extracting questions...');
    setLoadingState('loading');

    try {
      // Step 1: Extract questions using AI
      const extractResponse = await fetch(api.geminiExtractQuestions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText
        })
      });

      const extractData = await extractResponse.json();
      
      if (!extractData.success) {
        setStatus('Error extracting questions: ' + extractData.error);
        setLoadingState('error');
        return;
      }

      const extractedQuestions = { questions: extractData.data.questions };
      setExtractedQuestions(extractedQuestions);
      setStatus(`Step 2: Starting background analysis...`);

      // Step 2: Use Web Worker for fuzzy matching
      const allMatches: PlagiarismMatch[] = [];
      let completedQuestions = 0;
      
      // Initialize the ref with empty array
      questionSummariesRef.current = new Array(extractedQuestions.questions.length);
      
      // Create worker if not exists
      if (!workerRef.current) {
        workerRef.current = createFuzzyMatchingWorker();
      }
      
      setIsWorkerActive(true);
      setIsAnalyzing(true);
      
      // Set up worker message handler
      const handleWorkerMessage = (event: MessageEvent) => {
        const { summary, questionIndex } = event.data;
        
        // Validate the summary before using it
        if (!summary || typeof summary.questionIndex !== 'number') {
          console.warn('Invalid summary received from worker:', summary);
          return;
        }
        
        // Ensure all required properties exist
        const validSummary = {
          ...summary,
          matches: summary.matches || [],
          highRiskMatches: summary.highRiskMatches || [],
          mediumRiskMatches: summary.mediumRiskMatches || [],
          lowRiskMatches: summary.lowRiskMatches || [],
          totalMatches: summary.totalMatches || 0,
          highestSimilarity: summary.highestSimilarity || 0
        };
        
        // Update the summary for this question using ref to avoid re-renders
        questionSummariesRef.current[questionIndex] = validSummary;
        
        // Only update state periodically to avoid constant re-renders
        const shouldUpdate = questionIndex === questionSummariesRef.current.length - 1 || 
                           (questionIndex + 1) % 10 === 0; // Update every 10 questions
        
        if (shouldUpdate) {
          setQuestionSummaries([...questionSummariesRef.current]);
        }
        
        // Add matches to all matches (but don't update state until end)
        allMatches.push(...validSummary.matches);
        
        completedQuestions++;
        setStatus(`Step 2: Analyzing ${completedQuestions}/${extractedQuestions.questions.length} questions...`);
        
        // Check if all questions are processed
        if (completedQuestions === extractedQuestions.questions.length) {
          // Sort all matches by similarity score (highest first)
          allMatches.sort((a, b) => b.similarity - a.similarity);
          
          setQuestionSummaries([...questionSummariesRef.current]);
                  setStatus(`Analysis completed! Found ${allMatches.length} potential matches across ${extractedQuestions.questions.length} questions.`);
        setLoadingState('loaded');
        setIsWorkerActive(false);
        setIsAnalyzing(false);
        setHasAnalyzed(true);
          
           // Clean up worker
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        }
      };
      
      // Add event listener
      workerRef.current.onmessage = handleWorkerMessage;
      
      // Process each question in the worker
      for (let questionIndex = 0; questionIndex < extractedQuestions.questions.length; questionIndex++) {
        const inputQuestion = extractedQuestions.questions[questionIndex];
        
        // Send question to worker for processing
        workerRef.current.postMessage({
          inputQuestion,
          officialQuestions,
          questionIndex
        });
        
        // Small delay to prevent overwhelming the worker
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
    } catch (error) {
      setStatus('Error: ' + (error as Error).message);
      setLoadingState('error');
      setIsWorkerActive(false);
      setIsAnalyzing(false);
      
      // Clean up worker on error
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    }
  }, [inputText, isDataLoaded, officialQuestions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Science Olympiad Plagiarism Checker</h1>
                        <p className="text-slate-600">Check your test questions against our database of tournaments</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Setup */}
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
              {/* Event Selection */}
              <div>
                <label htmlFor="event-select" className="block text-sm font-medium text-slate-700 mb-2">
                  Select Science Olympiad Event
                </label>
                <select
                  id="event-select"
                  value={selectedEvent}
                  onChange={async (e) => {
                    const event = e.target.value;
                    setSelectedEvent(event);
                    if (event) {
                      await handleLoadData(event);
                    }
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

              {/* Text Input */}
              <div>
                <label htmlFor="text-input" className="block text-sm font-medium text-slate-700 mb-2">
                  Test Content
                </label>
                <div className="space-y-3">
                  <textarea
                    id="text-input"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      checkInputChange(e.target.value);
                    }}
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
                      onChange={handleFileUpload}
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
                onClick={handlePlagiarismAnalysis}
                disabled={!inputText.trim() || !isDataLoaded || isAnalyzing || hasAnalyzed}
                className={`w-full px-6 py-3 rounded-lg transition-all duration-200 font-medium text-lg ${
                  inputText.trim() && isDataLoaded && !isAnalyzing && !hasAnalyzed
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02]' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : hasAnalyzed ? 'Already Analyzed' : 'Check'}
              </button>
            </div>

            {/* Status */}
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

          {/* Right Panel - Analysis */}
          <div className="space-y-6">
            {/* Analysis View */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Analysis</h2>
                {extractedQuestions && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {extractedQuestions.questions.length} questions
                  </span>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-4" ref={analysisScrollRef} onScroll={handleScroll}>
                {extractedQuestions ? (
                  extractedQuestions.questions.map((question, index) => (
                    <QuestionItem
                      key={index}
                      question={question}
                      index={index}
                      questionSummaries={questionSummaries}
                      onOpenModal={handleOpenModal}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <p>Questions will appear here after analysis</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal */}
      <PlagiarismModal 
        isOpen={modalData.isOpen}
        onClose={handleCloseModal}
        summary={modalData.summary}
      />
    </div>
  );
}