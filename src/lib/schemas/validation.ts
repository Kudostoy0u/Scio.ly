import { z } from 'zod';

// Validation schemas for common patterns
export const UUIDSchema = z.string().uuid();
export const SlugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);
export const EmailSchema = z.string().email();
export const PhoneSchema = z.string().regex(/^\+?[\d\s-()]+$/);

// Team-specific validation
export const TeamNameSchema = z.string().min(1).max(100);
export const TeamDescriptionSchema = z.string().max(500).optional();
export const DivisionSchema = z.enum(['B', 'C']);
export const RoleSchema = z.enum(['captain', 'co_captain', 'member', 'observer']);

// Event validation
export const EventNameSchema = z.string().min(1).max(100);
export const EventCodeSchema = z.string().min(1).max(20).regex(/^[A-Z0-9]+$/);

// User validation
export const DisplayNameSchema = z.string().min(1).max(100);
export const UsernameSchema = z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/);

// Common request validation
export const IdParamSchema = z.object({
  id: UUIDSchema
});

export const SlugParamSchema = z.object({
  slug: SlugSchema
});

export const TeamSlugParamSchema = z.object({
  teamSlug: SlugSchema
});

export const SubteamIdParamSchema = z.object({
  subteamId: UUIDSchema
});

// Query parameter validation
export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
});

export const TeamDataQuerySchema = z.object({
  includeSubteams: z.string().transform(val => val === 'true').default('true'),
  includeMembers: z.string().transform(val => val === 'true').default('true'),
  includeRoster: z.string().transform(val => val === 'true').default('false'),
  includeStream: z.string().transform(val => val === 'true').default('false'),
  includeAssignments: z.string().transform(val => val === 'true').default('false'),
  subteamId: UUIDSchema.optional()
});

export type IdParam = z.infer<typeof IdParamSchema>;
export type SlugParam = z.infer<typeof SlugParamSchema>;
export type TeamSlugParam = z.infer<typeof TeamSlugParamSchema>;
export type SubteamIdParam = z.infer<typeof SubteamIdParamSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type TeamDataQuery = z.infer<typeof TeamDataQuerySchema>;