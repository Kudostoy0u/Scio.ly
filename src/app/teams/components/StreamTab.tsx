"use client";

import ConfirmModal from "@/app/components/ConfirmModal";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { useTeamStore } from "@/app/hooks/useTeamStore";
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
	const {
		getStream,
		getTournaments,
		getTimers,
		loadStreamData,
		loadTimers,
		invalidateCache,
	} = useTeamStore();
	const [posting, setPosting] = useState(false);

	// Post creation state
	const [newPostContent, setNewPostContent] = useState("");

	// Event type filter state
	const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([
		"tournament",
	]);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// Comments state
	const [expandedComments, setExpandedComments] = useState<Set<string>>(
		new Set(),
	);
	const [newComments, setNewComments] = useState<Record<string, string>>({});
	const [deletePostConfirm, setDeletePostConfirm] = useState<string | null>(null);
	const [deleteCommentConfirm, setDeleteCommentConfirm] = useState<string | null>(null);

	// Load stream data using combined endpoint
	const loadData = useCallback(async () => {
		if (!activeSubteamId) {
			return;
		}

		try {
			await loadStreamData(team.slug, activeSubteamId);
		} catch (_error) {
			toast.error("Failed to load stream data");
		}
	}, [team.slug, activeSubteamId, loadStreamData]);

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
			const response = await fetch(`/api/teams/${team.slug}/stream`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subteamId: activeSubteamId,
					content: newPostContent.trim(),
					showTournamentTimer: false,
					tournamentId: null,
					attachmentUrl: attachmentData?.url || null,
					attachmentTitle: attachmentData?.title || null,
				}),
			});

			if (response.ok) {
				setNewPostContent("");
				// Clear the stream cache to force a fresh fetch
				invalidateCache();
				await loadData(); // Reload posts
				toast.success("Post created successfully");
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to create post");
			}
		} catch (_error) {
			toast.error("Failed to create post");
		}
		setPosting(false);
	};

	// Add an event timer
	const handleAddTimer = async (event: Event) => {
		if (activeTimers.some((t) => t.id === event.id)) {
			return; // Already added
		}

		try {
			const response = await fetch(`/api/teams/${team.slug}/timers`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subteamId: activeSubteamId,
					eventId: event.id,
				}),
			});

			if (response.ok) {
				// Immediately reload timers and stream data for instant UI update
				if (activeSubteamId) {
					await Promise.all([
						loadTimers(team.slug, activeSubteamId),
						loadStreamData(team.slug, activeSubteamId),
					]);
				}
				toast.success(`Added timer for ${event.title}`);
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to add timer");
			}
		} catch (_error) {
			toast.error("Failed to add timer");
		}
	};

	// Remove an event timer
	const handleRemoveTimer = async (eventId: string) => {
		try {
			const response = await fetch(`/api/teams/${team.slug}/timers`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subteamId: activeSubteamId,
					eventId: eventId,
				}),
			});

			if (response.ok) {
				// Immediately reload timers and stream data for instant UI update
				if (activeSubteamId) {
					await Promise.all([
						loadTimers(team.slug, activeSubteamId),
						loadStreamData(team.slug, activeSubteamId),
					]);
				}
				toast.success("Timer removed");
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to remove timer");
			}
		} catch (_error) {
			toast.error("Failed to remove timer");
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
		if (!commentContent?.trim()) {
			return;
		}

		try {
			const response = await fetch(`/api/teams/${team.slug}/stream/comments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					postId,
					content: commentContent.trim(),
				}),
			});

			if (response.ok) {
				setNewComments((prev) => ({ ...prev, [postId]: "" }));
				// Clear the stream cache to force a fresh fetch
				invalidateCache();
				await loadData(); // Reload posts to get updated comments
				toast.success("Comment added");
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to add comment");
			}
		} catch (_error) {
			toast.error("Failed to add comment");
		}
	};

	// Delete a post
	const handleDeletePost = (postId: string) => {
		setDeletePostConfirm(postId);
	};

	const confirmDeletePost = async () => {
		if (!deletePostConfirm) return;

		const postId = deletePostConfirm;
		setDeletePostConfirm(null);

		try {
			const response = await fetch(
				`/api/teams/${team.slug}/stream?postId=${postId}`,
				{
					method: "DELETE",
				},
			);

			if (response.ok) {
				// Clear the stream cache to force a fresh fetch
				invalidateCache();
				await loadData(); // Reload posts
				toast.success("Post deleted successfully");
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to delete post");
			}
		} catch (_error) {
			toast.error("Failed to delete post");
		}
	};

	// Edit a post
	const handleEditPost = async (
		postId: string,
		content: string,
		attachmentUrl?: string,
		attachmentTitle?: string,
	) => {
		try {
			const response = await fetch(`/api/teams/${team.slug}/stream`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					postId,
					content,
					attachmentUrl,
					attachmentTitle,
				}),
			});

			if (response.ok) {
				// Clear the stream cache to force a fresh fetch
				invalidateCache();
				await loadData(); // Reload posts
				toast.success("Post updated successfully");
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to update post");
			}
		} catch (_error) {
			toast.error("Failed to update post");
		}
	};

	// Delete a comment
	const handleDeleteComment = (commentId: string) => {
		setDeleteCommentConfirm(commentId);
	};

	const confirmDeleteComment = async () => {
		if (!deleteCommentConfirm) return;

		const commentId = deleteCommentConfirm;
		setDeleteCommentConfirm(null);

		try {
			const response = await fetch(
				`/api/teams/${team.slug}/stream/comments?commentId=${commentId}`,
				{
					method: "DELETE",
				},
			);

			if (response.ok) {
				// Clear the stream cache to force a fresh fetch
				invalidateCache();
				await loadData(); // Reload posts to get updated comments
				toast.success("Comment deleted successfully");
			} else {
				const error = await response.json();
				toast.error(error.error || "Failed to delete comment");
			}
		} catch (_error) {
			toast.error("Failed to delete comment");
		}
	};

	// Load data when subteam changes
	useEffect(() => {
		if (activeSubteamId) {
			loadData();
		}
	}, [loadData, activeSubteamId]);

	// Timer updates are now handled by background refresh in the enhanced hook

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

	// Get data from store and transform to expected types
	const rawPosts = activeSubteamId ? getStream(team.slug, activeSubteamId) : [];
	const rawTournaments = activeSubteamId
		? getTournaments(team.slug, activeSubteamId)
		: [];
	const rawTimers = activeSubteamId
		? getTimers(team.slug, activeSubteamId)
		: [];

	// Transform posts to match StreamPost interface
	const posts = rawPosts.map((post) => ({
		id: post.id,
		content: post.content,
		show_tournament_timer: post.show_tournament_timer,
		tournament_id: post.tournament_id,
		tournament_title: post.tournament_title,
		tournament_start_time: post.tournament_start_time,
		author_name: post.author_name || post.author || "Unknown",
		author_email: post.author_email || "",
		created_at: post.created_at,
		attachment_url: post.attachment_url,
		attachment_title: post.attachment_title,
		comments: post.comments || [],
	}));

	// Transform tournaments to match Event interface
	const events = rawTournaments.map((tournament) => ({
		id: tournament.id,
		title: tournament.title, // Use title instead of name
		start_time: tournament.start_time, // Use start_time instead of date
		location: tournament.location,
		event_type: tournament.event_type as
			| "practice"
			| "tournament"
			| "meeting"
			| "deadline"
			| "personal"
			| "other", // Cast to proper type
		has_timer: tournament.has_timer,
	}));

	// Transform timers to match Event interface
	const activeTimers = rawTimers.map((timer) => ({
		id: timer.id,
		title: timer.title, // Use title instead of event_title
		start_time: timer.start_time,
		location: timer.location, // Use actual location instead of null
		event_type: timer.event_type as
			| "practice"
			| "tournament"
			| "meeting"
			| "deadline"
			| "personal"
			| "other", // Cast to proper type
		has_timer: true,
	}));

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
