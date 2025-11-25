import { dbPg } from "@/lib/db";
import { newTeamAssignmentSubmissions, newTeamAssignments } from "@/lib/db/schema/assignments";
import { users } from "@/lib/db/schema/core";
import { newTeamNotifications } from "@/lib/db/schema/notifications";
import {
  newTeamGroups,
  newTeamMemberships,
  newTeamStreamPosts,
  newTeamUnits,
} from "@/lib/db/schema/teams";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

export interface TeamPost {
  id: string;
  title?: string;
  content: string;
  post_type: "announcement" | "assignment" | "material" | "event";
  priority: "low" | "normal" | "high" | "urgent";
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
  assignment_type: "task" | "homework" | "project" | "study" | "other";
  due_date?: string;
  points?: number;
  is_required: boolean;
  max_attempts?: number;
  created_at: string;
  updated_at: string;
  creator_email: string;
  creator_name?: string;
  user_submission?: {
    status: "draft" | "submitted" | "graded" | "returned";
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
  data: Record<string, unknown>; // Flexible notification data that varies by type
  is_read: boolean;
  created_at: string;
  read_at?: string;
  school?: string;
  division?: string;
  team_name?: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: This is a service class with static methods for team data operations
export class TeamDataService {
  static async getTeamPosts(teamId: string, userId: string): Promise<TeamPost[]> {
    // Check if user is member of the team using Drizzle ORM
    const memberships = await dbPg
      .select({ id: newTeamMemberships.id })
      .from(newTeamMemberships)
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamMemberships.teamId, teamId),
          eq(newTeamMemberships.status, "active")
        )
      );

    if (memberships.length === 0) {
      throw new Error("Not a team member");
    }

    // Get posts with author information using Drizzle ORM
    const posts = await dbPg
      .select({
        id: newTeamStreamPosts.id,
        title: newTeamStreamPosts.attachmentTitle,
        content: newTeamStreamPosts.content,
        postType: sql<string | null>`NULL`,
        priority: sql<string | null>`NULL`,
        isPinned: sql<boolean | null>`NULL`,
        isPublic: sql<boolean | null>`NULL`,
        createdAt: newTeamStreamPosts.createdAt,
        updatedAt: newTeamStreamPosts.updatedAt,
        scheduledAt: sql<string | null>`NULL`,
        expiresAt: sql<string | null>`NULL`,
        authorEmail: users.email,
        authorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        authorAvatar: users.photoUrl,
        attachmentUrl: newTeamStreamPosts.attachmentUrl,
        attachmentTitle: newTeamStreamPosts.attachmentTitle,
      })
      .from(newTeamStreamPosts)
      .innerJoin(users, eq(newTeamStreamPosts.authorId, users.id))
      .where(eq(newTeamStreamPosts.teamUnitId, teamId))
      .orderBy(desc(newTeamStreamPosts.createdAt))
      .limit(50);

    // Map posts with attachments (attachments are stored directly on the post)
    const postsWithAttachments = posts.map((post) => {
      const mappedAttachments =
        post.attachmentUrl && post.attachmentTitle
          ? [
              {
                file_name: post.attachmentTitle,
                file_url: post.attachmentUrl,
                file_type: null as string | null,
                file_size: null as number | null,
              },
            ]
          : [];

      return {
        id: post.id,
        title: post.title || undefined,
        content: post.content,
        post_type: (post.postType || "announcement") as
          | "announcement"
          | "assignment"
          | "material"
          | "event",
        priority: (post.priority || "normal") as "low" | "normal" | "high" | "urgent",
        is_pinned: post.isPinned ?? false,
        is_public: true,
        created_at:
          post.createdAt && typeof post.createdAt === "object" && "toISOString" in post.createdAt
            ? (post.createdAt as Date).toISOString()
            : post.createdAt || new Date().toISOString(),
        updated_at:
          post.updatedAt && typeof post.updatedAt === "object" && "toISOString" in post.updatedAt
            ? (post.updatedAt as Date).toISOString()
            : post.updatedAt || new Date().toISOString(),
        scheduled_at:
          post.scheduledAt &&
          typeof post.scheduledAt === "object" &&
          "toISOString" in post.scheduledAt
            ? (post.scheduledAt as Date).toISOString()
            : post.scheduledAt || undefined,
        expires_at:
          post.expiresAt && typeof post.expiresAt === "object" && "toISOString" in post.expiresAt
            ? (post.expiresAt as Date).toISOString()
            : post.expiresAt || undefined,
        author_email: post.authorEmail,
        author_name: post.authorName,
        author_avatar: post.authorAvatar || undefined,
        attachments: mappedAttachments,
      };
    });

    return postsWithAttachments as TeamPost[];
  }

  static async getTeamAssignments(teamId: string, userId: string): Promise<TeamAssignment[]> {
    // Check if user is member of the team using Drizzle ORM
    const memberships = await dbPg
      .select({ id: newTeamMemberships.id })
      .from(newTeamMemberships)
      .where(
        and(
          eq(newTeamMemberships.userId, userId),
          eq(newTeamMemberships.teamId, teamId),
          eq(newTeamMemberships.status, "active")
        )
      );

    if (memberships.length === 0) {
      throw new Error("Not a team member");
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
        creatorName: sql<string>`COALESCE(${users.displayName}, CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
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
            attemptNumber: newTeamAssignmentSubmissions.attemptNumber,
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
          assignment_type: assignment.assignmentType as
            | "task"
            | "homework"
            | "project"
            | "study"
            | "other",
          due_date: assignment.dueDate?.toISOString(),
          points: assignment.points || undefined,
          is_required: true,
          max_attempts: assignment.maxAttempts || undefined,
          created_at: assignment.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: assignment.updatedAt?.toISOString() || new Date().toISOString(),
          creator_email: assignment.creatorEmail,
          creator_name: assignment.creatorName,
          user_submission: submissions[0]
            ? {
                status: submissions[0].status as "draft" | "submitted" | "graded" | "returned",
                submitted_at: submissions[0].submittedAt?.toISOString() || new Date().toISOString(),
                grade: submissions[0].grade || undefined,
                attempt_number: submissions[0].attemptNumber || 1,
              }
            : undefined,
        };
      })
    );

    return assignmentsWithSubmissions;
  }

  static async getUserNotifications(
    userId: string,
    limit = 20,
    offset = 0,
    unreadOnly = false
  ): Promise<{ notifications: TeamNotification[]; unread_count: number }> {
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
        teamName: sql<string>`CONCAT(${newTeamGroups.school}, ' ', ${newTeamGroups.division})`,
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
          teamName: sql<string>`CONCAT(${newTeamGroups.school}, ' ', ${newTeamGroups.division})`,
        })
        .from(newTeamNotifications)
        .leftJoin(newTeamUnits, eq(newTeamNotifications.teamId, newTeamUnits.id))
        .leftJoin(newTeamGroups, eq(newTeamUnits.groupId, newTeamGroups.id))
        .where(
          and(eq(newTeamNotifications.userId, userId), eq(newTeamNotifications.isRead, false))
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
      .where(and(eq(newTeamNotifications.userId, userId), eq(newTeamNotifications.isRead, false)));

    return {
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        is_read: notification.isRead ?? false,
        created_at: notification.createdAt?.toISOString() || new Date().toISOString(),
        read_at: notification.readAt?.toISOString(),
        school: notification.school || undefined,
        division: notification.division || undefined,
        team_name: notification.teamName || undefined,
      })),
      unread_count: unreadCountResult[0]?.count || 0,
    } as { notifications: TeamNotification[]; unread_count: number };
  }

  static async markNotificationsAsRead(
    userId: string,
    notificationIds?: string[],
    markAll = false
  ): Promise<void> {
    if (markAll) {
      // Mark all notifications as read using Drizzle ORM
      await dbPg
        .update(newTeamNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(eq(newTeamNotifications.userId, userId), eq(newTeamNotifications.isRead, false))
        );
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read using Drizzle ORM
      await dbPg
        .update(newTeamNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(newTeamNotifications.userId, userId),
            inArray(newTeamNotifications.id, notificationIds)
          )
        );
    }
  }
}
