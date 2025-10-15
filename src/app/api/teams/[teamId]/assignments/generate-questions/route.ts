import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getEventCapabilities, validateEventName } from '@/lib/utils/eventConfig';
import { resolveTeamSlugToUnits, isUserCaptain } from '@/lib/utils/team-resolver';
import { parseDifficulty, getDifficultyRange } from '@/lib/types/difficulty';
import { QuestionGenerationRequestSchema, AssignmentQuestionSchema } from '@/lib/schemas/question';
import { z } from 'zod';

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const buildAbsoluteUrl = (src?: string, origin?: string): string | undefined => {
  if (!src) return undefined;
  try {
    if (/^https?:\/\//i.test(src)) return src;
    if (origin && src.startsWith('/')) return `${origin}${src}`;
    return src;
  } catch {
    return src;
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const body = await request.json();
    
    // Strict validation of request body
    const validatedRequest = QuestionGenerationRequestSchema.parse(body);
    
    const {
      event_name,
      question_count,
      question_types,
      subtopics,
      time_limit_minutes,
      division,
      id_percentage: idPercentage,
      pure_id_only: pureIdOnly,
      difficulties
    } = validatedRequest;
    
    // Debug logging for difficulty parameters
    console.log('🎯 DIFFICULTY DEBUG - Request received:', {
      difficulties,
      event_name,
      question_count,
      question_types
    });
    

    // Event name mapping for special cases
    const eventNameMapping: Record<string, string> = {
      'Dynamic Planet': 'Dynamic Planet - Oceanography',
      'Water Quality': 'Water Quality - Freshwater',
      'Materials Science': 'Materials Science - Nanomaterials'
    };

    // Handle Anatomy & Physiology distribution
    const anatomyEvents = [
      'Anatomy - Endocrine',
      'Anatomy - Nervous',
      'Anatomy - Sense Organs'
    ];

    let eventName = validateEventName(event_name);
    let targetEvents: string[] = [eventName];

    // Apply event name mapping
    if (eventNameMapping[eventName]) {
      eventName = eventNameMapping[eventName];
      targetEvents = [eventName];
    }

    // Handle Anatomy & Physiology distribution
    if (eventName === 'Anatomy & Physiology') {
      targetEvents = anatomyEvents;
    }
    
    // Debug logging for event processing
    console.log('🎯 DIFFICULTY DEBUG - Event processing:', {
      originalEventName: event_name,
      validatedEventName: eventName,
      targetEvents,
      eventNameMapping: eventNameMapping[eventName]
    });

    const capabilities = getEventCapabilities(eventName);

    // Resolve team slug to team units and verify user has access
    const teamInfo = await resolveTeamSlugToUnits(teamId);
    
    // Check if user is captain or co-captain of any team unit in this group
    const isCaptain = await isUserCaptain(user.id, teamInfo.teamUnitIds);
    
    if (!isCaptain) {
      return NextResponse.json({ error: 'Only captains can generate questions' }, { status: 403 });
    }

    // Fetch questions from multiple events if needed (e.g., Anatomy & Physiology)
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const allQuestions: any[] = [];

    // Calculate distribution for multiple events
    const calculateEventDistribution = (totalQuestions: number, numEvents: number): number[] => {
      const basePerEvent = Math.floor(totalQuestions / numEvents);
      const remainder = totalQuestions % numEvents;
      const distribution = Array(numEvents).fill(basePerEvent);
      
      // Distribute remainder to first few events
      for (let i = 0; i < remainder; i++) {
        distribution[i]++;
      }
      
      return distribution;
    };

    const eventDistribution = calculateEventDistribution(question_count, targetEvents.length);

    for (let i = 0; i < targetEvents.length; i++) {
      const targetEvent = targetEvents[i];
      const currentEventLimit = eventDistribution[i];

      // Build query parameters for question fetching
      const queryParams = new URLSearchParams();
      queryParams.set('event', targetEvent);
      queryParams.set('limit', String(Math.min(currentEventLimit, capabilities.maxQuestions)));
      
      // Handle question types - only set question_type if it's not "both"
      if (question_types.includes('multiple_choice') && !question_types.includes('free_response')) {
        queryParams.set('question_type', 'mcq');
      } else if (question_types.includes('free_response') && !question_types.includes('multiple_choice')) {
        queryParams.set('question_type', 'frq');
      }
      // If both types are included, don't set question_type parameter to allow both types
      
      // Handle division - use 'both' or the only available division
      if (division !== 'both') {
        queryParams.set('division', division);
      }
      
      // Handle subtopics
      if (subtopics && subtopics.length > 0) {
        queryParams.set('subtopics', subtopics.join(','));
      }
      
      // Handle difficulties with strict validation
      if (difficulties && difficulties.length > 0 && !difficulties.includes('any')) {
        try {
          const { min, max } = getDifficultyRange(difficulties);
          queryParams.set('difficulty_min', min.toFixed(2));
          queryParams.set('difficulty_max', max.toFixed(2));
        } catch (error) {
          console.error('🎯 DIFFICULTY ERROR - Invalid difficulty range:', error);
          throw new Error(`Invalid difficulty configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
        // Fetch questions from the main questions API
        const apiUrl = `${origin}/api/questions?${queryParams.toString()}`;
        console.log(`🎯 DIFFICULTY DEBUG - Fetching from API: ${apiUrl}`);
        console.log(`🎯 DIFFICULTY DEBUG - Query params:`, Object.fromEntries(queryParams.entries()));
        
        const questionsResponse = await fetch(apiUrl, {
          cache: 'no-store'
        });

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        const eventQuestions = Array.isArray(questionsData.data) 
          ? questionsData.data 
          : questionsData.data?.questions || [];
        
        // Debug logging for fetched questions
        console.log(`🎯 DIFFICULTY DEBUG - Fetched ${eventQuestions.length} questions for ${targetEvent}:`, 
          eventQuestions.slice(0, 3).map(q => ({
            question: q.question?.substring(0, 50) + '...',
            difficulty: q.difficulty,
            difficultyType: typeof q.difficulty,
            hasDifficulty: q.difficulty !== undefined,
            rawQuestion: q // Include full question object for debugging
          }))
        );
        
        allQuestions.push(...eventQuestions);
      }
    }

    let questions = allQuestions;

    // Handle image support - fetch from id-questions API if needed
    if (pureIdOnly) {
      // Only fetch ID questions from all target events
      const idQuestions: any[] = [];

      const pureIdDistribution = calculateEventDistribution(question_count, targetEvents.length);
      
      for (let i = 0; i < targetEvents.length; i++) {
        const targetEvent = targetEvents[i];
        const currentEventLimit = pureIdDistribution[i];

        const idQueryParams = new URLSearchParams();
        idQueryParams.set('event', targetEvent);
        idQueryParams.set('limit', String(currentEventLimit));
        idQueryParams.set('pure_id_only', 'true');
        
        if (question_types.includes('multiple_choice') && !question_types.includes('free_response')) {
          idQueryParams.set('question_type', 'mcq');
        } else if (question_types.includes('free_response') && !question_types.includes('multiple_choice')) {
          idQueryParams.set('question_type', 'frq');
        }
        // If both types are included, don't set question_type parameter to allow both types
        
        if (subtopics && subtopics.length > 0) {
          idQueryParams.set('subtopics', subtopics.join(','));
        }
        
        if (division !== 'both') {
          idQueryParams.set('division', division);
        }
        
        // Handle difficulties for ID questions with strict validation
        if (difficulties && difficulties.length > 0 && !difficulties.includes('any')) {
          try {
            const { min, max } = getDifficultyRange(difficulties);
            idQueryParams.set('difficulty_min', min.toFixed(2));
            idQueryParams.set('difficulty_max', max.toFixed(2));
          } catch (error) {
            console.error('🎯 DIFFICULTY ERROR - Invalid difficulty range for ID questions:', error);
            throw new Error(`Invalid difficulty configuration for ID questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        const idQuestionsUrl = `${origin}/api/id-questions?${idQueryParams.toString()}`;
        const idQuestionsResponse = await fetch(idQuestionsUrl, {
          cache: 'no-store'
        });

        if (idQuestionsResponse.ok) {
          const idQuestionsData = await idQuestionsResponse.json();
          const eventIdQuestions = Array.isArray(idQuestionsData.data) ? idQuestionsData.data : [];
          idQuestions.push(...eventIdQuestions);
        }
      }
      
      questions = idQuestions;
    } else if (idPercentage !== undefined && idPercentage > 0) {
      // Fetch mixed questions from all target events
      const idQuestionsCount = Math.round((idPercentage / 100) * question_count);
      const regularQuestionsCount = question_count - idQuestionsCount;
      
      const regularQuestions: any[] = [];
      const idQuestions: any[] = [];
      
      // Fetch regular questions from all target events
      if (regularQuestionsCount > 0) {
        const regularDistribution = calculateEventDistribution(regularQuestionsCount, targetEvents.length);
        
        for (let i = 0; i < targetEvents.length; i++) {
          const targetEvent = targetEvents[i];
          const currentEventLimit = regularDistribution[i];

          const regularQueryParams = new URLSearchParams();
          regularQueryParams.set('event', targetEvent);
          regularQueryParams.set('limit', String(currentEventLimit));
          
          if (question_types.includes('multiple_choice') && !question_types.includes('free_response')) {
            regularQueryParams.set('question_type', 'mcq');
          } else if (question_types.includes('free_response') && !question_types.includes('multiple_choice')) {
            regularQueryParams.set('question_type', 'frq');
          }
          // If both types are included, don't set question_type parameter to allow both types
          
          if (division !== 'both') {
            regularQueryParams.set('division', division);
          }
          
          if (subtopics && subtopics.length > 0) {
            regularQueryParams.set('subtopics', subtopics.join(','));
          }
          
          const regularResponse = await fetch(`${origin}/api/questions?${regularQueryParams.toString()}`, {
            cache: 'no-store'
          });
          
          if (regularResponse.ok) {
            const regularData = await regularResponse.json();
            const eventRegularQuestions = Array.isArray(regularData.data) ? regularData.data : [];
            regularQuestions.push(...eventRegularQuestions);
          }
        }
      }
      
      // Fetch ID questions from all target events
      if (idQuestionsCount > 0) {
        const idDistribution = calculateEventDistribution(idQuestionsCount, targetEvents.length);
        
        for (let i = 0; i < targetEvents.length; i++) {
          const targetEvent = targetEvents[i];
          const currentEventLimit = idDistribution[i];

          const idQueryParams = new URLSearchParams();
          idQueryParams.set('event', targetEvent);
          idQueryParams.set('limit', String(currentEventLimit));
          
          if (question_types.includes('multiple_choice') && !question_types.includes('free_response')) {
            idQueryParams.set('question_type', 'mcq');
          } else if (question_types.includes('free_response') && !question_types.includes('multiple_choice')) {
            idQueryParams.set('question_type', 'frq');
          }
          // If both types are included, don't set question_type parameter to allow both types
          
          if (subtopics && subtopics.length > 0) {
            idQueryParams.set('subtopics', subtopics.join(','));
          }
          
          if (division !== 'both') {
            idQueryParams.set('division', division);
          }

          const idQuestionsUrl = `${origin}/api/id-questions?${idQueryParams.toString()}`;
          const idQuestionsResponse = await fetch(idQuestionsUrl, {
            cache: 'no-store'
          });

          if (idQuestionsResponse.ok) {
            const idQuestionsData = await idQuestionsResponse.json();
            const eventIdQuestions = Array.isArray(idQuestionsData.data) ? idQuestionsData.data : [];
            idQuestions.push(...eventIdQuestions);
          }
        }
      }
      
      // Combine and shuffle the results
      const allMixedQuestions = [...regularQuestions, ...idQuestions];
      questions = shuffleArray(allMixedQuestions).slice(0, question_count);
    }

    /**
     * Format and validate questions for assignment
     *
     * CRITICAL: This function ensures EVERY question has a valid answers field.
     * Questions without valid answers are REJECTED with a clear error message.
     *
     * @throws {Error} If any question is missing valid answers
     */
    const validQuestions = questions
      .filter((q: any) => {
        // Pre-filter: Must have either options (MCQ) or answers (any type)
        const hasContent = q && (q.options?.length > 0 || q.answers?.length > 0);
        if (!hasContent) {
          console.warn(`Skipping question without content:`, q?.question || 'Unknown');
        }
        return hasContent;
      })
      .slice(0, question_count)
      .map((q: any, index: number) => {
        const isMCQ = q.options && Array.isArray(q.options) && q.options.length > 0;

        /**
         * Extract correct answer indices from question data
         *
         * Supports multiple formats:
         * 1. answers array with numeric indices: [0], [1, 2]
         * 2. answers array with string indices: ["0"], ["1", "2"]
         * 3. correct_answer as letter: "A", "B"
         * 4. correct_answer as number: 0, 1
         *
         * @returns Array of numbers for MCQ, array of strings for FRQ
         */
        let answers: (number | string)[] = [];

        // Try extracting from answers field first (preferred)
        if (Array.isArray(q.answers) && q.answers.length > 0) {
          if (isMCQ) {
            // For MCQ, convert to numeric indices
            answers = q.answers.map((a: any) => {
              const num = typeof a === 'number' ? a : parseInt(String(a));
              if (isNaN(num) || num < 0 || num >= q.options.length) {
                throw new Error(`Invalid answer index ${a} for question: ${q.question || q.question_text}`);
              }
              return num;
            });
          } else {
            // For FRQ, keep as strings
            answers = q.answers.map((a: any) => String(a));
          }
        }
        // Fallback: try extracting from correct_answer field
        else if (q.correct_answer !== null && q.correct_answer !== undefined && q.correct_answer !== '') {
          if (isMCQ) {
            const answerStr = String(q.correct_answer).trim();

            // Handle comma-separated answers (e.g., "A,B" or "0,1")
            const parts = answerStr.split(',').map(s => s.trim()).filter(s => s);

            answers = parts.map(part => {
              // Try parsing as letter (A, B, C, etc.)
              if (part.match(/^[A-Z]$/i)) {
                const index = part.toUpperCase().charCodeAt(0) - 65;
                if (index < 0 || index >= q.options.length) {
                  throw new Error(`Invalid answer letter "${part}" for question with ${q.options.length} options: ${q.question || q.question_text}`);
                }
                return index;
              }
              // Try parsing as number
              const num = parseInt(part);
              if (isNaN(num) || num < 0 || num >= q.options.length) {
                throw new Error(`Invalid answer "${part}" for question: ${q.question || q.question_text}`);
              }
              return num;
            });
          } else {
            // For FRQ, use the answer directly
            answers = [String(q.correct_answer)];
          }
        }

        // CRITICAL VALIDATION: Reject questions without valid answers
        if (!answers || answers.length === 0) {
          const errorMessage = [
            `❌ INVALID QUESTION - No valid answers found`,
            `Question: "${q.question || q.question_text}"`,
            `Type: ${q.question_type || (isMCQ ? 'MCQ' : 'FRQ')}`,
            `Has answers field: ${!!q.answers}`,
            `Has correct_answer field: ${!!q.correct_answer}`,
            `Answers value: ${JSON.stringify(q.answers)}`,
            `Correct answer value: ${JSON.stringify(q.correct_answer)}`,
          ].join('\n  ');

          console.error(errorMessage);
          throw new Error(`Question "${q.question || q.question_text}" has no valid answers. Cannot generate assignment with invalid questions.`);
        }

        const formattedQuestion = {
          question_text: q.question || q.question_text,
          question_type: isMCQ ? 'multiple_choice' : 'free_response',
          options: isMCQ ? q.options : undefined,
          answers: answers, // GUARANTEED: Always present, always valid, always non-empty array
          points: 1,
          order_index: index,
          difficulty: parseDifficulty(q.difficulty), // Strict validation - throws error if invalid
          imageData: (() => {
            let candidate = q.imageData;
            if (!candidate && Array.isArray(q.images) && q.images.length > 0) {
              candidate = q.images[Math.floor(Math.random() * q.images.length)];
            }
            return buildAbsoluteUrl(candidate, origin);
          })()
        };
        
        // Debug logging for formatted question difficulty
        if (index < 3) { // Log first 3 questions
          console.log(`🎯 DIFFICULTY DEBUG - Formatted question ${index + 1}:`, {
            question: formattedQuestion.question_text?.substring(0, 50) + '...',
            originalDifficulty: q.difficulty,
            formattedDifficulty: formattedQuestion.difficulty,
            hasOriginalDifficulty: q.difficulty !== undefined,
            difficultyType: typeof formattedQuestion.difficulty
          });
        }
        
        // Validate the formatted question with strict schema
        try {
          return AssignmentQuestionSchema.parse(formattedQuestion);
        } catch (error) {
          console.error(`🎯 DIFFICULTY ERROR - Question ${index + 1} validation failed:`, error);
          if (error instanceof z.ZodError) {
            const errorMessages = error.issues?.map(err => `${err.path.join('.')}: ${err.message}`) || ['Unknown validation error'];
            throw new Error(`Question ${index + 1} validation failed:\n${errorMessages.join('\n')}`);
          }
          throw new Error(`Question ${index + 1} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Double-check the formatted question (belt and suspenders)
        if (!formattedQuestion.answers || formattedQuestion.answers.length === 0) {
          throw new Error(`INTERNAL ERROR: Formatted question has invalid answers: ${formattedQuestion.question_text}`);
        }

        return formattedQuestion;
      });

    if (validQuestions.length === 0) {
      return NextResponse.json({ 
        error: 'No valid questions found for this event',
        suggestions: [
          'Try a different event name',
          'Check if the event supports the selected question types',
          'Verify the division selection'
        ]
      }, { status: 400 });
    }

    // Log summary
    console.log(`✅ Generated ${validQuestions.length} questions for ${eventName}`);

    return NextResponse.json({ 
      questions: validQuestions,
      metadata: {
        eventName,
        questionCount: validQuestions.length,
        capabilities,
        timeLimit: time_limit_minutes
      }
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
