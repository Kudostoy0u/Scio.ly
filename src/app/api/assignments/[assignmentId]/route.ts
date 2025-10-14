import { NextRequest, NextResponse } from 'next/server';
import { queryCockroachDB } from '@/lib/cockroachdb';
import { getServerUser } from '@/lib/supabaseServer';

// GET /api/assignments/[assignmentId] - Get assignment details and questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        error: 'Database configuration error',
        details: 'DATABASE_URL environment variable is missing'
      }, { status: 500 });
    }

    const user = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;

    // Get assignment details
    const assignmentResult = await queryCockroachDB<any>(
      `SELECT 
         a.id,
         a.title,
         a.description,
         a.assignment_type,
         a.due_date,
         a.points,
         a.is_required,
         a.max_attempts,
         a.created_at,
         a.updated_at,
         u.email as creator_email,
         COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name)) as creator_name
       FROM new_team_assignments a
       JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const assignment = assignmentResult.rows[0];

    // Check if user is assigned to this assignment
    const rosterResult = await queryCockroachDB<any>(
      `SELECT student_name, user_id, subteam_id
       FROM new_team_assignment_roster
       WHERE assignment_id = $1 AND (user_id = $2 OR student_name = $3)`,
      [assignmentId, user.id, user.email]
    );

    if (rosterResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not assigned to this assignment' }, { status: 403 });
    }

    // Get assignment questions
    console.log('=== ASSIGNMENT LOADING DEBUG ===');
    console.log('Loading assignment ID:', assignmentId);
    
    const questionsResult = await queryCockroachDB<any>(
      `SELECT 
         id,
         question_text,
         question_type,
         options,
         correct_answer,
         points,
         order_index,
         image_data
       FROM new_team_assignment_questions
       WHERE assignment_id = $1
       ORDER BY order_index ASC`,
      [assignmentId]
    );
    
    console.log('Raw database results:', JSON.stringify(questionsResult.rows, null, 2));
    console.log('Number of questions from DB:', questionsResult.rows.length);

    // Format questions for the test system
    const questions = questionsResult.rows.map((q: any, index: number) => {
      console.log(`\n--- Processing Question ${index + 1} from DB ---`);
      console.log('Raw DB question:', JSON.stringify(q, null, 2));
      console.log('Question text from DB:', q.question_text);
      console.log('Question type from DB:', q.question_type);
      console.log('Options from DB (raw):', q.options);
      console.log('Options type:', typeof q.options);
      console.log('Correct answer from DB:', q.correct_answer);
      
      // Special handling for Codebusters questions
      if (q.question_type === 'codebusters') {
        console.log('Processing Codebusters question...');
        let codebustersData: any = null;
        if (q.options) {
          try {
            codebustersData = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
            console.log('Parsed Codebusters data:', codebustersData);
          } catch (parseError) {
            console.log('Failed to parse Codebusters options:', parseError);
          }
        }
        
        // Check if this is a parameters record (for dynamic generation)
        if (codebustersData?.type === 'parameters') {
          console.log('Found Codebusters parameters, will generate questions dynamically');
          // Return the parameters for dynamic generation
          return {
            id: q.id,
            question_text: 'Dynamic Codebusters Generation',
            question_type: 'codebusters_params',
            parameters: codebustersData,
            points: 0,
            order_index: 0,
            image_data: null
          };
        }
        
        // Regular Codebusters question
        const formattedQuestion = {
          id: q.id,
          question_text: q.question_text,
          question_type: 'codebusters',
          author: codebustersData?.author || 'Unknown',
          quote: q.question_text, // The original quote
          cipherType: codebustersData?.cipherType || 'Random Aristocrat',
          difficulty: codebustersData?.difficulty || 'Medium',
          division: codebustersData?.division || 'C',
          charLength: codebustersData?.charLength || 100,
          encrypted: codebustersData?.encrypted || '',
          key: codebustersData?.key || '',
          hint: codebustersData?.hint || '',
          solution: codebustersData?.solution || q.correct_answer,
          correct_answer: codebustersData?.solution || q.correct_answer,
          points: q.points,
          order_index: q.order_index,
          image_data: q.image_data || null
        };
        
        console.log('Formatted Codebusters question:', JSON.stringify(formattedQuestion, null, 2));
        console.log(`--- End Codebusters Question ${index + 1} Processing ---\n`);
        
        return formattedQuestion;
      }
      
      // Convert object-based options to string array for test system
      let options: string[] | undefined = undefined;
      if (q.options) {
        console.log('Processing options...');
        // Handle both JSON string and already parsed object/array
        let parsedOptions = q.options;
        if (typeof q.options === 'string') {
          console.log('Options is string, attempting to parse...');
          try {
            parsedOptions = JSON.parse(q.options);
            console.log('Parsed options:', parsedOptions);
          } catch {
            console.log('Failed to parse options as JSON, treating as single string');
            // If parsing fails, treat as single string option
            parsedOptions = [q.options];
          }
        } else {
          console.log('Options is not string, using as-is:', parsedOptions);
        }
        
        if (Array.isArray(parsedOptions)) {
          console.log('Options is array, mapping to strings...');
          options = parsedOptions.map((opt: any, optIndex: number) => {
            console.log(`  Option ${optIndex}:`, opt, 'Type:', typeof opt);
            if (typeof opt === 'string') {
              console.log(`    -> Using as string: "${opt}"`);
              return opt;
            } else if (typeof opt === 'object' && opt.text) {
              console.log(`    -> Extracting text from object: "${opt.text}"`);
              return opt.text;
            }
            console.log(`    -> Converting to string: "${String(opt)}"`);
            return String(opt);
          });
          console.log('Final options array:', options);
        } else {
          console.log('Options is not array, setting to undefined');
        }
      } else {
        console.log('No options found');
      }

      // Convert answer to the format expected by the test system
      let answers: (string | number)[] = [];
      if (q.correct_answer) {
        if (q.question_type === 'multiple_choice') {
          // For MCQ, convert letter answers (A, B, C) to indices (0, 1, 2)
          const answerStr = String(q.correct_answer).toUpperCase();
          if (answerStr.match(/^[A-Z]$/)) {
            answers = [answerStr.charCodeAt(0) - 65]; // A=0, B=1, C=2, etc.
          } else {
            // If it's already a number, use it directly
            const numAnswer = parseInt(answerStr);
            if (!isNaN(numAnswer)) {
              answers = [numAnswer];
            }
          }
        } else {
          // For FRQ, use the answer as-is
          answers = [q.correct_answer];
        }
      }

      const formattedQuestion = {
        id: q.id,
        question: q.question_text,
        type: q.question_type === 'multiple_choice' ? 'mcq' : 'frq',
        options: options,
        answers: answers,
        points: q.points,
        order: q.order_index,
        imageData: q.image_data || null
      };
      
      console.log('Formatted question for test system:', JSON.stringify(formattedQuestion, null, 2));
      console.log(`--- End Question ${index + 1} Processing ---\n`);
      
      return formattedQuestion;
    });

    const response = {
      assignment: {
        ...assignment,
        questions,
        questions_count: questions.length
      }
    };
    
    console.log('Final response being sent to client:', JSON.stringify(response, null, 2));
    console.log('=== END ASSIGNMENT LOADING DEBUG ===\n');
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
