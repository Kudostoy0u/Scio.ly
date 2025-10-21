import { dbPg } from '@/lib/db';
import { 
  newTeamGroups,
  newTeamUnits,
  newTeamMemberships,
  newTeamAssignments,
  newTeamAssignmentQuestions,
  newTeamAssignmentRoster,
  newTeamAssignmentSubmissions,
  newTeamNotifications,
  newTeamRosterData,
  users
} from '@/lib/db/schema';
import { eq, and, inArray, desc, or, sql } from 'drizzle-orm';
import { 
  // teamGroupCreateSchema,
  // teamUnitCreateSchema,
  // teamMembershipCreateSchema,
  teamAssignmentCreateSchema,
  teamNotificationCreateSchema,
  // type TeamGroupCreate,
  // type TeamUnitCreate,
  // type TeamMembershipCreate,
  type TeamAssignmentCreate,
  type TeamNotificationCreate
} from '@/lib/db/schemas';
import logger from '@/lib/utils/logger';

/**
 * Comprehensive Drizzle ORM service for all database operations
 * Replaces raw SQL queries throughout the application
 */
export class DrizzleService {
  
  // ==================== TEAM OPERATIONS ====================
  
  /**
   * Get team group by slug using Drizzle ORM
   */
  async getTeamGroupBySlug(slug: string) {
    try {
      const [group] = await dbPg
        .select()
        .from(newTeamGroups)
        .where(eq(newTeamGroups.slug, slug))
        .limit(1);
      
      return group || null;
    } catch (error) {
      logger.error('Error getting team group by slug:', error);
      throw error;
    }
  }

  /**
   * Get team units by group ID using Drizzle ORM
   */
  async getTeamUnitsByGroupId(groupId: string) {
    try {
      const units = await dbPg
        .select()
        .from(newTeamUnits)
        .where(eq(newTeamUnits.groupId, groupId))
        .orderBy(newTeamUnits.teamId);
      
      return units;
    } catch (error) {
      logger.error('Error getting team units by group ID:', error);
      throw error;
    }
  }

  /**
   * Get user team memberships using Drizzle ORM
   */
  async getUserTeamMemberships(userId: string, teamIds?: string[]) {
    try {
      const memberships = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamMemberships.status, 'active'),
          teamIds && teamIds.length > 0 ? inArray(newTeamMemberships.teamId, teamIds) : undefined
        ));
      return memberships;
    } catch (error) {
      logger.error('Error getting user team memberships:', error);
      throw error;
    }
  }

  /**
   * Get team members using Drizzle ORM
   */
  async getTeamMembers(teamId: string) {
    try {
      const members = await dbPg
        .select()
        .from(newTeamMemberships)
        .where(and(
          eq(newTeamMemberships.teamId, teamId),
          eq(newTeamMemberships.status, 'active')
        ))
        .orderBy(newTeamMemberships.joinedAt);
      
      return members;
    } catch (error) {
      logger.error('Error getting team members:', error);
      throw error;
    }
  }

  /**
   * Get user profiles by IDs using Drizzle ORM
   */
  async getUserProfiles(userIds: string[]) {
    try {
      const profiles = await dbPg
        .select()
        .from(users)
        .where(inArray(users.id, userIds));
      
      return profiles;
    } catch (error) {
      logger.error('Error getting user profiles:', error);
      throw error;
    }
  }

  // ==================== ASSIGNMENT OPERATIONS ====================

  /**
   * Get assignment by ID using Drizzle ORM
   */
  async getAssignmentById(assignmentId: string) {
    try {
      const [assignment] = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(eq(newTeamAssignments.id, assignmentId))
        .limit(1);
      
      return assignment || null;
    } catch (error) {
      logger.error('Error getting assignment by ID:', error);
      throw error;
    }
  }

  /**
   * Get assignment questions using Drizzle ORM
   */
  async getAssignmentQuestions(assignmentId: string) {
    try {
      const questions = await dbPg
        .select()
        .from(newTeamAssignmentQuestions)
        .where(eq(newTeamAssignmentQuestions.assignmentId, assignmentId))
        .orderBy(newTeamAssignmentQuestions.orderIndex);
      
      return questions;
    } catch (error) {
      logger.error('Error getting assignment questions:', error);
      throw error;
    }
  }

  /**
   * Get assignment roster using Drizzle ORM
   */
  async getAssignmentRoster(assignmentId: string) {
    try {
      const roster = await dbPg
        .select()
        .from(newTeamAssignmentRoster)
        .where(eq(newTeamAssignmentRoster.assignmentId, assignmentId));
      
      return roster;
    } catch (error) {
      logger.error('Error getting assignment roster:', error);
      throw error;
    }
  }

  /**
   * Get assignment submissions using Drizzle ORM
   */
  async getAssignmentSubmissions(assignmentId: string) {
    try {
      const submissions = await dbPg
        .select()
        .from(newTeamAssignmentSubmissions)
        .where(eq(newTeamAssignmentSubmissions.assignmentId, assignmentId))
        .orderBy(desc(newTeamAssignmentSubmissions.submittedAt));
      
      return submissions;
    } catch (error) {
      logger.error('Error getting assignment submissions:', error);
      throw error;
    }
  }

  /**
   * Create assignment using Drizzle ORM with Zod validation
   */
  async createAssignment(data: TeamAssignmentCreate) {
    try {
      const validatedData = teamAssignmentCreateSchema.parse(data);
      
      const [assignment] = await dbPg
        .insert(newTeamAssignments)
        .values(validatedData)
        .returning();
      
      logger.info(`Created assignment ${assignment.id}`);
      return assignment;
    } catch (error) {
      logger.error('Error creating assignment:', error);
      throw error;
    }
  }

  /**
   * Update assignment using Drizzle ORM
   */
  async updateAssignment(assignmentId: string, updates: Partial<TeamAssignmentCreate>) {
    try {
      const [updatedAssignment] = await dbPg
        .update(newTeamAssignments)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(newTeamAssignments.id, assignmentId))
        .returning();
      
      logger.info(`Updated assignment ${assignmentId}`);
      return updatedAssignment;
    } catch (error) {
      logger.error('Error updating assignment:', error);
      throw error;
    }
  }

  /**
   * Delete assignment using Drizzle ORM
   */
  async deleteAssignment(assignmentId: string) {
    try {
      await dbPg
        .delete(newTeamAssignments)
        .where(eq(newTeamAssignments.id, assignmentId));
      
      logger.info(`Deleted assignment ${assignmentId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting assignment:', error);
      throw error;
    }
  }

  // ==================== NOTIFICATION OPERATIONS ====================

  /**
   * Create notification using Drizzle ORM with Zod validation
   */
  async createNotification(data: TeamNotificationCreate) {
    try {
      const validatedData = teamNotificationCreateSchema.parse(data);
      
      const [notification] = await dbPg
        .insert(newTeamNotifications)
        .values(validatedData)
        .returning();
      
      logger.info(`Created notification ${notification.id}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications by user ID using Drizzle ORM
   */
  async getNotificationsByUserId(userId: string, includeRead: boolean = false) {
    try {
      let whereCondition = eq(newTeamNotifications.userId, userId);
      
      if (!includeRead) {
        whereCondition = and(whereCondition, eq(newTeamNotifications.isRead, false))!;
      }

      const notifications = await dbPg
        .select()
        .from(newTeamNotifications)
        .where(whereCondition)
        .orderBy(desc(newTeamNotifications.createdAt))
        .limit(50);
      
      return notifications;
    } catch (error) {
      logger.error('Error getting notifications by user ID:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read using Drizzle ORM
   */
  async markNotificationAsRead(notificationId: string, userId: string) {
    try {
      const [updatedNotification] = await dbPg
        .update(newTeamNotifications)
        .set({ 
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(newTeamNotifications.id, notificationId),
          eq(newTeamNotifications.userId, userId)
        ))
        .returning();
      
      if (updatedNotification) {
        logger.info(`Marked notification ${notificationId} as read`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // ==================== ROSTER OPERATIONS ====================

  /**
   * Get roster data by team unit ID using Drizzle ORM
   */
  async getRosterDataByTeamUnitId(teamUnitId: string) {
    try {
      const rosterData = await dbPg
        .select()
        .from(newTeamRosterData)
        .where(eq(newTeamRosterData.teamUnitId, teamUnitId))
        .orderBy(newTeamRosterData.slotIndex);
      
      return rosterData;
    } catch (error) {
      logger.error('Error getting roster data by team unit ID:', error);
      throw error;
    }
  }

  /**
   * Get roster data by team unit ID and event name using Drizzle ORM
   */
  async getRosterDataByTeamUnitIdAndEvent(teamUnitId: string, eventName: string) {
    try {
      const rosterData = await dbPg
        .select()
        .from(newTeamRosterData)
        .where(and(
          eq(newTeamRosterData.teamUnitId, teamUnitId),
          eq(newTeamRosterData.eventName, eventName)
        ))
        .orderBy(newTeamRosterData.slotIndex);
      
      return rosterData;
    } catch (error) {
      logger.error('Error getting roster data by team unit ID and event:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS OPERATIONS ====================

  /**
   * Get assignment analytics using Drizzle ORM
   */
  async getAssignmentAnalytics(assignmentId: string) {
    try {
      const submissions = await this.getAssignmentSubmissions(assignmentId);
      
      const totalSubmissions = submissions.length;
      const averageScore = totalSubmissions > 0 
        ? submissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / totalSubmissions 
        : 0;
      const completionRate = totalSubmissions > 0 
        ? (submissions.filter(sub => sub.status === 'submitted').length / totalSubmissions) * 100 
        : 0;
      
      return {
        totalSubmissions,
        averageScore: Math.round(averageScore * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting assignment analytics:', error);
      throw error;
    }
  }

  // ==================== SEARCH OPERATIONS ====================

  /**
   * Search teams by name or slug using Drizzle ORM
   */
  async searchTeams(query: string, limit: number = 10) {
    try {
      const teams = await dbPg
        .select({
          id: newTeamGroups.id,
          school: newTeamGroups.school,
          division: newTeamGroups.division,
          slug: newTeamGroups.slug,
          description: newTeamGroups.description
        })
        .from(newTeamGroups)
        .where(and(
          eq(newTeamGroups.status, 'active'),
          or(
            sql`LOWER(${newTeamGroups.school}) LIKE LOWER(${`%${query}%`})`,
            sql`LOWER(${newTeamGroups.slug}) LIKE LOWER(${`%${query}%`})`
          )
        ))
        .limit(limit);
      
      return teams;
    } catch (error) {
      logger.error('Error searching teams:', error);
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Get multiple assignments by IDs using Drizzle ORM
   */
  async getAssignmentsByIds(assignmentIds: string[]) {
    try {
      const assignments = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(inArray(newTeamAssignments.id, assignmentIds));
      
      return assignments;
    } catch (error) {
      logger.error('Error getting assignments by IDs:', error);
      throw error;
    }
  }

  /**
   * Get assignments by team ID using Drizzle ORM
   */
  async getAssignmentsByTeamId(teamId: string, limit: number = 50) {
    try {
      const assignments = await dbPg
        .select()
        .from(newTeamAssignments)
        .where(eq(newTeamAssignments.teamId, teamId))
        .orderBy(desc(newTeamAssignments.createdAt))
        .limit(limit);
      
      return assignments;
    } catch (error) {
      logger.error('Error getting assignments by team ID:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const drizzleService = new DrizzleService();
