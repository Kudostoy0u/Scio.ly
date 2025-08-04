import { GoogleGenAI, Type } from "@google/genai";

// Environment variables for API keys
const GEMINI_API_KEYS = process.env.GEMINI_API_KEYS?.split(',').map(key => key.trim()) || [];

// Gemini AI service class with key rotation
export class GeminiService {
  private aiClients: GoogleGenAI[] = [];
  private currentKeyIndex = 0;

  constructor() {
    // Initialize clients for each API key
    GEMINI_API_KEYS.forEach(apiKey => {
      if (apiKey) {
        this.aiClients.push(new GoogleGenAI({ apiKey }));
      }
    });

    if (this.aiClients.length === 0) {
      console.warn('No Gemini API keys provided, AI features will be disabled');
    } else {
      console.log(`Initialized Gemini client with ${this.aiClients.length} API keys`);
    }
  }

  // Get current AI client with rotation
  private getCurrentClient(): GoogleGenAI {
    if (this.aiClients.length === 0) {
      throw new Error('Gemini client not initialized');
    }

    const client = this.aiClients[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.aiClients.length;
    return client;
  }

  // Check if service is available
  public isAvailable(): boolean {
    return this.aiClients.length > 0;
  }

  // Generate content with basic text response
  private async generateContent(prompt: string, model: string = 'gemini-2.5-flash'): Promise<string> {
    const ai = this.getCurrentClient();
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || '';
  }

  // Generate structured content with JSON schema
  private async generateStructuredContent(
    prompt: string, 
    schema: unknown, 
    model: string = 'gemini-2.5-flash'
  ): Promise<Record<string, unknown>> {
    const ai = this.getCurrentClient();
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text || '{}';
    return JSON.parse(text) as Record<string, unknown>;
  }

  // Suggest edit for a question
  public async suggestEdit(question: Record<string, unknown>, userReason?: string): Promise<Record<string, unknown>> {
    const questionText = question.question || '';
    const options = question.options || [];
    const answers = question.answers || [];
    const event = question.event || '';
    const difficulty = question.difficulty || 0.5;

    const prompt = `You are a Science Olympiad question editor. Your job is to improve this question by correcting errors, clarifying wording, and enhancing educational value.

QUESTION TO IMPROVE: ${questionText}
OPTIONS: ${JSON.stringify(options)}
ANSWERS: ${JSON.stringify(answers)}
EVENT: ${event}
DIFFICULTY: ${difficulty}
${userReason ? `USER REASON: ${userReason}` : ''}

IMPROVEMENT CRITERIA:
1. Scientific accuracy - correct any factual errors
2. Clarity and readability - improve unclear wording
3. Educational value - ensure question tests important concepts
4. Technical formatting - fix formatting issues
5. Difficulty appropriateness - adjust to match event level

Provide improved versions of the question components. Make minimal changes if the question is already good.

Also provide:
- reasoning: A brief explanation of what changes were made and why
- confidence: A number between 0 and 1 indicating how confident you are in your suggestions (1 = very confident, 0 = not confident)`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        suggestedQuestion: { type: Type.STRING },
        suggestedOptions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        suggestedAnswers: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        reasoning: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      propertyOrdering: ["suggestedQuestion", "suggestedOptions", "suggestedAnswers", "reasoning", "confidence"],
    };

    return await this.generateStructuredContent(prompt, schema);
  }

  // Analyze question for issues
  public async analyzeQuestion(question: Record<string, unknown>): Promise<Record<string, unknown>> {
    const questionText = question.question || '';
    const options = question.options || [];
    const answers = question.answers || [];
    const subject = question.subject || '';
    const difficulty = question.difficulty || 0.5;

    const prompt = `You are a Science Olympiad question answerability analyst. Analyze this question for potential issues.

Question: ${questionText}
Options: ${JSON.stringify(options)}
Answers: ${JSON.stringify(answers)}
Subject: ${subject}
Difficulty: ${difficulty}

ANALYSIS CRITERIA:
1. Unanswerabiliy (Question is not self contained, and cannot be answered without external or additional information. For example if it mentions "Substance B" which is clearly a lab substance and cannot be included in a text question.)
2. Inappropriate content

Based on your analysis, determine if this question should be removed from the database. Consider removal if the question has is not answerable, aka not enough context. The reason field should be a brief 2 sentence explanation`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        remove: { type: Type.BOOLEAN },
        reason: { type: Type.STRING },
      },
      propertyOrdering: ["remove", "reason"],
    };

    return await this.generateStructuredContent(prompt, schema);
  }

  // Validate edit submission
  public async validateEdit(
    originalQuestion: Record<string, unknown>,
    editedQuestion: Record<string, unknown>,
    event: string,
    reason: string
  ): Promise<Record<string, unknown>> {
    const prompt = `You are a Science Olympiad edit validator. Your job is to determine if this edit should be accepted.

ORIGINAL QUESTION: ${JSON.stringify(originalQuestion)}
EDITED QUESTION: ${JSON.stringify(editedQuestion)}
EVENT: ${event}
REASON: ${reason}

VALIDATION CRITERIA:
ACCEPT IF: Edit fixes scientific inaccuracies, improves clarity, corrects formatting, enhances educational value, or aligns better with Science Olympiad standards.

REJECT IF: Edit introduces errors, makes question less clear, changes correct answers incorrectly, lacks justification, or appears to be vandalism.

Determine if this edit should be accepted and provide a two sentence reason.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        isValid: { type: Type.BOOLEAN },
        reason: { type: Type.STRING },
      },
      propertyOrdering: ["isValid", "reason"],
    };

    return await this.generateStructuredContent(prompt, schema);
  }

  // Explain question with step-by-step reasoning
  public async explain(
    question: Record<string, unknown>,
    userAnswer: unknown,
    event: string
  ): Promise<Record<string, unknown>> {
    const prompt = `You are an expert Science Olympiad tutor providing detailed explanations for questions. Your job is to help students understand how to solve this question step-by-step.

QUESTION TO EXPLAIN: ${JSON.stringify(question)}
EVENT: ${event}

EXPLANATION REQUIREMENTS:
1. Break down the problem into logical steps
2. Explain the scientific concepts involved
3. Clearly identify the correct answer(s)
4. Explain why the correct answer is right
5. Briefly address why other options are wrong
6. Use language appropriate for Science Olympiad students

Provide a comprehensive, educational explanation that helps students understand both the answer and the scientific reasoning behind it.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        explanation: { type: Type.STRING },
        correctIndices: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER }
        },
      },
      propertyOrdering: ["explanation", "correctIndices"],
    };

    return await this.generateStructuredContent(prompt, schema);
  }

  // Grade free response questions
  public async gradeFreeResponses(responses: Array<Record<string, unknown>>): Promise<Record<string, unknown>> {
    const prompt = `You are a Science Olympiad free-response grader. Your job is to evaluate student answers and assign appropriate scores.

RESPONSES TO GRADE: ${JSON.stringify(responses)}

GRADING CRITERIA:
SCORING SCALE:
- 0.0: Completely incorrect answer
- 0.5: Partially correct (student got some elements but not all)
- 1.0: Fully correct answer

GRADING GUIDELINES:
- FULL CREDIT (1.0): All required elements are present and correct, demonstrates complete understanding
- PARTIAL CREDIT (0.5): Some correct elements but missing others, shows partial understanding
- NO CREDIT (0.0): Completely incorrect answer, no relevant information provided

GRADING PRINCIPLES:
- Be fair and consistent across all responses
- Award partial credit generously when students show understanding
- Focus on scientific accuracy and understanding
- Ignore minor spelling or grammar errors if the science is correct

Provide scores that reflect the student's actual understanding and knowledge demonstrated in their responses.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        scores: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER }
        },
      },
      propertyOrdering: ["scores"],
    };

    return await this.generateStructuredContent(prompt, schema);
  }

  // Extract questions from text
  public async extractQuestions(text: string): Promise<Record<string, unknown>> {
    const prompt = `You are a Science Olympiad test parser. Your job is to extract all questions from this test content and organize them properly.

TEXT TO ANALYZE: ${text}

EXTRACTION REQUIREMENTS:
1. Find all numbered questions (1, 2, 3, etc.)
2. Identify multiple choice questions with their options (A, B, C, D)
3. Capture free response questions, fill-in-the-blank questions, short answer questions
4. Clean up formatting and preserve the original question text accurately
5. Only extract actual questions (not instructions or headers)
6. Maintain question order from the original text

EXTRACTION GUIDELINES:
- Look for question patterns (numbered items, "What is...", "Which of the following...")
- Identify answer choice patterns (A), B), C), D) or similar)
- Capture questions that might be embedded in paragraphs
- Preserve any special formatting or symbols

Provide a comprehensive extraction that captures all questions while maintaining their original structure.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              type: { type: Type.STRING },
            },
            propertyOrdering: ["question", "options", "type"],
          }
        },
      },
      propertyOrdering: ["questions"],
    };

    return await this.generateStructuredContent(prompt, schema);
  }

  // Improve user reasoning
  public async improveReason(reason: string, question: Record<string, unknown>): Promise<Record<string, unknown>> {
    const prompt = `You are a Science Olympiad editing assistant. Your job is to improve the reasoning provided by a user for editing a question.

USER'S REASON: ${reason}
QUESTION CONTEXT: ${JSON.stringify(question)}

IMPROVEMENT GOALS:
1. Make the reasoning more clear and specific
2. Add missing context or details
3. Use appropriate academic language
4. Ensure any scientific claims are correct
5. Make the reasoning specific enough to guide improvements

Provide an improved version that maintains the user's intent while making it more clear, complete, and professional.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        improvedReason: { type: Type.STRING },
      },
      propertyOrdering: ["improvedReason"],
    };

    return await this.generateStructuredContent(prompt, schema);
  }

  // Validate report edit (same as validateEdit but for reports)
  public async validateReportEdit(
    originalQuestion: Record<string, unknown>,
    editedQuestion: Record<string, unknown>,
    event: string,
    reason: string
  ): Promise<Record<string, unknown>> {
    return await this.validateEdit(originalQuestion, editedQuestion, event, reason);
  }
}

// Export singleton instance
export const geminiService = new GeminiService();