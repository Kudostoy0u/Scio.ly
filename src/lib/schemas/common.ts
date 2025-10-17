import { z } from 'zod';

// Common utility schemas
export const TimestampSchema = z.date();
export const CreatedAtSchema = z.date().default(() => new Date());
export const UpdatedAtSchema = z.date().default(() => new Date());

// Status schemas
export const ActiveStatusSchema = z.enum(['active', 'inactive', 'pending', 'banned']);
export const TeamStatusSchema = z.enum(['active', 'archived', 'deleted']);
export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'declined', 'expired']);

// Permission schemas
export const PermissionSchema = z.object({
  canCreate: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canDelete: z.boolean().default(false),
  canInvite: z.boolean().default(false),
  canManage: z.boolean().default(false)
});

// Settings schemas
export const TeamSettingsSchema = z.object({
  allowSelfJoin: z.boolean().default(false),
  requireApproval: z.boolean().default(true),
  maxMembers: z.number().min(1).max(1000).default(50),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false)
  }).default({}),
  privacy: z.object({
    public: z.boolean().default(false),
    showMembers: z.boolean().default(true),
    showRoster: z.boolean().default(false)
  }).default({})
});

// Display schemas
export const DisplayInfoSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  username: z.string().optional(),
  avatar: z.string().optional(),
  isOnline: z.boolean().default(false)
});

// Error schemas
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional()
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  errors: z.array(ValidationErrorSchema).optional(),
  timestamp: z.date().default(() => new Date())
});

export type ActiveStatus = z.infer<typeof ActiveStatusSchema>;
export type TeamStatus = z.infer<typeof TeamStatusSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type TeamSettings = z.infer<typeof TeamSettingsSchema>;
export type DisplayInfo = z.infer<typeof DisplayInfoSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;