"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logging/logger";

import Header from "@/app/components/Header";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { db } from "@/app/utils/db";
import type { Database } from "@/lib/types/database";
import { generateDisplayName } from "@/lib/utils/content/displayNameUtils";
import type { User } from "@supabase/supabase-js";
import { AlertTriangle, Save, Trash2, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function ProfilePage() {
	const { darkMode } = useTheme();
	const router = useRouter();
	const { user: ctxUser, client } = useAuth();
	const [user, setUser] = useState<User | null>(null);
	const [displayName, setDisplayName] = useState("");
	const [username, setUsername] = useState("");
	const [photoUrl, setPhotoUrl] = useState<string | null>(null);
	const [uploadingPhoto, setUploadingPhoto] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [authInitialized, setAuthInitialized] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState("");
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		const supabase = client;
		const currentUser = ctxUser || null;
		setUser(currentUser);
		(async () => {
			if (currentUser) {
				const { data } = await supabase
					.from("users")
					.select("display_name, username, photo_url")
					.eq("id", currentUser.id)
					.maybeSingle();
				const profileData = data as {
					display_name?: string | null;
					username?: string | null;
					photo_url?: string | null;
				} | null;
				const { name: robustName } = generateDisplayName(
					{
						displayName: profileData?.display_name || null,
						firstName: null,
						lastName: null,
						username: profileData?.username || null,
						email: currentUser.email || null,
					},
					currentUser.id,
				);
				setDisplayName(robustName || "");
				setUsername(
					profileData?.username || currentUser.email?.split("@")[0] || "",
				);
				setPhotoUrl(
					profileData?.photo_url ||
						currentUser.user_metadata?.avatar_url ||
						currentUser.user_metadata?.picture ||
						null,
				);
			} else {
				router.push("/");
			}
			setAuthInitialized(true);
			setLoading(false);
		})();
	}, [router, ctxUser, client]);

	const handleSave = async () => {
		if (!user) {
			return;
		}

		if (displayName && displayName.length > 50) {
			toast.error("Display name must be 50 characters or less");
			return;
		}

		setSaving(true);

		try {
			const userData: Database["public"]["Tables"]["users"]["Insert"] = {
				id: user.id,
				email: user.email || "",
				username: username || user.email?.split("@")[0] || "user",
				display_name: displayName || null,
				photo_url: photoUrl || null,
				created_at: new Date().toISOString(),
			};

			const { error } = (await client
				.from("users")
				.upsert([userData] as unknown as never[])) as {
				error: { code?: string; message?: string } | null;
			};

			if (error) {
				if (error.code === "23505") {
					toast.error("That username is already taken.");
				} else {
					logger.error("Error updating profile:", error);
					toast.error("Failed to update profile. Please try again.");
				}
			} else {
				toast.success("Profile updated successfully!");
				try {
					await fetch("/api/profile/sync", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							id: user.id,
							email: user.email || "",
							displayName: displayName || undefined,
							username: username || undefined,
						}),
					});
				} catch {
					// Ignore update errors
				}
				try {
					if (user?.id) {
						if (displayName) {
							SyncLocalStorage.setItem(
								`scio_display_name_${user.id}`,
								displayName,
							);
						} else {
							SyncLocalStorage.removeItem(`scio_display_name_${user.id}`);
						}
						if (username) {
							SyncLocalStorage.setItem(`scio_username_${user.id}`, username);
						}
					}
				} catch {
					// Ignore localStorage errors
				}
			}
		} catch (error) {
			logger.error("Error updating profile:", error);
			toast.error("An unexpected error occurred. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handlePhotoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!(file && user)) {
			return;
		}
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			// 5mb limit
			toast.error("Image must be 5MB or less");
			return;
		}

		setUploadingPhoto(true);
		try {
			const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
			const path = `users/${user.id}.${fileExt}`;

			const { error: uploadError } = await client.storage
				.from("avatars")
				.upload(path, file, {
					cacheControl: "3600",
					upsert: true,
				});
			if (uploadError) {
				logger.error("Upload error:", uploadError);
				toast.error(
					"Failed to upload image. Ensure the avatars bucket exists and is public.",
				);
				return;
			}
			const { data: publicUrlData } = client.storage
				.from("avatars")
				.getPublicUrl(path);
			const publicUrl = publicUrlData.publicUrl;
			setPhotoUrl(publicUrl);

			await (
				client.from("users") as unknown as {
					update: (values: { photo_url: string }) => {
						eq: (column: string, value: string) => Promise<unknown>;
					};
				}
			)
				.update({ photo_url: publicUrl })
				.eq("id", user.id);
			toast.success("Profile picture updated!");
		} catch (err) {
			logger.error("Photo upload failed:", err);
			toast.error("Photo upload failed.");
		} finally {
			setUploadingPhoto(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (deleteConfirmText !== "DELETE") {
			toast.error('Please type "DELETE" to confirm');
			return;
		}

		setDeleting(true);
		try {
			const response = await fetch("/api/account/delete", {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to delete account");
			}

			// Sign out and redirect
			await db.teamRosterPrefs.clear().catch(() => undefined);
			await client.auth.signOut();
			toast.success("Account deleted successfully");
			router.push("/");
		} catch (error) {
			logger.error("Failed to delete account:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to delete account",
			);
		} finally {
			setDeleting(false);
			setShowDeleteConfirm(false);
			setDeleteConfirmText("");
		}
	};

	if (loading || !authInitialized) {
		return (
			<div
				className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
			>
				<Header />
				<div className="pt-20 flex items-center justify-center min-h-[calc(100vh-5rem)]">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
				</div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
			<Header />
			{/* Global ToastContainer handles notifications */}

			<div className="pt-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-2xl mx-auto">
					{/* Header */}
					<div className="mb-8">
						<h1
							className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							Profile Settings
						</h1>
						<p
							className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Manage your account settings and preferences
						</p>
					</div>

					{/* Profile Form */}
					<div
						className={`rounded-lg p-6 ${
							darkMode
								? "bg-gray-800 border border-gray-700"
								: "bg-white border border-gray-200"
						}`}
					>
						{/* Profile Picture */}
						<div className="flex items-center mb-6">
							{photoUrl ? (
								<Image
									src={photoUrl}
									alt="Profile"
									width={64}
									height={64}
									className="w-16 h-16 rounded-full object-cover"
									unoptimized
								/>
							) : (
								<div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center">
									<UserIcon className="w-8 h-8 text-white" />
								</div>
							)}
							<div className="ml-4">
								<h3
									className={`text-lg font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
								>
									Profile Picture
								</h3>
								<p
									className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
								>
									{photoUrl
										? "Custom profile picture"
										: "No profile picture available"}
								</p>
								<div className="mt-2">
									<label
										className={`inline-flex items-center px-3 py-1.5 rounded-md cursor-pointer ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}`}
									>
										<input
											type="file"
											accept="image/*"
											className="hidden"
											onChange={handlePhotoFileChange}
										/>
										{uploadingPhoto ? "Uploading…" : "Change Photo"}
									</label>
								</div>
							</div>
						</div>

						{/* Email (Read-only) */}
						<div className="mb-6">
							<label
								htmlFor="email-address"
								className={`block text-sm font-medium mb-2 ${
									darkMode ? "text-gray-300" : "text-gray-700"
								}`}
							>
								Email Address
							</label>
							<input
								id="email-address"
								type="email"
								value={user.email || ""}
								disabled={true}
								className={`w-full px-3 py-2 rounded-lg border ${
									darkMode
										? "bg-gray-700 border-gray-600 text-gray-400"
										: "bg-gray-100 border-gray-300 text-gray-500"
								} cursor-not-allowed`}
							/>
							<p
								className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
							>
								Email address cannot be changed
							</p>
						</div>

						{/* Display Name */}
						<div className="mb-6">
							<label
								htmlFor="display-name"
								className={`block text-sm font-medium mb-2 ${
									darkMode ? "text-gray-300" : "text-gray-700"
								}`}
							>
								Display Name
							</label>
							<input
								id="display-name"
								type="text"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder="Enter your display name"
								maxLength={50}
								className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
									darkMode
										? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
										: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
								}`}
							/>
							<p
								className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
							>
								This is how your name will appear to other users (
								{displayName.length}/50)
							</p>
						</div>

						{/* Username */}
						<div className="mb-6">
							<label
								htmlFor="username"
								className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
							>
								Username
							</label>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
									darkMode
										? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
										: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
								}`}
							/>
							<p
								className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
							>
								Must be unique. Defaults to your email before the @ if left
								blank.
							</p>
						</div>

						{/* Save Button */}
						<div className="flex justify-end">
							<button
								type="button"
								onClick={handleSave}
								disabled={saving}
								className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
							>
								{saving ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
										Saving...
									</>
								) : (
									<>
										<Save className="w-4 h-4" />
										Save Changes
									</>
								)}
							</button>
						</div>
					</div>

					{/* Account Information */}
					<div
						className={`mt-6 rounded-lg p-6 ${
							darkMode
								? "bg-gray-800 border border-gray-700"
								: "bg-white border border-gray-200"
						}`}
					>
						<h3
							className={`text-lg font-medium mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							Account Information
						</h3>

						<div className="space-y-3">
							<div className="flex justify-between">
								<span
									className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
								>
									Account Created
								</span>
								<span
									className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									{new Date(user.created_at).toLocaleDateString()}
								</span>
							</div>

							<div className="flex justify-between">
								<span
									className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
								>
									Last Sign In
								</span>
								<span
									className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									{user.last_sign_in_at
										? new Date(user.last_sign_in_at).toLocaleDateString()
										: "N/A"}
								</span>
							</div>

							<div className="flex justify-between">
								<span
									className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
								>
									Email Confirmed
								</span>
								<span
									className={`text-sm ${
										user.email_confirmed_at
											? "text-green-600"
											: darkMode
												? "text-red-400"
												: "text-red-600"
									}`}
								>
									{user.email_confirmed_at ? "Yes" : "No"}
								</span>
							</div>
						</div>
					</div>

					{/* Danger Zone */}
					<div
						className={`mt-6 rounded-lg p-6 border-2 ${
							darkMode
								? "bg-gray-800 border-red-900"
								: "bg-white border-red-200"
						}`}
					>
						<div className="flex items-center gap-2 mb-4">
							<AlertTriangle
								className={`w-5 h-5 ${darkMode ? "text-red-400" : "text-red-600"}`}
							/>
							<h3
								className={`text-lg font-medium ${darkMode ? "text-red-400" : "text-red-600"}`}
							>
								Danger Zone
							</h3>
						</div>

						<p
							className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							Permanently delete your account and all associated data. This
							action cannot be undone.
						</p>

						<button
							type="button"
							onClick={() => setShowDeleteConfirm(true)}
							className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
						>
							<Trash2 className="w-4 h-4" />
							Delete Account
						</button>
					</div>
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
					onMouseDown={() => setShowDeleteConfirm(false)}
				>
					<div
						className={`w-full max-w-md rounded-lg p-6 ${
							darkMode ? "bg-gray-800" : "bg-white"
						}`}
						onMouseDown={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3 mb-4">
							<div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
								<AlertTriangle className="w-5 h-5 text-red-600" />
							</div>
							<h3
								className={`text-lg font-semibold ${
									darkMode ? "text-white" : "text-gray-900"
								}`}
							>
								Delete Account
							</h3>
						</div>

						<p
							className={`mb-4 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
						>
							This will permanently delete your account and all associated data,
							including:
						</p>

						<ul
							className={`list-disc list-inside mb-4 text-sm ${
								darkMode ? "text-gray-400" : "text-gray-600"
							}`}
						>
							<li>Your profile and settings</li>
							<li>Team memberships and roster entries</li>
							<li>Assignment submissions</li>
							<li>All other personal data</li>
						</ul>

						<p
							className={`mb-4 font-medium ${
								darkMode ? "text-red-400" : "text-red-600"
							}`}
						>
							This action cannot be undone.
						</p>

						<div className="mb-4">
							<label
								htmlFor="delete-confirm"
								className={`block text-sm font-medium mb-2 ${
									darkMode ? "text-gray-300" : "text-gray-700"
								}`}
							>
								Type <span className="font-bold">DELETE</span> to confirm
							</label>
							<input
								id="delete-confirm"
								type="text"
								value={deleteConfirmText}
								onChange={(e) => setDeleteConfirmText(e.target.value)}
								placeholder="DELETE"
								className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
									darkMode
										? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
										: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
								}`}
							/>
						</div>

						<div className="flex gap-3 justify-end">
							<button
								type="button"
								onClick={() => {
									setShowDeleteConfirm(false);
									setDeleteConfirmText("");
								}}
								className={`px-4 py-2 rounded-lg font-medium transition-colors ${
									darkMode
										? "bg-gray-700 hover:bg-gray-600 text-gray-200"
										: "bg-gray-100 hover:bg-gray-200 text-gray-800"
								}`}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDeleteAccount}
								disabled={deleting || deleteConfirmText !== "DELETE"}
								className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
							>
								{deleting ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="w-4 h-4" />
										Delete Account
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="pb-8" />
		</div>
	);
}
