import { z } from 'zod';

/**
 * Utility functions for handling Zod validation errors
 * Provides type-safe error handling for validation failures
 */

export interface ValidationError {
  message: string;
  path: (string | number)[];
  code: string;
}

export function formatValidationErrors(errors: z.ZodIssue[]): string {
  return errors.map((error: z.ZodIssue) => error.message).join(', ');
}

export function getValidationErrorDetails(errors: z.ZodIssue[]): ValidationError[] {
  return errors.map((error: z.ZodIssue) => ({
    message: error.message,
    path: error.path as (string | number)[],
    code: error.code,
  }));
}
