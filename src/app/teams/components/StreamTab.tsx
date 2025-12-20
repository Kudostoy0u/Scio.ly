"use client";

import ConfirmModal from "@/app/components/ConfirmModal";
import { useTheme } from "@/app/contexts/ThemeContext";
import { trpc } from "@/lib/trpc/client";
import { globalApiCache } from "@/lib/utils/storage/globalApiCache";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

// Import stream components
import ActiveTimers from "./stream/ActiveTimers";
import PostCreator from "./stream/PostCreator";
import StreamPosts from "./stream/StreamPosts";
import TimerManager from "./stream/TimerManager";
import type { Event, Team } from "./stream/streamTypes";

interface StreamTabProps {
	team: Team;
	isCaptain: boolean;
	activeSubteamId?: string | null;
}

export default function StreamTab({
	team,
	isCaptain,
	activeSubteamId,
}: StreamTabProps) {
	const { darkMode } = useTheme();
	const utils = trpc.useUtils();

	const [posting, setPosting] = useState(false);

	// Queries
	const { data: rawPosts = [] } = trpc.teams.getStream.useQuery(
		{ teamSlug: team.slug, subteamId: activeSubteamId || "" },
		{ enabled: !!activeSubteamId },
	);

	const { data: rawTournaments = [] } = trpc.teams.getTournaments.useQuery(
		{ teamSlug: team.slug, subteamId: activeSubteamId || "" },
		{ enabled: !!activeSubteamId },
	);

	const { data: rawTimers = [] } = trpc.teams.getTimers.useQuery(
		{ teamSlug: team.slug, subteamId: activeSubteamId || "" },
		{ enabled: !!activeSubteamId },
	);

	// Mutations
	const createPostMutation = trpc.teams.createPost.useMutation();
	const updatePostMutation = trpc.teams.updatePost.useMutation();
	const deletePostMutation = trpc.teams.deletePost.useMutation();
	const addCommentMutation = trpc.teams.addComment.useMutation();
	const deleteCommentMutation = trpc.teams.deleteComment.useMutation();
	const addTimerMutation = trpc.teams.addTimer.useMutation();
	const removeTimerMutation = trpc.teams.removeTimer.useMutation();

	// Post creation state
	const [newPostContent, setNewPostContent] = useState("");

	// Event type filter state
	const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([
		"tournament",
	]);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// Comments state - all posts expanded by default
	const [expandedComments, setExpandedComments] = useState<Set<string>>(
		new Set(),
	);
	const [newComments, setNewComments] = useState<Record<string, string>>({});
	const [deletePostConfirm, setDeletePostConfirm] = useState<string | null>(
		null,
	);
	const [deleteCommentConfirm, setDeleteCommentConfirm] = useState<
		string | null
	>(null);

	// Create a new post
	const handleCreatePost = async (attachmentData?: {
		title: string;
		url: string;
	}) => {
		if (!(newPostContent.trim() && activeSubteamId)) {
			return;
		}

		setPosting(true);
		try {
			await createPostMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				content: newPostContent.trim(),
				showTournamentTimer: false,
				tournamentId: null,
				attachmentUrl: attachmentData?.url || null,
				attachmentTitle: attachmentData?.title || null,
			});

			setNewPostContent("");
			// Invalidate tRPC cache
			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			// Invalidate globalApiCache
			globalApiCache.invalidate(`stream-${team.slug}-${activeSubteamId}`);
			toast.success("Post created successfully");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to create post",
			);
		}
		setPosting(false);
	};

	// Add an event timer
	const handleAddTimer = async (event: Event) => {
		if (activeTimers.some((t) => t.id === event.id)) {
			return; // Already added
		}

		if (!activeSubteamId) return;

		try {
			await addTimerMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				eventId: event.id,
			});

			// Invalidate queries
			utils.teams.getTimers.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			utils.teams.getTournaments.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});

			toast.success(`Added timer for ${event.title}`);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add timer",
			);
		}
	};

	// Remove an event timer
	const handleRemoveTimer = async (eventId: string) => {
		if (!activeSubteamId) return;

		try {
			await removeTimerMutation.mutateAsync({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
				eventId: eventId,
			});

			// Invalidate queries
			utils.teams.getTimers.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			utils.teams.getTournaments.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});

			toast.success("Timer removed");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to remove timer",
			);
		}
	};

	// Handle event type filter change
	const handleEventTypeFilterChange = (eventTypes: string[]) => {
		setSelectedEventTypes(eventTypes);
	};

	// Toggle comments visibility
	const toggleComments = (postId: string) => {
		const newExpanded = new Set(expandedComments);
		if (newExpanded.has(postId)) {
			newExpanded.delete(postId);
		} else {
			newExpanded.add(postId);
		}
		setExpandedComments(newExpanded);
	};

	// Add a comment
	const handleAddComment = async (postId: string) => {
		const commentContent = newComments[postId];
		if (!commentContent?.trim() || !activeSubteamId) {
			return;
		}

		try {
			await addCommentMutation.mutateAsync({
				teamSlug: team.slug,
				postId,
				content: commentContent.trim(),
			});

			setNewComments((prev) => ({ ...prev, [postId]: "" }));
			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			globalApiCache.invalidate(`stream-${team.slug}-${activeSubteamId}`);
			toast.success("Comment added");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add comment",
			);
		}
	};

	// Delete a post
	const handleDeletePost = (postId: string) => {
		setDeletePostConfirm(postId);
	};

	const confirmDeletePost = async () => {
		if (!deletePostConfirm || !activeSubteamId) return;

		const postId = deletePostConfirm;
		setDeletePostConfirm(null);

		try {
			await deletePostMutation.mutateAsync({
				teamSlug: team.slug,
				postId,
			});

			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			globalApiCache.invalidate(`stream-${team.slug}-${activeSubteamId}`);
			toast.success("Post deleted successfully");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete post",
			);
		}
	};

	// Edit a post
	const handleEditPost = async (
		postId: string,
		content: string,
		attachmentUrl?: string,
		attachmentTitle?: string,
	) => {
		if (!activeSubteamId) return;

		try {
			await updatePostMutation.mutateAsync({
				teamSlug: team.slug,
				postId,
				content,
				attachmentUrl: attachmentUrl || null,
				attachmentTitle: attachmentTitle || null,
			});

			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			globalApiCache.invalidate(`stream-${team.slug}-${activeSubteamId}`);
			toast.success("Post updated successfully");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to update post",
			);
		}
	};

	// Delete a comment
	const handleDeleteComment = (commentId: string) => {
		setDeleteCommentConfirm(commentId);
	};

	const confirmDeleteComment = async () => {
		if (!deleteCommentConfirm || !activeSubteamId) return;

		const commentId = deleteCommentConfirm;
		setDeleteCommentConfirm(null);

		try {
			await deleteCommentMutation.mutateAsync({
				teamSlug: team.slug,
				commentId,
			});

			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			globalApiCache.invalidate(`stream-${team.slug}-${activeSubteamId}`);
			toast.success("Comment deleted successfully");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to delete comment",
			);
		}
	};

	// Load data when subteam changes
	useEffect(() => {
		if (activeSubteamId) {
			utils.teams.getStream.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			utils.teams.getTimers.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
			utils.teams.getTournaments.invalidate({
				teamSlug: team.slug,
				subteamId: activeSubteamId,
			});
		}
	}, [activeSubteamId, team.slug, utils]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (isDropdownOpen) {
				const target = event.target as Element;
				if (!target.closest(".dropdown-container")) {
					setIsDropdownOpen(false);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isDropdownOpen]);

	// Transform posts to match StreamPost interface
	const posts = useMemo(
		() =>
			rawPosts.map((post) => ({
				id: post.id,
				content: post.content,
				show_tournament_timer: post.show_tournament_timer || false,
				tournament_id: post.tournament_id || null,
				tournament_title: post.tournament_title || null,
				tournament_start_time: post.tournament_start_time || null,
				author_name: post.author_name || "Unknown",
				author_email: post.author_email || "",
				author_photo_url: post.author_photo_url || null,
				created_at: post.created_at || new Date().toISOString(),
				attachment_url: post.attachment_url,
				attachment_title: post.attachment_title,
				comments: (post.comments || []).map((c) => ({
					...c,
					post_id: post.id,
					author_photo_url: c.author_photo_url || null,
					created_at: c.created_at || new Date().toISOString(),
				})),
			})),
		[rawPosts],
	);

	// Transform tournaments to match Event interface
	const events = useMemo(
		() =>
			rawTournaments.map((tournament) => ({
				id: tournament.id,
				title: tournament.title,
				start_time: tournament.start_time,
				location: tournament.location,
				event_type: tournament.event_type as
					| "practice"
					| "tournament"
					| "meeting"
					| "deadline"
					| "personal"
					| "other",
				has_timer: tournament.has_timer,
			})),
		[rawTournaments],
	);

	// Transform timers to match Event interface
	const activeTimers = rawTimers.map((timer) => ({
		id: timer.id,
		title: timer.title,
		start_time: timer.start_time,
		location: timer.location,
		event_type: timer.event_type as
			| "practice"
			| "tournament"
			| "meeting"
			| "deadline"
			| "personal"
			| "other",
		has_timer: true,
	}));

	if (rawPosts.length === 0) {
		// Only show loading if we really have no data yet
		// trpc.isLoading would be better but let's keep it simple
	}

	return (
		<div className="p-4 md:p-6">
			<div className="max-w-4xl mx-auto">
				<h2
					className={`text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Team Stream
				</h2>

				{/* Active Event Timers */}
				<ActiveTimers
					darkMode={darkMode}
					activeTimers={activeTimers}
					onRemoveTimer={handleRemoveTimer}
				/>

				{/* Add Timers - Captain Only */}
				{isCaptain && (
					<TimerManager
						darkMode={darkMode}
						events={events}
						selectedEventTypes={selectedEventTypes}
						onAddTimer={handleAddTimer}
						isDropdownOpen={isDropdownOpen}
						onToggleDropdown={() => setIsDropdownOpen(!isDropdownOpen)}
						onEventTypeChange={handleEventTypeFilterChange}
					/>
				)}

				{/* Post Creation Form */}
				{isCaptain && (
					<PostCreator
						darkMode={darkMode}
						newPostContent={newPostContent}
						onContentChange={setNewPostContent}
						onSubmit={handleCreatePost}
						posting={posting}
					/>
				)}

				{/* Stream Posts */}
				<StreamPosts
					darkMode={darkMode}
					posts={posts}
					expandedComments={expandedComments}
					newComments={newComments}
					onToggleComments={toggleComments}
					onCommentChange={(postId, content) =>
						setNewComments((prev) => ({ ...prev, [postId]: content }))
					}
					onAddComment={handleAddComment}
					isCaptain={isCaptain}
					onDeletePost={handleDeletePost}
					onEditPost={handleEditPost}
					onDeleteComment={handleDeleteComment}
				/>
			</div>

			{/* Confirm modals */}
			<ConfirmModal
				isOpen={deletePostConfirm !== null}
				onClose={() => setDeletePostConfirm(null)}
				onConfirm={confirmDeletePost}
				title="Delete post?"
				message="Are you sure you want to delete this post? This action cannot be undone."
				confirmText="Delete"
				confirmVariant="danger"
			/>
			<ConfirmModal
				isOpen={deleteCommentConfirm !== null}
				onClose={() => setDeleteCommentConfirm(null)}
				onConfirm={confirmDeleteComment}
				title="Delete comment?"
				message="Are you sure you want to delete this comment? This action cannot be undone."
				confirmText="Delete"
				confirmVariant="danger"
			/>
		</div>
	);
}
