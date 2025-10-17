import { z } from 'zod';

// Assignment schemas
export const AssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  assignment_type: z.enum(['quiz', 'test', 'practice', 'homework']),
  event_name: z.string(),
  due_date: z.string().nullable(),
  points: z.number(),
  is_required: z.boolean(),
  max_attempts: z.number().nullable(),
  time_limit_minutes: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  question_text: z.string(),
  question_type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
  options: z.array(z.string()).nullable(),
  correct_answer: z.string(),
  points: z.number(),
  order_index: z.number(),
});

export const SubmissionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  assignment_id: z.string(),
  submitted_at: z.string(),
  score: z.number().nullable(),
  time_taken_minutes: z.number().nullable(),
  is_completed: z.boolean(),
});

export const AssignmentWithQuestionsSchema = AssignmentSchema.extend({
  questions: z.array(QuestionSchema),
  submissions: z.array(SubmissionSchema),
});

export const AssignmentListSchema = z.object({
  assignments: z.array(AssignmentSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// API request/response schemas
export const CreateAssignmentRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignment_type: z.enum(['quiz', 'test', 'practice', 'homework']),
  event_name: z.string().min(1, 'Event name is required'),
  due_date: z.string().optional(),
  points: z.number().min(0, 'Points must be non-negative'),
  is_required: z.boolean().default(false),
  max_attempts: z.number().min(1).optional(),
  time_limit_minutes: z.number().min(1).optional(),
  questions: z.array(z.object({
    question_text: z.string().min(1, 'Question text is required'),
    question_type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
    options: z.array(z.string()).optional(),
    correct_answer: z.string().min(1, 'Correct answer is required'),
    points: z.number().min(0, 'Points must be non-negative'),
    order_index: z.number().min(0, 'Order index must be non-negative'),
  })).min(1, 'At least one question is required'),
});

export const UpdateAssignmentRequestSchema = CreateAssignmentRequestSchema.partial().extend({
  id: z.string(),
});

export const SubmitAssignmentRequestSchema = z.object({
  assignment_id: z.string(),
  answers: z.array(z.object({
    question_id: z.string(),
    answer: z.string(),
  })),
});

export const AssignmentResponseSchema = z.object({
  success: z.boolean(),
  data: z.union([
    AssignmentWithQuestionsSchema,
    AssignmentListSchema,
    z.object({ message: z.string() })
  ]).optional(),
  error: z.string().optional(),
});

// Type exports
export type Assignment = z.infer<typeof AssignmentSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Submission = z.infer<typeof SubmissionSchema>;
export type AssignmentWithQuestions = z.infer<typeof AssignmentWithQuestionsSchema>;
export type AssignmentList = z.infer<typeof AssignmentListSchema>;
export type CreateAssignmentRequest = z.infer<typeof CreateAssignmentRequestSchema>;
export type UpdateAssignmentRequest = z.infer<typeof UpdateAssignmentRequestSchema>;
export type SubmitAssignmentRequest = z.infer<typeof SubmitAssignmentRequestSchema>;
export type AssignmentResponse = z.infer<typeof AssignmentResponseSchema>;
