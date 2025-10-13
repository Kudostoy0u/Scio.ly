import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { getEventCapabilities, validateEventName } from '@/lib/utils/eventConfig';
import { resolveTeamSlugToUnits, isUserCaptain } from '@/lib/utils/team-resolver';

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
    
    const {
      event_name,
      question_count = 10,
      question_types = ['multiple_choice'],
      subtopics = [],
      time_limit_minutes = 30,
      division = 'both',
      id_percentage: idPercentage,
      pure_id_only: pureIdOnly
    } = body;

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

    const capabilities = getEventCapabilities(eventName);

    // Debug logging
    console.log('=== ASSIGNMENT QUESTION GENERATION DEBUG ===');
    console.log('Event:', event_name);
    console.log('Mapped event:', eventName);
    console.log('Question count:', question_count);
    console.log('Question types:', question_types);
    console.log('ID percentage:', idPercentage);
    console.log('Pure ID only:', pureIdOnly);
    console.log('Supports picture questions:', capabilities.supportsPictureQuestions);
    console.log('Supports identification only:', capabilities.supportsIdentificationOnly);

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
    console.log('Event distribution:', eventDistribution.map((count, index) => `${targetEvents[index]}: ${count}`).join(', '));

    for (let i = 0; i < targetEvents.length; i++) {
      const targetEvent = targetEvents[i];
      const currentEventLimit = eventDistribution[i];

      // Build query parameters for question fetching
      const queryParams = new URLSearchParams();
      queryParams.set('event', targetEvent);
      queryParams.set('limit', String(Math.min(currentEventLimit, capabilities.maxQuestions)));
      
      // Handle question types
      if (question_types.includes('multiple_choice')) {
        queryParams.set('question_type', 'mcq');
      } else if (question_types.includes('free_response')) {
        queryParams.set('question_type', 'frq');
      }
      
      // Handle division - use 'both' or the only available division
      if (division !== 'both') {
        queryParams.set('division', division);
      }
      
      // Handle subtopics
      if (subtopics && subtopics.length > 0) {
        queryParams.set('subtopics', subtopics.join(','));
      }
      
      // Fetch questions from the main questions API
      const questionsResponse = await fetch(`${origin}/api/questions?${queryParams.toString()}`, {
        cache: 'no-store'
      });

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        const eventQuestions = Array.isArray(questionsData.data) 
          ? questionsData.data 
          : questionsData.data?.questions || [];
        allQuestions.push(...eventQuestions);
      }
    }

    let questions = allQuestions;

    // Handle image support - fetch from id-questions API if needed
    if (pureIdOnly) {
      // Only fetch ID questions from all target events
      console.log('=== PURE ID ONLY MODE ===');
      const idQuestions: any[] = [];
      
      const pureIdDistribution = calculateEventDistribution(question_count, targetEvents.length);
      console.log('Pure ID distribution:', pureIdDistribution.map((count, index) => `${targetEvents[index]}: ${count}`).join(', '));
      
      for (let i = 0; i < targetEvents.length; i++) {
        const targetEvent = targetEvents[i];
        const currentEventLimit = pureIdDistribution[i];

        const idQueryParams = new URLSearchParams();
        idQueryParams.set('event', targetEvent);
        idQueryParams.set('limit', String(currentEventLimit));
        idQueryParams.set('pure_id_only', 'true');
        
        if (question_types.includes('multiple_choice')) {
          idQueryParams.set('question_type', 'mcq');
        } else if (question_types.includes('free_response')) {
          idQueryParams.set('question_type', 'frq');
        }
        
        if (subtopics && subtopics.length > 0) {
          idQueryParams.set('subtopics', subtopics.join(','));
        }
        
        if (division !== 'both') {
          idQueryParams.set('division', division);
        }

        const idQuestionsUrl = `${origin}/api/id-questions?${idQueryParams.toString()}`;
        console.log('Fetching pure ID questions from:', idQuestionsUrl);
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
      console.log('=== MIXED QUESTIONS MODE ===');
      const idQuestionsCount = Math.round((idPercentage / 100) * question_count);
      const regularQuestionsCount = question_count - idQuestionsCount;
      console.log('ID questions count:', idQuestionsCount);
      console.log('Regular questions count:', regularQuestionsCount);
      
      const regularQuestions: any[] = [];
      const idQuestions: any[] = [];
      
      // Fetch regular questions from all target events
      if (regularQuestionsCount > 0) {
        const regularDistribution = calculateEventDistribution(regularQuestionsCount, targetEvents.length);
        console.log('Regular questions distribution:', regularDistribution.map((count, index) => `${targetEvents[index]}: ${count}`).join(', '));
        
        for (let i = 0; i < targetEvents.length; i++) {
          const targetEvent = targetEvents[i];
          const currentEventLimit = regularDistribution[i];

          const regularQueryParams = new URLSearchParams();
          regularQueryParams.set('event', targetEvent);
          regularQueryParams.set('limit', String(currentEventLimit));
          
          if (question_types.includes('multiple_choice')) {
            regularQueryParams.set('question_type', 'mcq');
          } else if (question_types.includes('free_response')) {
            regularQueryParams.set('question_type', 'frq');
          }
          
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
        console.log('ID questions distribution:', idDistribution.map((count, index) => `${targetEvents[index]}: ${count}`).join(', '));
        
        for (let i = 0; i < targetEvents.length; i++) {
          const targetEvent = targetEvents[i];
          const currentEventLimit = idDistribution[i];

          const idQueryParams = new URLSearchParams();
          idQueryParams.set('event', targetEvent);
          idQueryParams.set('limit', String(currentEventLimit));
          
          if (question_types.includes('multiple_choice')) {
            idQueryParams.set('question_type', 'mcq');
          } else if (question_types.includes('free_response')) {
            idQueryParams.set('question_type', 'frq');
          }
          
          if (subtopics && subtopics.length > 0) {
            idQueryParams.set('subtopics', subtopics.join(','));
          }
          
          if (division !== 'both') {
            idQueryParams.set('division', division);
          }

          const idQuestionsUrl = `${origin}/api/id-questions?${idQueryParams.toString()}`;
          console.log('Fetching ID questions from:', idQuestionsUrl);
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

    // Filter and format questions
    const validQuestions = questions
      .filter((q: any) => q && (q.options?.length > 0 || q.answers?.length > 0))
      .slice(0, question_count)
      .map((q: any, index: number) => {
        const isMCQ = q.options && Array.isArray(q.options) && q.options.length > 0;
        const correctAnswerIndices = Array.isArray(q.answers) ? q.answers.map(a => typeof a === 'number' ? a : parseInt(a)) : [0];
        
        return {
          question_text: q.question || q.question_text,
          question_type: isMCQ ? 'multiple_choice' : 'free_response',
          options: isMCQ ? q.options.map((option: string, idx: number) => ({
            id: String.fromCharCode(65 + idx), // A, B, C, D
            text: option,
            isCorrect: correctAnswerIndices.includes(idx)
          })) : undefined,
          correct_answer: isMCQ ? 
            correctAnswerIndices.map(idx => String.fromCharCode(65 + idx)).join(', ') : 
            (Array.isArray(q.answers) ? q.answers.join(', ') : q.correct_answer),
          points: 1,
          order_index: index,
          imageData: (() => {
            let candidate = q.imageData;
            if (!candidate && Array.isArray(q.images) && q.images.length > 0) {
              candidate = q.images[Math.floor(Math.random() * q.images.length)];
            }
            return buildAbsoluteUrl(candidate, origin);
          })()
        };
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
