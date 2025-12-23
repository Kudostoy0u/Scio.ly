import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	assignmentResults: {
		assignment: r.one.assignments({
			from: r.assignmentResults.assignmentId,
			to: r.assignments.id,
		}),
	},
	assignments: {
		assignmentResults: r.many.assignmentResults(),
	},
	calendarEvents: {
		users: r.many.users({
			from: r.calendarEvents.id.through(r.calendarEventAttendees.eventId),
			to: r.users.id.through(r.calendarEventAttendees.userId),
			alias: "calendarEvents_id_users_id_via_calendarEventAttendees",
		}),
		userCreatedBy: r.one.users({
			from: r.calendarEvents.createdBy,
			to: r.users.id,
			alias: "calendarEvents_createdBy_users_id",
		}),
		userOwnerUserId: r.one.users({
			from: r.calendarEvents.ownerUserId,
			to: r.users.id,
			alias: "calendarEvents_ownerUserId_users_id",
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.calendarEvents.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.calendarEvents.teamId,
			to: r.teams.id,
		}),
	},
	users: {
		calendarEventsViaCalendarEventAttendees: r.many.calendarEvents({
			alias: "calendarEvents_id_users_id_via_calendarEventAttendees",
		}),
		calendarEventsCreatedBy: r.many.calendarEvents({
			alias: "calendarEvents_createdBy_users_id",
		}),
		calendarEventsOwnerUserId: r.many.calendarEvents({
			alias: "calendarEvents_ownerUserId_users_id",
		}),
		teamActiveTimers: r.many.teamActiveTimers(),
		teamAssignmentsViaTeamAssignmentAnalytics: r.many.teamAssignments({
			from: r.users.id.through(r.teamAssignmentAnalytics.userId),
			to: r.teamAssignments.id.through(r.teamAssignmentAnalytics.assignmentId),
			alias: "users_id_teamAssignments_id_via_teamAssignmentAnalytics",
		}),
		teamAssignmentRosters: r.many.teamAssignmentRoster(),
		teamsViaTeamAssignmentTemplates: r.many.teams({
			from: r.users.id.through(r.teamAssignmentTemplates.createdBy),
			to: r.teams.id.through(r.teamAssignmentTemplates.teamId),
			alias: "users_id_teams_id_via_teamAssignmentTemplates",
		}),
		teamAssignmentsCreatedBy: r.many.teamAssignments({
			alias: "teamAssignments_createdBy_users_id",
		}),
		teamEventsViaTeamEventAttendees: r.many.teamEvents({
			alias: "teamEvents_id_users_id_via_teamEventAttendees",
		}),
		teamEventsCreatedBy: r.many.teamEvents({
			alias: "teamEvents_createdBy_users_id",
		}),
		teamInvitationsInvitedBy: r.many.teamInvitations({
			alias: "teamInvitations_invitedBy_users_id",
		}),
		teamInvitationsInvitedUserId: r.many.teamInvitations({
			alias: "teamInvitations_invitedUserId_users_id",
		}),
		teamsViaTeamLinkInvitations: r.many.teams({
			from: r.users.id.through(r.teamLinkInvitations.invitedBy),
			to: r.teams.id.through(r.teamLinkInvitations.teamId),
			alias: "users_id_teams_id_via_teamLinkInvitations",
		}),
		teamMaterials: r.many.teamMaterials(),
		teamMembershipsInvitedBy: r.many.teamMemberships({
			alias: "teamMemberships_invitedBy_users_id",
		}),
		teamMembershipsUserId: r.many.teamMemberships({
			alias: "teamMemberships_userId_users_id",
		}),
		teamMessages: r.many.teamMessages(),
		teamsViaTeamNotifications: r.many.teams({
			alias: "teams_id_users_id_via_teamNotifications",
		}),
		teamPeople: r.many.teamPeople(),
		teamPollsViaTeamPollVotes: r.many.teamPolls({
			alias: "teamPolls_id_users_id_via_teamPollVotes",
		}),
		teamPollsCreatedBy: r.many.teamPolls({
			alias: "teamPolls_createdBy_users_id",
		}),
		teamRecurringMeetings: r.many.teamRecurringMeetings(),
		teamRemovedEvents: r.many.teamRemovedEvents(),
		teamRosters: r.many.teamRoster(),
		teamStreamPostsViaTeamStreamComments: r.many.teamStreamPosts({
			from: r.users.id.through(r.teamStreamComments.authorId),
			to: r.teamStreamPosts.id.through(r.teamStreamComments.postId),
			alias: "users_id_teamStreamPosts_id_via_teamStreamComments",
		}),
		teamStreamPostsAuthorId: r.many.teamStreamPosts({
			alias: "teamStreamPosts_authorId_users_id",
		}),
		teamAssignmentsViaTeamSubmissions: r.many.teamAssignments({
			alias: "teamAssignments_id_users_id_via_teamSubmissions",
		}),
		teamsViaTeamSubteams: r.many.teams({
			from: r.users.id.through(r.teamSubteams.createdBy),
			to: r.teams.id.through(r.teamSubteams.teamId),
			alias: "users_id_teams_id_via_teamSubteams",
		}),
		teamsCreatedBy: r.many.teams({
			alias: "teams_createdBy_users_id",
		}),
		userCalendarManifests: r.many.userCalendarManifests(),
	},
	teamSubteams: {
		calendarEvents: r.many.calendarEvents(),
		teamActiveTimers: r.many.teamActiveTimers(),
		teamAssignmentRosters: r.many.teamAssignmentRoster(),
		teamAssignments: r.many.teamAssignments(),
		teamEvents: r.many.teamEvents(),
		teamMaterials: r.many.teamMaterials(),
		teamMessages: r.many.teamMessages(),
		teamPeople: r.many.teamPeople(),
		teamPolls: r.many.teamPolls(),
		teamRecurringMeetings: r.many.teamRecurringMeetings(),
		teamRemovedEvents: r.many.teamRemovedEvents(),
		teamRosters: r.many.teamRoster(),
		teamStreamPosts: r.many.teamStreamPosts(),
		teams: r.many.teams({
			from: r.teamSubteams.id.through(r.teamSubteamCacheManifests.subteamId),
			to: r.teams.id.through(r.teamSubteamCacheManifests.teamId),
		}),
	},
	teams: {
		calendarEvents: r.many.calendarEvents(),
		teamActiveTimers: r.many.teamActiveTimers(),
		teamAnalytics: r.many.teamAnalytics(),
		usersViaTeamAssignmentTemplates: r.many.users({
			alias: "users_id_teams_id_via_teamAssignmentTemplates",
		}),
		teamAssignments: r.many.teamAssignments(),
		teamCacheManifests: r.many.teamCacheManifests(),
		teamEvents: r.many.teamEvents(),
		teamInvitations: r.many.teamInvitations(),
		usersViaTeamLinkInvitations: r.many.users({
			alias: "users_id_teams_id_via_teamLinkInvitations",
		}),
		teamMaterials: r.many.teamMaterials(),
		teamMemberships: r.many.teamMemberships(),
		teamMessages: r.many.teamMessages(),
		usersViaTeamNotifications: r.many.users({
			from: r.teams.id.through(r.teamNotifications.teamId),
			to: r.users.id.through(r.teamNotifications.userId),
			alias: "teams_id_users_id_via_teamNotifications",
		}),
		teamPeople: r.many.teamPeople(),
		teamPolls: r.many.teamPolls(),
		teamRecurringMeetings: r.many.teamRecurringMeetings(),
		teamRemovedEvents: r.many.teamRemovedEvents(),
		teamRosters: r.many.teamRoster(),
		teamStreamPosts: r.many.teamStreamPosts(),
		teamSubteams: r.many.teamSubteams(),
		usersViaTeamSubteams: r.many.users({
			alias: "users_id_teams_id_via_teamSubteams",
		}),
		user: r.one.users({
			from: r.teams.createdBy,
			to: r.users.id,
			alias: "teams_createdBy_users_id",
		}),
	},
	teamActiveTimers: {
		user: r.one.users({
			from: r.teamActiveTimers.addedBy,
			to: r.users.id,
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamActiveTimers.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamActiveTimers.teamId,
			to: r.teams.id,
		}),
	},
	teamAnalytics: {
		team: r.one.teams({
			from: r.teamAnalytics.teamId,
			to: r.teams.id,
		}),
	},
	teamAssignments: {
		usersViaTeamAssignmentAnalytics: r.many.users({
			alias: "users_id_teamAssignments_id_via_teamAssignmentAnalytics",
		}),
		teamAssignmentQuestions: r.many.teamAssignmentQuestions(),
		teamAssignmentRosters: r.many.teamAssignmentRoster(),
		user: r.one.users({
			from: r.teamAssignments.createdBy,
			to: r.users.id,
			alias: "teamAssignments_createdBy_users_id",
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamAssignments.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamAssignments.teamId,
			to: r.teams.id,
		}),
		usersViaTeamSubmissions: r.many.users({
			from: r.teamAssignments.id.through(r.teamSubmissions.assignmentId),
			to: r.users.id.through(r.teamSubmissions.userId),
			alias: "teamAssignments_id_users_id_via_teamSubmissions",
		}),
	},
	teamSubmissions: {
		teamAssignmentQuestions: r.many.teamAssignmentQuestions({
			from: r.teamSubmissions.id.through(
				r.teamAssignmentQuestionResponses.submissionId,
			),
			to: r.teamAssignmentQuestions.id.through(
				r.teamAssignmentQuestionResponses.questionId,
			),
		}),
	},
	teamAssignmentQuestions: {
		teamSubmissions: r.many.teamSubmissions(),
		teamAssignment: r.one.teamAssignments({
			from: r.teamAssignmentQuestions.assignmentId,
			to: r.teamAssignments.id,
		}),
	},
	teamAssignmentRoster: {
		teamAssignment: r.one.teamAssignments({
			from: r.teamAssignmentRoster.assignmentId,
			to: r.teamAssignments.id,
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamAssignmentRoster.subteamId,
			to: r.teamSubteams.id,
		}),
		user: r.one.users({
			from: r.teamAssignmentRoster.userId,
			to: r.users.id,
		}),
	},
	teamCacheManifests: {
		team: r.one.teams({
			from: r.teamCacheManifests.teamId,
			to: r.teams.id,
		}),
	},
	teamEvents: {
		users: r.many.users({
			from: r.teamEvents.id.through(r.teamEventAttendees.eventId),
			to: r.users.id.through(r.teamEventAttendees.userId),
			alias: "teamEvents_id_users_id_via_teamEventAttendees",
		}),
		user: r.one.users({
			from: r.teamEvents.createdBy,
			to: r.users.id,
			alias: "teamEvents_createdBy_users_id",
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamEvents.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamEvents.teamId,
			to: r.teams.id,
		}),
	},
	teamInvitations: {
		userInvitedBy: r.one.users({
			from: r.teamInvitations.invitedBy,
			to: r.users.id,
			alias: "teamInvitations_invitedBy_users_id",
		}),
		userInvitedUserId: r.one.users({
			from: r.teamInvitations.invitedUserId,
			to: r.users.id,
			alias: "teamInvitations_invitedUserId_users_id",
		}),
		team: r.one.teams({
			from: r.teamInvitations.teamId,
			to: r.teams.id,
		}),
	},
	teamMaterials: {
		user: r.one.users({
			from: r.teamMaterials.createdBy,
			to: r.users.id,
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamMaterials.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamMaterials.teamId,
			to: r.teams.id,
		}),
	},
	teamMemberships: {
		userInvitedBy: r.one.users({
			from: r.teamMemberships.invitedBy,
			to: r.users.id,
			alias: "teamMemberships_invitedBy_users_id",
		}),
		team: r.one.teams({
			from: r.teamMemberships.teamId,
			to: r.teams.id,
		}),
		userUserId: r.one.users({
			from: r.teamMemberships.userId,
			to: r.users.id,
			alias: "teamMemberships_userId_users_id",
		}),
	},
	teamMessages: {
		user: r.one.users({
			from: r.teamMessages.senderId,
			to: r.users.id,
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamMessages.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamMessages.teamId,
			to: r.teams.id,
		}),
	},
	teamPeople: {
		teamSubteam: r.one.teamSubteams({
			from: r.teamPeople.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamPeople.teamId,
			to: r.teams.id,
		}),
		user: r.one.users({
			from: r.teamPeople.userId,
			to: r.users.id,
		}),
	},
	teamPolls: {
		users: r.many.users({
			from: r.teamPolls.id.through(r.teamPollVotes.pollId),
			to: r.users.id.through(r.teamPollVotes.userId),
			alias: "teamPolls_id_users_id_via_teamPollVotes",
		}),
		user: r.one.users({
			from: r.teamPolls.createdBy,
			to: r.users.id,
			alias: "teamPolls_createdBy_users_id",
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamPolls.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamPolls.teamId,
			to: r.teams.id,
		}),
	},
	teamPostAttachments: {
		teamStreamPost: r.one.teamStreamPosts({
			from: r.teamPostAttachments.postId,
			to: r.teamStreamPosts.id,
		}),
	},
	teamStreamPosts: {
		teamPostAttachments: r.many.teamPostAttachments(),
		users: r.many.users({
			alias: "users_id_teamStreamPosts_id_via_teamStreamComments",
		}),
		user: r.one.users({
			from: r.teamStreamPosts.authorId,
			to: r.users.id,
			alias: "teamStreamPosts_authorId_users_id",
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamStreamPosts.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamStreamPosts.teamId,
			to: r.teams.id,
		}),
	},
	teamRecurringMeetings: {
		user: r.one.users({
			from: r.teamRecurringMeetings.createdBy,
			to: r.users.id,
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamRecurringMeetings.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamRecurringMeetings.teamId,
			to: r.teams.id,
		}),
	},
	teamRemovedEvents: {
		user: r.one.users({
			from: r.teamRemovedEvents.removedBy,
			to: r.users.id,
		}),
		teamSubteam: r.one.teamSubteams({
			from: r.teamRemovedEvents.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamRemovedEvents.teamId,
			to: r.teams.id,
		}),
	},
	teamRoster: {
		teamSubteam: r.one.teamSubteams({
			from: r.teamRoster.subteamId,
			to: r.teamSubteams.id,
		}),
		team: r.one.teams({
			from: r.teamRoster.teamId,
			to: r.teams.id,
		}),
		user: r.one.users({
			from: r.teamRoster.userId,
			to: r.users.id,
		}),
	},
	userCalendarManifests: {
		user: r.one.users({
			from: r.userCalendarManifests.userId,
			to: r.users.id,
		}),
	},
}));
