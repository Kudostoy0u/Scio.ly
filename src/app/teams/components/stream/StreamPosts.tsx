"use client";

import {
	Check,
	Edit,
	FileText,
	MessageCircle,
	Send,
	Trash2,
	User,
	X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { StreamPost } from "./streamTypes";

interface StreamPostsProps {
	darkMode: boolean;
	posts: StreamPost[];
	expandedComments: Set<string>;
	newComments: Record<string, string>;
	onToggleComments: (postId: string) => void;
	onCommentChange: (postId: string, content: string) => void;
	onAddComment: (postId: string) => void;
	isCaptain: boolean;
	onDeletePost: (postId: string) => void;
	onEditPost: (
		postId: string,
		content: string,
		attachmentUrl?: string,
		attachmentTitle?: string,
	) => void;
	onDeleteComment: (commentId: string) => void;
}

export default function StreamPosts({
	darkMode,
	posts,
	expandedComments: _expandedComments,
	newComments,
	onToggleComments: _onToggleComments,
	onCommentChange,
	onAddComment,
	isCaptain,
	onDeletePost,
	onEditPost,
	onDeleteComment,
}: StreamPostsProps) {
	const [editingPost, setEditingPost] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [editAttachmentUrl, setEditAttachmentUrl] = useState("");
	const [editAttachmentTitle, setEditAttachmentTitle] = useState("");

	const handleStartEdit = (post: StreamPost) => {
		setEditingPost(post.id);
		setEditContent(post.content);
		setEditAttachmentUrl(post.attachment_url || "");
		setEditAttachmentTitle(post.attachment_title || "");
	};

	const handleCancelEdit = () => {
		setEditingPost(null);
		setEditContent("");
		setEditAttachmentUrl("");
		setEditAttachmentTitle("");
	};

	const handleSaveEdit = () => {
		if (editingPost && editContent.trim()) {
			onEditPost(
				editingPost,
				editContent.trim(),
				editAttachmentUrl || undefined,
				editAttachmentTitle || undefined,
			);
			handleCancelEdit();
		}
	};

	if (posts.length === 0) {
		return (
			<div
				className={`text-center py-12 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
			>
				<p>No posts yet. Check back later for team updates.</p>
			</div>
		);
	}

	// Helper function to format date/time
	const formatDateTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const isToday =
			date.getDate() === now.getDate() &&
			date.getMonth() === now.getMonth() &&
			date.getFullYear() === now.getFullYear();

		if (isToday) {
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		}
		return date.toLocaleDateString([], {
			month: "short",
			day: "numeric",
			year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
		});
	};

	// Helper function to render profile picture for posts (40x40px)
	const renderProfilePicture = (photoUrl: string | null | undefined) => {
		if (photoUrl) {
			return (
				<Image
					src={photoUrl}
					alt="Profile"
					width={40}
					height={40}
					className="w-10 h-10 rounded-full object-cover"
					unoptimized={true}
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						target.style.display = "none";
						const fallback = target.nextElementSibling as HTMLElement;
						if (fallback) {
							fallback.style.display = "flex";
						}
					}}
				/>
			);
		}
		return null;
	};

	// Helper function to render profile picture for comments (32x32px - smaller than posts)
	const renderCommentProfilePicture = (photoUrl: string | null | undefined) => {
		if (photoUrl) {
			return (
				<Image
					src={photoUrl}
					alt="Profile"
					width={32}
					height={32}
					className="w-8 h-8 rounded-full object-cover"
					unoptimized={true}
					onError={(e) => {
						const target = e.target as HTMLImageElement;
						target.style.display = "none";
						const fallback = target.nextElementSibling as HTMLElement;
						if (fallback) {
							fallback.style.display = "flex";
						}
					}}
				/>
			);
		}
		return null;
	};

	// Helper function to render post content
	const renderPostContent = (post: StreamPost) => {
		if (editingPost === post.id) {
			return (
				<div className="space-y-3">
					<textarea
						value={editContent}
						onChange={(e) => setEditContent(e.target.value)}
						className={`w-full p-3 rounded-lg border resize-none ${
							darkMode
								? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
								: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
						}`}
						rows={3}
						placeholder="Edit post content..."
					/>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<input
							type="text"
							value={editAttachmentTitle}
							onChange={(e) => setEditAttachmentTitle(e.target.value)}
							placeholder="Attachment title"
							className={`p-2 rounded-lg border ${
								darkMode
									? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
									: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
							}`}
						/>
						<input
							type="url"
							value={editAttachmentUrl}
							onChange={(e) => setEditAttachmentUrl(e.target.value)}
							placeholder="Attachment URL"
							className={`p-2 rounded-lg border ${
								darkMode
									? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
									: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
							}`}
						/>
					</div>
					<div className="flex items-center space-x-2">
						<button
							type="button"
							onClick={handleSaveEdit}
							disabled={!editContent.trim()}
							className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
						>
							<Check className="w-4 h-4" />
							<span>Save</span>
						</button>
						<button
							type="button"
							onClick={handleCancelEdit}
							className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
						>
							<X className="w-4 h-4" />
							<span>Cancel</span>
						</button>
					</div>
				</div>
			);
		}

		return (
			<div
				className={`prose max-w-none text-base ${darkMode ? "prose-invert" : ""}`}
			>
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={{
						p: ({ children }) => (
							<p
								className={`text-base mb-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}
							>
								{children}
							</p>
						),
						a: ({ href, children }) => (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								className={`underline ${darkMode ? "text-blue-400" : "text-blue-600"}`}
							>
								{children}
							</a>
						),
						code: (props) => {
							const { className, children, ...rest } = props;
							const isInline = !className?.includes("language-");
							return isInline ? (
								<code
									className={`px-1.5 py-0.5 rounded ${
										darkMode
											? "bg-gray-700 text-gray-100"
											: "bg-gray-100 text-gray-800"
									}`}
									{...rest}
								>
									{children}
								</code>
							) : (
								<code
									className={`block p-2 rounded ${className || ""} ${
										darkMode
											? "bg-gray-700 text-gray-100"
											: "bg-gray-100 text-gray-800"
									}`}
									{...rest}
								>
									{children}
								</code>
							);
						},
					}}
				>
					{post.content}
				</ReactMarkdown>
			</div>
		);
	};

	// Helper function to render post header
	const renderPostHeader = (post: StreamPost) => {
		return (
			<div className="flex items-start space-x-3 mb-3">
				{/* Profile Picture */}
				<div className="flex-shrink-0">
					{renderProfilePicture(post.author_photo_url)}
					<div
						className={`w-10 h-10 rounded-full flex items-center justify-center ${
							darkMode ? "bg-gray-700" : "bg-gray-200"
						}`}
						style={{
							display: post.author_photo_url ? "none" : "flex",
						}}
					>
						<User
							className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
						/>
					</div>
				</div>
				{/* Name and Date */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between">
						<div className="flex-1 min-w-0">
							<div className="flex items-center space-x-2">
								<span
									className={`font-medium text-base ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									{post.author_name}
								</span>
								{/* Captain Controls */}
								{isCaptain && !editingPost && (
									<div className="flex items-center space-x-1">
										<button
											type="button"
											onClick={() => handleStartEdit(post)}
											className={`p-1 rounded hover:bg-gray-600 transition-colors ${
												darkMode
													? "text-gray-400 hover:text-white"
													: "text-gray-500 hover:text-gray-700"
											}`}
											title="Edit post"
										>
											<Edit className="w-4 h-4" />
										</button>
										<button
											type="button"
											onClick={() => onDeletePost(post.id)}
											className={`p-1 rounded hover:bg-red-600 transition-colors ${
												darkMode
													? "text-gray-400 hover:text-white"
													: "text-gray-500 hover:text-white"
											}`}
											title="Delete post"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								)}
							</div>
							<div
								className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
							>
								{formatDateTime(post.created_at)}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="space-y-6">
			{posts.map((post) => (
				<div
					key={post.id}
					className={`p-6 rounded-lg border ${
						darkMode
							? "bg-gray-800 border-gray-700"
							: "bg-gray-50 border-gray-200"
					}`}
				>
					{/* Post Header with Profile Picture */}
					{renderPostHeader(post)}

					{/* Post Content */}
					<div className="mb-4">{renderPostContent(post)}</div>

					{/* Attachment */}
					{post.attachment_url && !editingPost && (
						<div className="mb-4">
							<a
								href={post.attachment_url}
								target="_blank"
								rel="noopener noreferrer"
								className={`inline-flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
									darkMode
										? "bg-gray-700 border-gray-600 hover:bg-gray-600"
										: "bg-white border-gray-300 hover:bg-gray-100"
								}`}
							>
								<FileText className="w-4 h-4 text-blue-500" />
								<span
									className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									{post.attachment_title || "Attachment"}
								</span>
							</a>
						</div>
					)}

					{/* Comments Section - Always Visible */}
					<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center space-x-2 text-sm text-blue-500">
								<MessageCircle className="w-4 h-4" />
								<span>
									{post.comments?.length || 0} comment
									{(post.comments?.length || 0) !== 1 ? "s" : ""}
								</span>
							</div>
						</div>

						{/* Comments List - Always Visible with Scrollbar */}
						{post.comments && post.comments.length > 0 && (
							<div
								className={`space-y-3 mb-3 max-h-96 overflow-y-auto ${
									darkMode ? "scrollbar-thin scrollbar-thumb-gray-600" : ""
								}`}
								style={{
									scrollbarWidth: "thin",
									scrollbarColor: darkMode
										? "#4B5563 transparent"
										: "#9CA3AF transparent",
								}}
							>
								{post.comments.map((comment) => (
									<div
										key={comment.id}
										className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-white"}`}
									>
										<div className="flex items-start space-x-2 mb-2">
											{/* Comment Author Profile Picture */}
											<div className="flex-shrink-0">
												{renderCommentProfilePicture(comment.author_photo_url)}
												<div
													className={`w-8 h-8 rounded-full flex items-center justify-center ${
														darkMode ? "bg-gray-600" : "bg-gray-200"
													}`}
													style={{
														display: comment.author_photo_url ? "none" : "flex",
													}}
												>
													<User
														className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
													/>
												</div>
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center justify-between mb-1">
													<div className="flex items-center space-x-2">
														<span
															className={`text-sm font-medium ${
																darkMode ? "text-gray-300" : "text-gray-700"
															}`}
														>
															{comment.author_name}
														</span>
														<span
															className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
														>
															{formatDateTime(comment.created_at)}
														</span>
													</div>
													{/* Captain Controls for Comments */}
													{isCaptain && (
														<button
															type="button"
															onClick={() => onDeleteComment(comment.id)}
															className={`p-1 rounded hover:bg-red-600 transition-colors ${
																darkMode
																	? "text-gray-400 hover:text-white"
																	: "text-gray-500 hover:text-white"
															}`}
															title="Delete comment"
														>
															<Trash2 className="w-3 h-3" />
														</button>
													)}
												</div>
												<p
													className={`text-sm ${darkMode ? "text-gray-200" : "text-gray-800"}`}
												>
													{comment.content}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						{/* Add Comment Form - Always Visible */}
						<div className="flex space-x-2">
							<input
								type="text"
								value={newComments[post.id] || ""}
								onChange={(e) => onCommentChange(post.id, e.target.value)}
								placeholder="Add a comment..."
								className={`flex-1 p-2 rounded-lg border text-sm ${
									darkMode
										? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
										: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
								}`}
								onKeyPress={(e) => {
									if (e.key === "Enter") {
										onAddComment(post.id);
									}
								}}
							/>
							<button
								type="button"
								onClick={() => onAddComment(post.id)}
								disabled={!newComments[post.id]?.trim()}
								className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
							>
								<Send className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
