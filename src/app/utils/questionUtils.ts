'use client';

import { toast } from 'react-toastify';
import api from '../api';
import { Question } from './geminiService';


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


export const difficultyRanges: Record<string, { min: number; max: number }> = {
  'very-easy': { min: 0, max: 0.19 },
  'easy': { min: 0.20, max: 0.39 },
  'medium': { min: 0.40, max: 0.59 },
  'hard': { min: 0.60, max: 0.79 },
  'very-hard': { min: 0.80, max: 1.0 }
};


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


export const gradeWithGemini = async (
  userAnswer: string,
  correctAnswers: (string | number)[],
  question: string
): Promise<number> => {
  if (!userAnswer) return 0;

  try {

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


export const buildApiParams = (routerParams: RouterParams, requestCount: number): string => {
  const { eventName, difficulties, division, tournament, subtopics, types } = routerParams;
  
  const params: string[] = [];
  

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
  

  if (types) {
    if (types === 'multiple-choice') {
      params.push(`question_type=mcq`);
    } else if (types === 'free-response') {
      params.push(`question_type=frq`);
    }
  }
  

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


export const filterQuestionsByType = (questions: Question[], types: string): Question[] => {
  if (types === 'multiple-choice') {
    return questions.filter((q) => q.options && q.options.length > 0);
  } else if (types === 'free-response') {
    return questions.filter((q) => !q.options || q.options.length === 0);
  }
  return questions;
};


export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


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
  RATE_LIMIT_DELAY: number = 2000
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

    console.log('🚀 Making request to:', api.geminiExplain);
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

    console.log('✅ Received response, status:', response.status);
    const data = await response.json();
    console.log('📦 Received data:', data);
    if (!data.success || !data.data) {
      throw new Error('Invalid response format from API');
    }
    
    const { explanation, correctIndices, correctedAnswers } = data.data;
    let explanationText = explanation;


    if (isMCQ && correctIndices && correctIndices.length > 0) {
      console.log('🔍 Found correct indices in explanation');
      try {
        const suggestedIndices = correctIndices.filter(n => !isNaN(n));
        if (suggestedIndices.length > 0) {
          const correctedAnswers = suggestedIndices;
          const currentAnswers = question.answers || [];
          
          const normalizedCurrentAnswers = currentAnswers.map(ans => 
            typeof ans === 'string' ? parseInt(ans) : ans
          ).filter(n => typeof n === 'number' && !isNaN(n));
          
          const normalizedNewAnswers = correctedAnswers;
          
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


          setData(prevData => {
            const newData = [...prevData];
            newData[index] = { ...newData[index], answers: correctedAnswers };

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

              console.log(`🔍 MCQ Grading Debug for question ${index + 1}:`);
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
        explanationText = explanation;
      }
    }
    

    if (!isMCQ && correctedAnswers && correctedAnswers.length > 0) {
      console.log('🔍 Found corrected answers for FRQ in explanation');
      try {
        const currentAnswers = question.answers || [];
        
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
          
          setData(prevData => {
            const newData = [...prevData];
            newData[index] = { ...newData[index], answers: correctedAnswers };
            
            if (userAnswers) {
              const currentUserAnswers = userAnswers[index] || [];
              const userAnswerText = currentUserAnswers[0] || '';
              
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

    console.log('🎯 Setting explanation text:', explanationText);
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


export const calculateMCQScore = (
  question: Question,
  userAnswers: (string | null)[]
): number => {
  if (!question.answers || question.answers.length === 0) return 0;
  
  const filteredUserAnswers = userAnswers.filter((a) => a !== null) as string[];

  const correctOptions = question.answers.map(ans => question.options![Number(ans)]);


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

    return filteredUserAnswers.length === 1 && filteredUserAnswers[0] === correctOptions[0] ? 1 : 0;
  }
};


export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};