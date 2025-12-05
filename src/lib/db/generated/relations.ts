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
	newTeamEvents: {
		newTeamUnitsViaNewTeamActiveTimers: r.many.newTeamUnits({
			from: r.newTeamEvents.id.through(r.newTeamActiveTimers.eventId),
			to: r.newTeamUnits.id.through(r.newTeamActiveTimers.teamUnitId),
			alias: "newTeamEvents_id_newTeamUnits_id_via_newTeamActiveTimers",
		}),
		newTeamEventAttendees: r.many.newTeamEventAttendees(),
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamEvents.teamId,
			to: r.newTeamUnits.id,
			alias: "newTeamEvents_teamId_newTeamUnits_id",
		}),
		newTeamUnitsViaNewTeamStreamPosts: r.many.newTeamUnits({
			alias: "newTeamUnits_id_newTeamEvents_id_via_newTeamStreamPosts",
		}),
	},
	newTeamUnits: {
		newTeamEventsViaNewTeamActiveTimers: r.many.newTeamEvents({
			alias: "newTeamEvents_id_newTeamUnits_id_via_newTeamActiveTimers",
		}),
		newTeamAnalytics: r.many.newTeamAnalytics(),
		newTeamAssignmentsViaNewTeamAssignmentRoster: r.many.newTeamAssignments({
			alias:
				"newTeamAssignments_id_newTeamUnits_id_via_newTeamAssignmentRoster",
		}),
		newTeamAssignmentTemplates: r.many.newTeamAssignmentTemplates(),
		newTeamAssignmentsTeamId: r.many.newTeamAssignments({
			alias: "newTeamAssignments_teamId_newTeamUnits_id",
		}),
		newTeamEventsTeamId: r.many.newTeamEvents({
			alias: "newTeamEvents_teamId_newTeamUnits_id",
		}),
		newTeamInvitations: r.many.newTeamInvitations(),
		newTeamMaterials: r.many.newTeamMaterials(),
		newTeamMemberships: r.many.newTeamMemberships(),
		newTeamMessages: r.many.newTeamMessages(),
		newTeamNotifications: r.many.newTeamNotifications(),
		users: r.many.users({
			from: r.newTeamUnits.id.through(r.newTeamPeople.teamUnitId),
			to: r.users.id.through(r.newTeamPeople.userId),
		}),
		newTeamPolls: r.many.newTeamPolls(),
		newTeamPosts: r.many.newTeamPosts(),
		newTeamRecurringMeetings: r.many.newTeamRecurringMeetings(),
		newTeamRemovedEvents: r.many.newTeamRemovedEvents(),
		newTeamRosterData: r.many.newTeamRosterData(),
		newTeamEventsViaNewTeamStreamPosts: r.many.newTeamEvents({
			from: r.newTeamUnits.id.through(r.newTeamStreamPosts.teamUnitId),
			to: r.newTeamEvents.id.through(r.newTeamStreamPosts.tournamentId),
			alias: "newTeamUnits_id_newTeamEvents_id_via_newTeamStreamPosts",
		}),
		newTeamGroup: r.one.newTeamGroups({
			from: r.newTeamUnits.groupId,
			to: r.newTeamGroups.id,
		}),
		rosterLinkInvitations: r.many.rosterLinkInvitations(),
	},
	newTeamAnalytics: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamAnalytics.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamAssignmentAnalytics: {
		newTeamAssignment: r.one.newTeamAssignments({
			from: r.newTeamAssignmentAnalytics.assignmentId,
			to: r.newTeamAssignments.id,
		}),
	},
	newTeamAssignments: {
		newTeamAssignmentAnalytics: r.many.newTeamAssignmentAnalytics(),
		newTeamAssignmentQuestions: r.many.newTeamAssignmentQuestions(),
		newTeamUnits: r.many.newTeamUnits({
			from: r.newTeamAssignments.id.through(
				r.newTeamAssignmentRoster.assignmentId,
			),
			to: r.newTeamUnits.id.through(r.newTeamAssignmentRoster.subteamId),
			alias:
				"newTeamAssignments_id_newTeamUnits_id_via_newTeamAssignmentRoster",
		}),
		newTeamAssignmentSubmissions: r.many.newTeamAssignmentSubmissions(),
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamAssignments.teamId,
			to: r.newTeamUnits.id,
			alias: "newTeamAssignments_teamId_newTeamUnits_id",
		}),
	},
	newTeamAssignmentQuestions: {
		newTeamAssignmentSubmissions: r.many.newTeamAssignmentSubmissions({
			from: r.newTeamAssignmentQuestions.id.through(
				r.newTeamAssignmentQuestionResponses.questionId,
			),
			to: r.newTeamAssignmentSubmissions.id.through(
				r.newTeamAssignmentQuestionResponses.submissionId,
			),
		}),
		newTeamAssignment: r.one.newTeamAssignments({
			from: r.newTeamAssignmentQuestions.assignmentId,
			to: r.newTeamAssignments.id,
		}),
	},
	newTeamAssignmentSubmissions: {
		newTeamAssignmentQuestions: r.many.newTeamAssignmentQuestions(),
		newTeamAssignment: r.one.newTeamAssignments({
			from: r.newTeamAssignmentSubmissions.assignmentId,
			to: r.newTeamAssignments.id,
		}),
	},
	newTeamAssignmentTemplates: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamAssignmentTemplates.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamEventAttendees: {
		newTeamEvent: r.one.newTeamEvents({
			from: r.newTeamEventAttendees.eventId,
			to: r.newTeamEvents.id,
		}),
	},
	newTeamInvitations: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamInvitations.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamMaterials: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamMaterials.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamMemberships: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamMemberships.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamMessages: {
		newTeamUnits: r.many.newTeamUnits({
			from: r.newTeamMessages.id.through(r.newTeamMessages.replyTo),
			to: r.newTeamUnits.id.through(r.newTeamMessages.teamId),
		}),
	},
	newTeamNotifications: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamNotifications.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	users: {
		newTeamUnits: r.many.newTeamUnits(),
		teamUnits: r.many.teamUnits({
			from: r.users.id.through(r.teamMemberships.userId),
			to: r.teamUnits.id.through(r.teamMemberships.teamUnitId),
		}),
		teamsAssignmentsCreatedBy: r.many.teamsAssignment({
			alias: "teamsAssignment_createdBy_users_id",
		}),
		teamsInvitationsInvitedBy: r.many.teamsInvitation({
			alias: "teamsInvitation_invitedBy_users_id",
		}),
		teamsInvitationsInvitedUserId: r.many.teamsInvitation({
			alias: "teamsInvitation_invitedUserId_users_id",
		}),
		teamsTeamsViaTeamsLinkInvitation: r.many.teamsTeam({
			from: r.users.id.through(r.teamsLinkInvitation.invitedBy),
			to: r.teamsTeam.id.through(r.teamsLinkInvitation.teamId),
			alias: "users_id_teamsTeam_id_via_teamsLinkInvitation",
		}),
		teamsMembershipsInvitedBy: r.many.teamsMembership({
			alias: "teamsMembership_invitedBy_users_id",
		}),
		teamsMembershipsUserId: r.many.teamsMembership({
			alias: "teamsMembership_userId_users_id",
		}),
		teamsRosters: r.many.teamsRoster(),
		teamsAssignmentsViaTeamsSubmission: r.many.teamsAssignment({
			alias: "teamsAssignment_id_users_id_via_teamsSubmission",
		}),
		teamsTeamsViaTeamsSubteam: r.many.teamsTeam({
			from: r.users.id.through(r.teamsSubteam.createdBy),
			to: r.teamsTeam.id.through(r.teamsSubteam.teamId),
			alias: "users_id_teamsTeam_id_via_teamsSubteam",
		}),
		teamsTeamsCreatedBy: r.many.teamsTeam({
			alias: "teamsTeam_createdBy_users_id",
		}),
	},
	newTeamPollVotes: {
		newTeamPoll: r.one.newTeamPolls({
			from: r.newTeamPollVotes.pollId,
			to: r.newTeamPolls.id,
		}),
	},
	newTeamPolls: {
		newTeamPollVotes: r.many.newTeamPollVotes(),
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamPolls.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamPostAttachments: {
		newTeamPost: r.one.newTeamPosts({
			from: r.newTeamPostAttachments.postId,
			to: r.newTeamPosts.id,
		}),
	},
	newTeamPosts: {
		newTeamPostAttachments: r.many.newTeamPostAttachments(),
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamPosts.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamRecurringMeetings: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamRecurringMeetings.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamRemovedEvents: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamRemovedEvents.teamUnitId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamRosterData: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.newTeamRosterData.teamUnitId,
			to: r.newTeamUnits.id,
		}),
	},
	newTeamStreamComments: {
		newTeamStreamPost: r.one.newTeamStreamPosts({
			from: r.newTeamStreamComments.postId,
			to: r.newTeamStreamPosts.id,
		}),
	},
	newTeamStreamPosts: {
		newTeamStreamComments: r.many.newTeamStreamComments(),
	},
	newTeamGroups: {
		newTeamUnits: r.many.newTeamUnits(),
	},
	rosterLinkInvitations: {
		newTeamUnit: r.one.newTeamUnits({
			from: r.rosterLinkInvitations.teamId,
			to: r.newTeamUnits.id,
		}),
	},
	teamUnits: {
		users: r.many.users(),
		teamGroup: r.one.teamGroups({
			from: r.teamUnits.groupId,
			to: r.teamGroups.id,
		}),
	},
	teamGroups: {
		teamUnits: r.many.teamUnits(),
	},
	teamsAssignment: {
		user: r.one.users({
			from: r.teamsAssignment.createdBy,
			to: r.users.id,
			alias: "teamsAssignment_createdBy_users_id",
		}),
		teamsSubteam: r.one.teamsSubteam({
			from: r.teamsAssignment.subteamId,
			to: r.teamsSubteam.id,
		}),
		teamsTeam: r.one.teamsTeam({
			from: r.teamsAssignment.teamId,
			to: r.teamsTeam.id,
		}),
		users: r.many.users({
			from: r.teamsAssignment.id.through(r.teamsSubmission.assignmentId),
			to: r.users.id.through(r.teamsSubmission.userId),
			alias: "teamsAssignment_id_users_id_via_teamsSubmission",
		}),
	},
	teamsSubteam: {
		teamsAssignments: r.many.teamsAssignment(),
		teamsRosters: r.many.teamsRoster(),
	},
	teamsTeam: {
		teamsAssignments: r.many.teamsAssignment(),
		teamsInvitations: r.many.teamsInvitation(),
		usersViaTeamsLinkInvitation: r.many.users({
			alias: "users_id_teamsTeam_id_via_teamsLinkInvitation",
		}),
		teamsMemberships: r.many.teamsMembership(),
		teamsRosters: r.many.teamsRoster(),
		usersViaTeamsSubteam: r.many.users({
			alias: "users_id_teamsTeam_id_via_teamsSubteam",
		}),
		user: r.one.users({
			from: r.teamsTeam.createdBy,
			to: r.users.id,
			alias: "teamsTeam_createdBy_users_id",
		}),
	},
	teamsInvitation: {
		userInvitedBy: r.one.users({
			from: r.teamsInvitation.invitedBy,
			to: r.users.id,
			alias: "teamsInvitation_invitedBy_users_id",
		}),
		userInvitedUserId: r.one.users({
			from: r.teamsInvitation.invitedUserId,
			to: r.users.id,
			alias: "teamsInvitation_invitedUserId_users_id",
		}),
		teamsTeam: r.one.teamsTeam({
			from: r.teamsInvitation.teamId,
			to: r.teamsTeam.id,
		}),
	},
	teamsMembership: {
		userInvitedBy: r.one.users({
			from: r.teamsMembership.invitedBy,
			to: r.users.id,
			alias: "teamsMembership_invitedBy_users_id",
		}),
		teamsTeam: r.one.teamsTeam({
			from: r.teamsMembership.teamId,
			to: r.teamsTeam.id,
		}),
		userUserId: r.one.users({
			from: r.teamsMembership.userId,
			to: r.users.id,
			alias: "teamsMembership_userId_users_id",
		}),
	},
	teamsRoster: {
		teamsSubteam: r.one.teamsSubteam({
			from: r.teamsRoster.subteamId,
			to: r.teamsSubteam.id,
		}),
		teamsTeam: r.one.teamsTeam({
			from: r.teamsRoster.teamId,
			to: r.teamsTeam.id,
		}),
		user: r.one.users({
			from: r.teamsRoster.userId,
			to: r.users.id,
		}),
	},
}));
