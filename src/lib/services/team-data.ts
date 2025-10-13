import { dbPg } from '@/lib/db';
import { 
  newTeamMemberships, 
  newTeamPosts, 
  newTeamPostAttachments,
  newTeamAssignments,
  newTeamAssignmentSubmissions,
  newTeamNotifications,
  newTeamUnits,
  newTeamGroups,
  users 
} from '@/lib/db/schema';
import { eq, and, inArray, sql, desc, asc } from 'drizzle-orm';

export interface TeamPost {
  id: string;
  title?: string;
  content: string;
  post_type: 'announcement' | 'assignment' | 'material' | 'event';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  scheduled_at?: string;
  expires_at?: string;
  author_email: string;
  author_name?: string;
  author_avatar?: string;
  attachments: Array<{
    file_name: string;
    file_url: string;
    file_type?: string;
    file_size?: number;
  }>;
}

export interface TeamAssignment {
  id: string;
  title: string;
  description?: string;
  assignment_type: 'task' | 'homework' | 'project' | 'study' | 'other';
  due_date?: string;
  points?: number;
  is_required: boolean;
  max_attempts?: number;
  created_at: string;
  updated_at: string;
  creator_email: string;
  creator_name?: string;
  user_submission?: {
    status: 'draft' | 'submitted' | 'graded' | 'returned';
    submitted_at: string;
    grade?: number;
    attempt_number: number;
  };
}

export interface TeamNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  school?: string;
  division?: string;
  team_name?: string;
}

export class TeamDataService {
  static async getTeamPosts(teamId: string, userId: string): Promise<TeamPost[]> {
    try {
      // Check if user is member of the team using Drizzle ORM
      const memberships = await dbPg
        .select({ id: newTeamMemberships.id })
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, userId),
            eq(newTeamMemberships.teamId, teamId),
            eq(newTeamMemberships.status, 'active')
          )
        );

      if (memberships.length === 0) {
        throw new Error('Not a team member');
      }

      // Get posts with author information using Drizzle ORM
      const posts = await dbPg
        .select({
          id: newTeamPosts.id,
          title: newTeamPosts.title,
          content: newTeamPosts.content,
          postType: newTeamPosts.postType,
          priority: newTeamPosts.priority,
          isPinned: newTeamPosts.isPinned,
          isPublic: newTeamPosts.isPublic,
          createdAt: newTeamPosts.createdAt,
          updatedAt: newTeamPosts.updatedAt,
          scheduledAt: newTeamPosts.scheduledAt,
          expiresAt: newTeamPosts.expiresAt,
          authorEmail: users.email,
          authorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
          authorAvatar: users.photoUrl
        })
        .from(newTeamPosts)
        .innerJoin(users, eq(newTeamPosts.authorId, users.id))
        .where(eq(newTeamPosts.teamId, teamId))
        .orderBy(desc(newTeamPosts.isPinned), desc(newTeamPosts.createdAt))
        .limit(50);

      // Get attachments for each post using Drizzle ORM
      const postsWithAttachments = await Promise.all(
        posts.map(async (post) => {
          const attachments = await dbPg
            .select({
              fileName: newTeamPostAttachments.fileName,
              fileUrl: newTeamPostAttachments.fileUrl,
              fileType: newTeamPostAttachments.fileType,
              fileSize: newTeamPostAttachments.fileSize
            })
            .from(newTeamPostAttachments)
            .where(eq(newTeamPostAttachments.postId, post.id));

          const mappedAttachments = attachments.map(attachment => ({
            file_name: attachment.fileName,
            file_url: attachment.fileUrl,
            file_type: attachment.fileType || undefined,
            file_size: attachment.fileSize || undefined
          }));

          return {
            id: post.id,
            title: post.title || undefined,
            content: post.content,
            post_type: post.postType as 'announcement' | 'assignment' | 'material' | 'event',
            priority: post.priority as 'low' | 'normal' | 'high' | 'urgent',
            is_pinned: post.isPinned || false,
            is_public: post.isPublic || true,
            created_at: post.createdAt?.toISOString() || new Date().toISOString(),
            updated_at: post.updatedAt?.toISOString() || new Date().toISOString(),
            scheduled_at: post.scheduledAt?.toISOString(),
            expires_at: post.expiresAt?.toISOString(),
            author_email: post.authorEmail,
            author_name: post.authorName,
            author_avatar: post.authorAvatar || undefined,
            attachments: mappedAttachments
          };
        })
      );

      return postsWithAttachments;
    } catch (error) {
      console.error('Error fetching team posts:', error);
      throw error;
    }
  }

  static async getTeamAssignments(teamId: string, userId: string): Promise<TeamAssignment[]> {
    try {
      // Check if user is member of the team using Drizzle ORM
      const memberships = await dbPg
        .select({ id: newTeamMemberships.id })
        .from(newTeamMemberships)
        .where(
          and(
            eq(newTeamMemberships.userId, userId),
            eq(newTeamMemberships.teamId, teamId),
            eq(newTeamMemberships.status, 'active')
          )
        );

      if (memberships.length === 0) {
        throw new Error('Not a team member');
      }

      // Get assignments with creator information using Drizzle ORM
      const assignments = await dbPg
        .select({
          id: newTeamAssignments.id,
          title: newTeamAssignments.title,
          description: newTeamAssignments.description,
          assignmentType: newTeamAssignments.assignmentType,
          dueDate: newTeamAssignments.dueDate,
          points: newTeamAssignments.points,
          isRequired: newTeamAssignments.isRequired,
          maxAttempts: newTeamAssignments.maxAttempts,
          createdAt: newTeamAssignments.createdAt,
          updatedAt: newTeamAssignments.updatedAt,
          creatorEmail: users.email,
          creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`
        })
        .from(newTeamAssignments)
        .innerJoin(users, eq(newTeamAssignments.createdBy, users.id))
        .where(eq(newTeamAssignments.teamId, teamId))
        .orderBy(asc(newTeamAssignments.dueDate), desc(newTeamAssignments.createdAt));

      // Get submission status for each assignment using Drizzle ORM
      const assignmentsWithSubmissions = await Promise.all(
        assignments.map(async (assignment) => {
          const submissions = await dbPg
            .select({
              status: newTeamAssignmentSubmissions.status,
              submittedAt: newTeamAssignmentSubmissions.submittedAt,
              grade: newTeamAssignmentSubmissions.grade,
              attemptNumber: newTeamAssignmentSubmissions.attemptNumber
            })
            .from(newTeamAssignmentSubmissions)
            .where(
              and(
                eq(newTeamAssignmentSubmissions.assignmentId, assignment.id),
                eq(newTeamAssignmentSubmissions.userId, userId)
              )
            )
            .orderBy(desc(newTeamAssignmentSubmissions.submittedAt))
            .limit(1);

          return {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description || undefined,
            assignment_type: assignment.assignmentType as 'task' | 'homework' | 'project' | 'study' | 'other',
            due_date: assignment.dueDate?.toISOString(),
            points: assignment.points || undefined,
            is_required: assignment.isRequired || true,
            max_attempts: assignment.maxAttempts || undefined,
            created_at: assignment.createdAt?.toISOString() || new Date().toISOString(),
            updated_at: assignment.updatedAt?.toISOString() || new Date().toISOString(),
            creator_email: assignment.creatorEmail,
            creator_name: assignment.creatorName,
            user_submission: submissions[0] ? {
              status: submissions[0].status as 'draft' | 'submitted' | 'graded' | 'returned',
              submitted_at: submissions[0].submittedAt?.toISOString() || new Date().toISOString(),
              grade: submissions[0].grade || undefined,
              attempt_number: submissions[0].attemptNumber || 1
            } : undefined
          };
        })
      );

      return assignmentsWithSubmissions;
    } catch (error) {
      console.error('Error fetching team assignments:', error);
      throw error;
    }
  }

  static async getUserNotifications(userId: string, limit = 20, offset = 0, unreadOnly = false): Promise<{ notifications: TeamNotification[], unread_count: number }> {
    try {
      // Build the base query using Drizzle ORM
      let notificationsQuery = dbPg
        .select({
          id: newTeamNotifications.id,
          type: newTeamNotifications.notificationType,
          title: newTeamNotifications.title,
          message: newTeamNotifications.message,
          data: newTeamNotifications.data,
          isRead: newTeamNotifications.isRead,
          createdAt: newTeamNotifications.createdAt,
          readAt: newTeamNotifications.readAt,
          school: newTeamGroups.school,
          division: newTeamGroups.division,
          teamName: sql<string>`CONCAT(${newTeamGroups.school}, ' ', ${newTeamGroups.division})`
        })
        .from(newTeamNotifications)
        .leftJoin(newTeamUnits, eq(newTeamNotifications.teamId, newTeamUnits.id))
        .leftJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
        .where(eq(newTeamNotifications.userId, userId));

      // Add unread filter if needed
      if (unreadOnly) {
        notificationsQuery = dbPg
          .select({
            id: newTeamNotifications.id,
            type: newTeamNotifications.notificationType,
            title: newTeamNotifications.title,
            message: newTeamNotifications.message,
            data: newTeamNotifications.data,
            isRead: newTeamNotifications.isRead,
            createdAt: newTeamNotifications.createdAt,
            readAt: newTeamNotifications.readAt,
            school: newTeamGroups.school,
            division: newTeamGroups.division,
            teamName: sql<string>`CONCAT(${newTeamGroups.school}, ' ', ${newTeamGroups.division})`
          })
          .from(newTeamNotifications)
          .leftJoin(newTeamUnits, eq(newTeamNotifications.teamId, newTeamUnits.id))
          .leftJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
          .where(
            and(
              eq(newTeamNotifications.userId, userId),
              eq(newTeamNotifications.isRead, false)
            )
          );
      }

      // Execute the query with limit and offset
      const notifications = await notificationsQuery
        .orderBy(desc(newTeamNotifications.createdAt))
        .limit(limit)
        .offset(offset);

      // Get unread count using Drizzle ORM
      const unreadCountResult = await dbPg
        .select({ count: sql<number>`COUNT(*)` })
        .from(newTeamNotifications)
        .where(
          and(
            eq(newTeamNotifications.userId, userId),
            eq(newTeamNotifications.isRead, false)
          )
        );

      return {
        notifications: notifications.map(notification => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          is_read: notification.isRead || false,
          created_at: notification.createdAt?.toISOString() || new Date().toISOString(),
          read_at: notification.readAt?.toISOString(),
          school: notification.school || undefined,
          division: notification.division || undefined,
          team_name: notification.teamName
        })),
        unread_count: unreadCountResult[0]?.count || 0
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  static async markNotificationsAsRead(userId: string, notificationIds?: string[], markAll = false): Promise<void> {
    try {
      if (markAll) {
        // Mark all notifications as read using Drizzle ORM
        await dbPg
          .update(newTeamNotifications)
          .set({
            isRead: true,
            readAt: new Date()
          })
          .where(
            and(
              eq(newTeamNotifications.userId, userId),
              eq(newTeamNotifications.isRead, false)
            )
          );
      } else if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications as read using Drizzle ORM
        await dbPg
          .update(newTeamNotifications)
          .set({
            isRead: true,
            readAt: new Date()
          })
          .where(
            and(
              eq(newTeamNotifications.userId, userId),
              inArray(newTeamNotifications.id, notificationIds)
            )
          );
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }
}
