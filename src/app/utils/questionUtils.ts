'use client';

import { toast } from 'react-toastify';
import api from '../api';
import { Question } from './geminiService';

// Types for shared functionality
export interface RouterParams {
  eventName?: string;
  questionCount?: string;
  difficulty?: string;
  difficulties?: string[];
  types?: string;
  timeLimit?: string;
  division?: string;
  tournament?: string;
  subtopic?: string;
  subtopics?: string[];
}

export interface GradingResults {
  [key: string]: number;
}

export interface Explanations {
  [key: number]: string;
}

export interface LoadingExplanation {
  [key: number]: boolean;
}

// Difficulty ranges for API queries
export const difficultyRanges: Record<string, { min: number; max: number }> = {
  'very-easy': { min: 0, max: 0.19 },
  'easy': { min: 0.20, max: 0.39 },
  'medium': { min: 0.40, max: 0.59 },
  'hard': { min: 0.60, max: 0.79 },
  'very-hard': { min: 0.80, max: 1.0 }
};

// Helper function to determine if question is multi-select
export const isMultiSelectQuestion = (question: string, answers?: (number | string)[]): boolean => {
  const multiSelectKeywords = [
    'choose all',
    'select all',
    'all that apply',
    'multi select',
    'multiple select',
    'multiple answers',
    'check all',
    'mark all'
  ];
  
  const hasKeywords = multiSelectKeywords.some(keyword => 
    question.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasKeywords) return true;
  
  if (answers && answers.length > 1) return true;
  
  return false;
};

// Batch grading function for free-response questions using Express API
export const gradeFreeResponses = async (
  freeResponses: { question: string; correctAnswers: (string | number)[]; studentAnswer: string }[]
): Promise<number[]> => {
  if (!freeResponses.length) return [];
  
  try {
    const response = await fetch(api.geminiGradeFreeResponses, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: freeResponses })
    });
    
    if (!response.ok) {
      console.error('API error:', await response.text());
      return freeResponses.map(() => 0);
    }
    
    const data = await response.json();
    if (data.success && data.data.scores) {
      return data.data.scores;
    } else {
      return freeResponses.map(() => 0);
    }
  } catch (error) {
    console.error("Error grading with API:", error);
    return freeResponses.map(() => 0);
  }
};

// Single question grading function
export const gradeWithGemini = async (
  userAnswer: string,
  correctAnswers: (string | number)[],
  question: string
): Promise<number> => {
  if (!userAnswer) return 0;

  try {
    // Use the batch grading API with a single question
    const response = await fetch(api.geminiGradeFreeResponses, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responses: [{
          question: question,
          correctAnswers: correctAnswers,
          studentAnswer: userAnswer
        }]
      })
    });

    if (!response.ok) {
      console.error('API error:', await response.text());
      return 0;
    }

    const data = await response.json();
    if (data.success && data.data.scores && data.data.scores.length > 0) {
      return data.data.scores[0];
    }
    return 0;
  } catch (error) {
    console.error('Error grading with API:', error);
    return 0;
  }
};

// Build API query parameters for fetching questions
export const buildApiParams = (routerParams: RouterParams, requestCount: number): string => {
  const { eventName, difficulties, division, tournament, subtopics, types } = routerParams;
  
  const params: string[] = [];
  
  // Map event name to API format
  let apiEventName = eventName;
  if (eventName === "Dynamic Planet") {
    apiEventName = "Dynamic Planet - Oceanography";
  }
  
  if (apiEventName) params.push(`event=${encodeURIComponent(apiEventName)}`);
  if (division && division !== 'any') params.push(`division=${encodeURIComponent(division)}`);
  if (tournament && tournament !== 'any') params.push(`tournament=${encodeURIComponent(tournament)}`);
  if (subtopics && subtopics.length > 0) {
    params.push(`subtopics=${encodeURIComponent(subtopics.join(','))}`);
  }
  
  // Map question types to API format
  if (types) {
    if (types === 'multiple-choice') {
      params.push(`question_type=mcq`);
    } else if (types === 'free-response') {
      params.push(`question_type=frq`);
    }
  }
  
  // Set difficulty range for multiple difficulties
  if (difficulties && difficulties.length > 0) {
    const allRanges = difficulties.map(d => difficultyRanges[d]).filter(Boolean);
    if (allRanges.length > 0) {
      const minValue = Math.min(...allRanges.map(r => r.min));
      const maxValue = Math.max(...allRanges.map(r => r.max));
      params.push(`difficulty_min=${minValue.toFixed(2)}`);
      params.push(`difficulty_max=${maxValue.toFixed(2)}`);
    }
  }

  params.push(`limit=${requestCount}`);
  
  return params.join('&');
};

// Filter questions based on type
export const filterQuestionsByType = (questions: Question[], types: string): Question[] => {
  if (types === 'multiple-choice') {
    return questions.filter((q) => q.options && q.options.length > 0);
  } else if (types === 'free-response') {
    return questions.filter((q) => !q.options || q.options.length === 0);
  }
  return questions;
};

// Shuffle array utility
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Shared explanation request logic
export const getExplanation = async (
  index: number,
  question: Question,
  userAnswer: (string | null)[],
  routerData: RouterParams,
  explanations: Explanations,
  setExplanations: React.Dispatch<React.SetStateAction<Explanations>>,
  setLoadingExplanation: React.Dispatch<React.SetStateAction<LoadingExplanation>>,
  lastCallTime: number,
  setLastCallTime: React.Dispatch<React.SetStateAction<number>>,
  setData: React.Dispatch<React.SetStateAction<Question[]>>,
  gradingResults: GradingResults,
  setGradingResults: React.Dispatch<React.SetStateAction<GradingResults>>,
  userAnswers?: Record<number, (string | null)[] | null>,
  RATE_LIMIT_DELAY: number = 2000,
  streaming: boolean = true
) => {
  if (explanations[index]) return;

  const now = Date.now();
  if (now - lastCallTime < RATE_LIMIT_DELAY) {
    toast.error('Please wait a moment before requesting another explanation');
    return;
  }
  setLastCallTime(now);

  setLoadingExplanation((prev) => ({ ...prev, [index]: true }));

  try {
    const isMCQ = question.options && question.options.length > 0;

    console.log('Requesting explanation from API', { streaming });
    if (streaming) {
      console.log('🚀 Making streaming request to:', api.geminiExplain);
      const response = await fetch(api.geminiExplain, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          userAnswer: userAnswer,
          event: routerData.eventName || 'Science Olympiad',
          streaming: true,
        })
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        console.error('API Response error:', errorText);
        throw new Error(`Failed to fetch explanation: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Received streaming response, status:', response.status);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aggregatedText = '';
      let cumulativeJsonString = '';
      let finalCorrectIndices: number[] | undefined;
      let finalCorrectedAnswers: any[] | undefined;

             const processEvent = (rawEvent: string) => {
        // Parse SSE frame
        const lines = rawEvent.split('\n').filter(Boolean);
        let eventType = 'message';
        let dataLine = '';
        for (const line of lines) {
          if (line.startsWith('event:')) eventType = line.slice(6).trim();
          if (line.startsWith('data:')) dataLine += line.slice(5).trim();
        }

        if (eventType === 'chunk') {
          console.log('🔍 Received chunk data:', dataLine);
          
          // Add this chunk to our cumulative JSON string
          cumulativeJsonString += dataLine;
          console.log('📝 Cumulative JSON string:', cumulativeJsonString);
          
          // Try to complete the JSON by adding closing quote and brace
          const completedJson = cumulativeJsonString + '"}}';
          console.log('🔧 Attempting to parse completed JSON:', completedJson);
          
          try {
            const parsed = JSON.parse(completedJson);
            if (parsed && typeof parsed.explanation === 'string') {
              aggregatedText = parsed.explanation;
              console.log('✅ Successfully parsed JSON and extracted explanation:', aggregatedText);
              // Convert \n to actual newlines for proper rendering
              const formattedText = aggregatedText.replace(/\\n/g, '\n');
              setExplanations(prev => ({ ...prev, [index]: formattedText }));
            }
          } catch {
            console.log('❌ Failed to parse completed JSON, continuing to accumulate');
          }
          
          // Try to extract correctIndices and correctedAnswers from any JSON-like content
          try {
            const jsonMatch = dataLine.match(/\{[^}]*"correctIndices"[^}]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.correctIndices) {
                finalCorrectIndices = parsed.correctIndices;
                console.log('✅ Extracted correctIndices:', finalCorrectIndices);
              }
              if (parsed.correctedAnswers) {
                finalCorrectedAnswers = parsed.correctedAnswers;
                console.log('✅ Extracted correctedAnswers:', finalCorrectedAnswers);
              }
            }
          } catch {
            // Ignore JSON parsing errors for metadata
          }
        } else if (eventType === 'final') {
          try {
            const payload = JSON.parse(dataLine);
            if (payload && Array.isArray(payload.correctIndices)) {
              finalCorrectIndices = payload.correctIndices as number[];
            }
            if (payload && Array.isArray(payload.correctedAnswers)) {
              finalCorrectedAnswers = payload.correctedAnswers as any[];
            }
            // Use the aggregated text from streaming, not the JSON explanation
            if (payload && typeof payload.explanation === 'string' && !aggregatedText) {
              // Only use JSON explanation if we didn't get streaming text
              aggregatedText = payload.explanation;
              setExplanations(prev => ({ ...prev, [index]: aggregatedText }));
            } else if (payload && typeof payload.explanation === 'string') {
              // Update with the final complete explanation text
              aggregatedText = payload.explanation;
              setExplanations(prev => ({ ...prev, [index]: aggregatedText }));
            }
          } catch (e) {
            console.warn('Failed to parse final payload:', e);
          }
        }
      };

      console.log('🔄 Starting to read streaming data...');
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('✅ Finished reading streaming data');
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        console.log('📦 Received raw chunk:', chunk);
        buffer += chunk;
        let sepIndex;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          if (frame.trim()) {
            console.log('📋 Processing frame:', frame);
            processEvent(frame);
          }
        }
      }
      // Handle any trailing frame
      if (buffer.trim()) {
        console.log('📋 Processing trailing frame:', buffer);
        processEvent(buffer);
      }

      console.log('📊 Final buffer content:', buffer);
      console.log('📊 Final aggregated text:', aggregatedText);

      // If we still don't have explanation text, try to parse the entire buffer as JSON
      if (!aggregatedText && buffer.trim()) {
        console.log('🔍 Trying to parse entire buffer as JSON');
        try {
          const fullData = JSON.parse(buffer);
          console.log('🔍 Parsed full buffer as JSON:', fullData);
          if (fullData && typeof fullData.explanation === 'string') {
            aggregatedText = fullData.explanation;
            console.log('✅ Extracted explanation from full buffer:', aggregatedText);
            setExplanations(prev => ({ ...prev, [index]: aggregatedText }));
          }
        } catch (e) {
          console.log('❌ Failed to parse full buffer as JSON:', e);
        }
      }

      // After streaming done, optionally apply correctIndices logic below
      const correctIndices = finalCorrectIndices;
      const correctedAnswers = finalCorrectedAnswers;
      
      // Ensure we have the final explanation text
      let explanationText = aggregatedText.trim();
      
      if (isMCQ && correctIndices && correctIndices.length > 0) {
        // Same logic as non-streaming path below to update answers and grading
        try {
          const suggestedIndices = correctIndices.filter(n => !isNaN(n));
          if (suggestedIndices.length > 0) {
            const correctedAnswers = suggestedIndices;
            const currentAnswers = question.answers || [];
            const normalizedCurrentAnswers = currentAnswers.map(ans => 
              typeof ans === 'string' ? parseInt(ans) : ans
            ).filter(n => typeof n === 'number' && !isNaN(n));
            const normalizedNewAnswers = correctedAnswers;
            const answersChanged = !(
              normalizedNewAnswers.length === normalizedCurrentAnswers.length &&
              normalizedNewAnswers.every(val => normalizedCurrentAnswers.includes(val)) &&
              normalizedCurrentAnswers.every(val => normalizedNewAnswers.includes(val))
            );

                      if (answersChanged) {
            console.log("✅ Explanation suggested different answers, submitting edit request.");
            const newQ = { ...question, answers: correctedAnswers } as Question;
            
            // Show toast notification
            toast.info('Answer has been updated based on explanation');
            
            try {
              await fetch(api.reportEdit, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: question.question,
                  answer: question.answers,
                  originalQuestion: question,
                  editedQuestion: newQ,
                  event: routerData.eventName || 'Unknown Event',
                  reason: 'Explanation corrected answers',
                  bypass: true
                }),
              });
            } catch (editError) {
              console.error('Failed to submit auto-edit request:', editError);
            }
          }

          // Always update the answers in the main data state and regrade (regardless of whether answers changed)
          setData(prevData => {
            const newData = [...prevData];
            newData[index] = { ...newData[index], answers: correctedAnswers };

            if (userAnswers) {
              const currentUserAnswers = userAnswers[index] || [];
              const isMulti = isMultiSelectQuestion(newData[index].question, correctedAnswers);
              const userNumericAnswers = currentUserAnswers
                .map(ans => {
                  const idx = newData[index].options?.indexOf(ans ?? '');
                  return idx !== undefined && idx >= 0 ? idx : -1;
                })
                .filter(idx => idx >= 0);

              let isNowCorrect = false;
              if (isMulti) {
                isNowCorrect = correctedAnswers.every(correctAns => userNumericAnswers.includes(correctAns)) &&
                               userNumericAnswers.length === correctedAnswers.length;
              } else {
                isNowCorrect = correctedAnswers.includes(userNumericAnswers[0]);
              }

              console.log(`🔍 MCQ Grading Debug for question ${index + 1}:`);
              console.log(`  User's numeric answers:`, userNumericAnswers);
              console.log(`  Corrected answers:`, correctedAnswers);
              console.log(`  Is multi-select:`, isMulti);
              console.log(`  Is now correct:`, isNowCorrect);
              console.log(`  Current grading result:`, gradingResults[index]);

              if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
                console.log(`✅ Updating grading result for question ${index + 1} to Correct based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 1 }));
              } else if (!isNowCorrect && gradingResults[index] === 1) {
                console.log(`❌ Updating grading result for question ${index + 1} to Incorrect based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 0 }));
              } else {
                console.log(`ℹ️ No grading change needed for question ${index + 1}`);
              }
            }

            return newData;
          });
          }
        } catch (parseError) {
          console.error('Failed to process correct indices:', parseError);
          explanationText = aggregatedText;
        }
      }
      
      // Handle FRQ answer corrections in streaming
      if (!isMCQ && correctedAnswers && correctedAnswers.length > 0) {
        console.log('🔍 Found corrected answers for FRQ in streaming explanation');
        try {
          const currentAnswers = question.answers || [];
          
          // Compare new answers with existing ones
          const answersChanged = !(
            correctedAnswers.length === currentAnswers.length &&
            correctedAnswers.every((ans: any, idx: number) => 
              String(ans).toLowerCase().trim() === String(currentAnswers[idx]).toLowerCase().trim()
            )
          );
          
          console.log('🔍 FRQ Answer Comparison Debug (Streaming):');
          console.log('  Original question.answers:', currentAnswers);
          console.log('  Explanation suggested answers:', correctedAnswers);
          console.log('  Answers changed?', answersChanged);
          
          if (answersChanged) {
            console.log("✅ Explanation suggested different answers for FRQ, submitting edit request.");
            const newQ = { ...question, answers: correctedAnswers };
            
            // Show toast notification
            toast.info('Answer has been updated based on explanation');
            
            try {
              await fetch(api.reportEdit, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: question.question,
                  answer: question.answers,
                  originalQuestion: question,
                  editedQuestion: newQ,
                  event: routerData.eventName || 'Unknown Event',
                  reason: "Explanation corrected answers",
                  bypass: true
                }),
              });
            } catch (editError) {
              console.error("Failed to submit auto-edit request:", editError);
            }
            
            // Update the answers in the main data state and regrade
            setData(prevData => {
              const newData = [...prevData];
              newData[index] = { ...newData[index], answers: correctedAnswers };
              
              // Always regrade the question with the current answers (original or corrected)
              if (userAnswers) {
                const currentUserAnswers = userAnswers[index] || [];
                const userAnswerText = currentUserAnswers[0] || '';
                
                // For FRQ, we need to check if the user's answer matches any of the corrected answers
                let isNowCorrect = false;
                if (userAnswerText.trim()) {
                  isNowCorrect = correctedAnswers.some(correctAnswer => 
                    String(correctAnswer).toLowerCase().trim() === userAnswerText.toLowerCase().trim()
                  );
                }
                
                if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
                  console.log(`Updating grading result for question ${index + 1} to Correct based on explanation.`);
                  setGradingResults(prev => ({ ...prev, [index]: 1 }));
                } else if (!isNowCorrect && gradingResults[index] === 1) {
                  console.log(`Updating grading result for question ${index + 1} to Incorrect based on explanation.`);
                  setGradingResults(prev => ({ ...prev, [index]: 0 }));
                }
              }
              
              return newData;
            });
          } else {
            console.log("✅ Explanation confirmed existing FRQ answers are correct - no edit needed.");
          }
          
          // Always update the answers in the main data state and regrade (even if answers didn't change)
          setData(prevData => {
            const newData = [...prevData];
            newData[index] = { ...newData[index], answers: correctedAnswers };
            
            // Always regrade the question with the current answers (original or corrected)
            if (userAnswers) {
              const currentUserAnswers = userAnswers[index] || [];
              const userAnswerText = currentUserAnswers[0] || '';
              
              // For FRQ, we need to check if the user's answer matches any of the corrected answers
              let isNowCorrect = false;
              if (userAnswerText.trim()) {
                isNowCorrect = correctedAnswers.some(correctAnswer => 
                  String(correctAnswer).toLowerCase().trim() === userAnswerText.toLowerCase().trim()
                );
              }
              
              if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
                console.log(`Updating grading result for question ${index + 1} to Correct based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 1 }));
              } else if (!isNowCorrect && gradingResults[index] === 1) {
                console.log(`Updating grading result for question ${index + 1} to Incorrect based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 0 }));
              }
            }
            
            return newData;
          });
        } catch (parseError) {
          console.error("Failed to parse corrected answers for FRQ:", parseError);
        }
      }

      // Ensure explanation text is set at the end
      const finalExplanationText = explanationText || aggregatedText;
      console.log('🎯 Setting final explanation text:', finalExplanationText);
      setExplanations(prev => ({ ...prev, [index]: finalExplanationText }));
      return;
    }

    // Non-streaming fallback
    console.log('🚀 Making non-streaming request to:', api.geminiExplain);
    const response = await fetch(api.geminiExplain, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        userAnswer: userAnswer,
        event: routerData.eventName || 'Science Olympiad'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Response error:', errorText);
      throw new Error(`Failed to fetch explanation: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Received non-streaming response, status:', response.status);
    const data = await response.json();
    console.log('📦 Received non-streaming data:', data);
    if (!data.success || !data.data) {
      throw new Error('Invalid response format from API');
    }
    
    const { explanation, correctIndices, correctedAnswers } = data.data;
    const fullResponse = explanation;

    // Modified response parsing logic
    let explanationText = fullResponse;
    
    // Handle MCQ answer corrections
    if (isMCQ && correctIndices && correctIndices.length > 0) {
      // Extract and parse indices if marker is found for MCQ
      console.log('🔍 Found "Correct Indices" marker in explanation');
      try {
        const suggestedIndices = correctIndices.filter(n => !isNaN(n));
        if (suggestedIndices.length > 0) {
          // The API returns 0-based indices, so use them directly
          const correctedAnswers = suggestedIndices;

          // Compare new indices with existing ones
          const currentAnswers = question.answers || [];
          
          // Normalize both arrays to numbers for comparison
          const normalizedCurrentAnswers = currentAnswers.map(ans => 
            typeof ans === 'string' ? parseInt(ans) : ans
          ).filter(n => typeof n === 'number' && !isNaN(n));
          
          const normalizedNewAnswers = correctedAnswers;
          
          // Debug logging
          console.log('🔍 Answer Comparison Debug:');
          console.log('  Original question.answers:', currentAnswers);
          console.log('  Normalized current answers:', normalizedCurrentAnswers);
          console.log('  Explanation suggested answers:', normalizedNewAnswers);
          
          const answersChanged = !(
            normalizedNewAnswers.length === normalizedCurrentAnswers.length &&
            normalizedNewAnswers.every(val => normalizedCurrentAnswers.includes(val)) &&
            normalizedCurrentAnswers.every(val => normalizedNewAnswers.includes(val))
          );
          
          console.log('  Answers changed?', answersChanged);

          if (answersChanged) {
            console.log("✅ Explanation suggested different answers, submitting edit request.");
            const newQ = { ...question, answers: correctedAnswers };
            
            // Show toast notification
            toast.info('Answer has been updated based on explanation');
            
            try {
              await fetch(api.reportEdit, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: question.question,
                  answer: question.answers,
                  originalQuestion: question,
                  editedQuestion: newQ,
                  event: routerData.eventName || 'Unknown Event',
                  reason: "Explanation corrected answers",
                  bypass: true
                }),
              });
            } catch (editError) {
              console.error("Failed to submit auto-edit request:", editError);
            }
          } else {
            console.log("✅ Explanation confirmed existing answers are correct - no edit needed.");
          }

          // Always update the answers in the main data state and regrade (even if answers didn't change)
          setData(prevData => {
            const newData = [...prevData];
            newData[index] = { ...newData[index], answers: correctedAnswers };

            // Always regrade the question with the current answers (original or corrected)
            if (userAnswers) {
              const currentUserAnswers = userAnswers[index] || [];
              const correctAnswers = correctedAnswers;
              const isMulti = isMultiSelectQuestion(newData[index].question, correctAnswers);

              const userNumericAnswers = currentUserAnswers
                .map(ans => {
                  const idx = newData[index].options?.indexOf(ans ?? "");
                  return idx !== undefined && idx >= 0 ? idx : -1;
                })
                .filter(idx => idx >= 0);

              let isNowCorrect = false;
              if (isMulti) {
                isNowCorrect = correctAnswers.every(correctAns => userNumericAnswers.includes(correctAns)) &&
                               userNumericAnswers.length === correctAnswers.length;
              } else {
                isNowCorrect = correctAnswers.includes(userNumericAnswers[0]);
              }

              console.log(`🔍 MCQ Grading Debug for question ${index + 1} (Non-streaming):`);
              console.log(`  User's numeric answers:`, userNumericAnswers);
              console.log(`  Corrected answers:`, correctAnswers);
              console.log(`  Is multi-select:`, isMulti);
              console.log(`  Is now correct:`, isNowCorrect);
              console.log(`  Current grading result:`, gradingResults[index]);

              if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
                console.log(`✅ Updating grading result for question ${index + 1} to Correct based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 1 }));
              } else if (!isNowCorrect && gradingResults[index] === 1) {
                console.log(`❌ Updating grading result for question ${index + 1} to Incorrect based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 0 }));
              } else {
                console.log(`ℹ️ No grading change needed for question ${index + 1}`);
              }
            }

            return newData;
          });
        }
      } catch (parseError) {
        console.error("Failed to parse correct indices:", parseError);
        explanationText = fullResponse;
      }
    } else {
      console.log('🔍 No "Correct Indices" marker found in explanation or not MCQ');
      console.log('  Is MCQ?', isMCQ);
    }
    
    // Handle FRQ answer corrections
    if (!isMCQ && correctedAnswers && correctedAnswers.length > 0) {
      console.log('🔍 Found corrected answers for FRQ in explanation');
      try {
        const currentAnswers = question.answers || [];
        
        // Compare new answers with existing ones
        const answersChanged = !(
          correctedAnswers.length === currentAnswers.length &&
          correctedAnswers.every((ans: any, idx: number) => 
            String(ans).toLowerCase().trim() === String(currentAnswers[idx]).toLowerCase().trim()
          )
        );
        
        console.log('🔍 FRQ Answer Comparison Debug:');
        console.log('  Original question.answers:', currentAnswers);
        console.log('  Explanation suggested answers:', correctedAnswers);
        console.log('  Answers changed?', answersChanged);
        
        if (answersChanged) {
          console.log("✅ Explanation suggested different answers for FRQ, submitting edit request.");
          const newQ = { ...question, answers: correctedAnswers };
          
          // Show toast notification
          toast.info('Answer has been updated based on explanation');
          
          try {
            await fetch(api.reportEdit, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: question.question,
                answer: question.answers,
                originalQuestion: question,
                editedQuestion: newQ,
                event: routerData.eventName || 'Unknown Event',
                reason: "Explanation corrected answers",
                bypass: true
              }),
            });
          } catch (editError) {
            console.error("Failed to submit auto-edit request:", editError);
          }
          
          // Update the answers in the main data state and regrade
          setData(prevData => {
            const newData = [...prevData];
            newData[index] = { ...newData[index], answers: correctedAnswers };
            
            // Always regrade the question with the current answers (original or corrected)
            if (userAnswers) {
              const currentUserAnswers = userAnswers[index] || [];
              const userAnswerText = currentUserAnswers[0] || '';
              
              // For FRQ, we need to check if the user's answer matches any of the corrected answers
              let isNowCorrect = false;
              if (userAnswerText.trim()) {
                isNowCorrect = correctedAnswers.some(correctAnswer => 
                  String(correctAnswer).toLowerCase().trim() === userAnswerText.toLowerCase().trim()
                );
              }
              
              if (isNowCorrect && (gradingResults[index] ?? 0) !== 1) {
                console.log(`Updating grading result for question ${index + 1} to Correct based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 1 }));
              } else if (!isNowCorrect && gradingResults[index] === 1) {
                console.log(`Updating grading result for question ${index + 1} to Incorrect based on explanation.`);
                setGradingResults(prev => ({ ...prev, [index]: 0 }));
              }
            }
            
            return newData;
          });
        } else {
          console.log("✅ Explanation confirmed existing FRQ answers are correct - no edit needed.");
        }
      } catch (parseError) {
        console.error("Failed to parse corrected answers for FRQ:", parseError);
      }
    }

    console.log('🎯 Setting non-streaming explanation text:', explanationText);
    setExplanations((prev) => ({ ...prev, [index]: explanationText }));

  } catch (error) {
    console.error('Error in getExplanation:', error);
    const errorMsg = `Failed to load explanation: ${(error as Error).message}`;
    setExplanations((prev) => ({
      ...prev,
      [index]: errorMsg,
    }));
    toast.error(errorMsg);
  } finally {
    setLoadingExplanation((prev) => ({ ...prev, [index]: false }));
  }
};

// Calculate score for multiple choice questions
export const calculateMCQScore = (
  question: Question,
  userAnswers: (string | null)[]
): number => {
  if (!question.answers || question.answers.length === 0) return 0;
  
  const filteredUserAnswers = userAnswers.filter((a) => a !== null) as string[];
  // Answers are already 0-based, so use them directly
  const correctOptions = question.answers.map(ans => question.options![Number(ans)]);

  // Check if multi-select
  if (isMultiSelectQuestion(question.question, question.answers)) {
    if (filteredUserAnswers.length === 0) return 0;

    const numCorrectSelected = filteredUserAnswers.filter((a) => correctOptions.includes(a)).length;
    const hasIncorrectAnswers = filteredUserAnswers.some(a => !correctOptions.includes(a));

    if (numCorrectSelected === correctOptions.length && !hasIncorrectAnswers) {
      return 1;
    } else if (numCorrectSelected > 0) {
      return 0.5;
    }
    return 0;
  } else {
    // Single selection
    return filteredUserAnswers.length === 1 && filteredUserAnswers[0] === correctOptions[0] ? 1 : 0;
  }
};

// Format time utility
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};