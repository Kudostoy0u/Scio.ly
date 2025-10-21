import { pgTable, uuid, text, timestamp, boolean, bigint } from 'drizzle-orm/pg-core';
import { users } from './core';
import { newTeamUnits } from './teams';

// ==================== TEAM MATERIALS ====================

export const newTeamMaterials = pgTable('new_team_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => newTeamUnits.id),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: bigint('file_size', { mode: 'number' }),
  category: text('category'),
  tags: text('tags').array(),
  isPublic: boolean('is_public').default(true),
  downloadCount: bigint('download_count', { mode: 'number' }).default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
