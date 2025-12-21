"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { supabase } from "@/lib/supabase";
import { Edit3, Mail, User, X } from "lucide-react";
import { useEffect, useState } from "react";

// Top-level regex patterns for performance
const HEX_8_CHAR_REGEX = /^[a-f0-9]{8}$/;

// Helper function to derive display name (extracted to reduce complexity)
const deriveDisplayName = (
	currentName: string,
	meta: Record<string, unknown>,
	emailLocal: string,
): string => {
	if (
		currentName &&
		currentName !== "@unknown" &&
		!currentName.startsWith("User ")
	) {
		return currentName;
	}
	const metaFull = (meta.name || meta.full_name || meta.fullName || "")
		.toString()
		.trim();
	if (metaFull) {
		return metaFull;
	}
	if (
		emailLocal &&
		emailLocal.length > 2 &&
		!HEX_8_CHAR_REGEX.test(emailLocal)
	) {
		return emailLocal;
	}
	return "";
};

// Helper function to validate inputs (extracted to reduce complexity)
const validateInputs = (
	displayName: string,
	username: string,
): string | null => {
	if (!displayName.trim()) {
		return "Please provide a display name";
	}
	if (username && username.length < 3) {
		return "Username must be at least 3 characters long";
	}
	return null;
};

// Helper function to update localStorage (extracted to reduce complexity)
const updateLocalStorage = (
	userId: string,
	displayName: string,
	username: string,
) => {
	try {
		if (displayName.trim()) {
			SyncLocalStorage.setItem(
				`scio_display_name_${userId}`,
				displayName.trim(),
			);
			SyncLocalStorage.setItem("scio_display_name", displayName.trim());
			window.dispatchEvent(
				new CustomEvent("scio-display-name-updated", {
					detail: displayName.trim(),
				}),
			);
		}
		if (username.trim()) {
			SyncLocalStorage.setItem(`scio_username_${userId}`, username.trim());
		}
	} catch {
		// Ignore localStorage errors
	}
};

// Helper function to sync profile to API (extracted to reduce complexity)
const syncProfileToAPI = async (
	userId: string,
	email: string,
	displayName: string,
	username: string,
) => {
	try {
		await fetch("/api/profile/sync", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: userId,
				email: email,
				displayName: displayName.trim(),
				username: username.trim() || undefined,
			}),
		});
	} catch {
		// Ignore errors when updating user metadata
	}
};

// Helper function to build update payload (extracted to reduce complexity)
const buildUpdatePayload = (
	userId: string,
	email: string,
	displayName: string,
	username: string,
): {
	id: string;
	email: string;
	display_name?: string;
	username?: string;
} => {
	const updateData: {
		id: string;
		email: string;
		display_name?: string;
		username?: string;
	} = {
		id: userId,
		email: email,
	};

	if (displayName.trim()) {
		updateData.display_name = displayName.trim();
	}
	if (username.trim()) {
		updateData.username = username.trim();
	}

	return updateData;
};

// Helper function to handle update error (extracted to reduce complexity)
const handleUpdateError = (error: { code?: string }): string => {
	if (error.code === "23505") {
		return "That username is already taken. Please choose a different one.";
	}
	return "Failed to update profile. Please try again.";
};

interface NamePromptModalProps {
	isOpen: boolean;
	onClose: () => void;
	currentName?: string;
	currentEmail?: string;
	onSave?: () => void;
}

export default function NamePromptModal({
	isOpen,
	onClose,
	currentName = "@unknown",
	currentEmail = "",
	onSave,
}: NamePromptModalProps) {
	const { user } = useAuth();
	const { darkMode } = useTheme();
	const [displayName, setDisplayName] = useState("");
	const [username, setUsername] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (!(isOpen && user)) {
			return;
		}

		// Prefill username from localStorage if available
		try {
			const cachedUsername = SyncLocalStorage.getItem(
				`scio_username_${user.id}`,
			);
			if (cachedUsername?.trim()) {
				setUsername((prev) => prev || cachedUsername.trim());
			}
		} catch {
			// Ignore errors when loading cached username
		}

		// Build a robust preferred display name (align with profile page fallbacks)
		const meta: Record<string, unknown> = user.user_metadata || {};
		const emailLocal = currentEmail?.includes("@")
			? currentEmail.split("@")[0]
			: "";
		const derived = deriveDisplayName(currentName, meta, emailLocal || "");

		if (derived) {
			setDisplayName((prev) => prev || derived);
		}

		// If username still empty, use email local-part as a sensible starting point
		if (
			!username &&
			emailLocal &&
			emailLocal.length > 2 &&
			!HEX_8_CHAR_REGEX.test(emailLocal)
		) {
			setUsername(emailLocal);
		}
	}, [isOpen, user, currentEmail, currentName, username]);

	const handleSave = async () => {
		if (!user) {
			return;
		}

		setSaving(true);
		setError("");

		try {
			// Validate inputs
			const validationError = validateInputs(displayName, username);
			if (validationError) {
				setError(validationError);
				setSaving(false);
				return;
			}

			// Build update payload
			const updateData = buildUpdatePayload(
				user.id,
				user.email || currentEmail || "",
				displayName,
				username,
			);

			const { error: updateError } = await (
				supabase.from("users") as unknown as {
					upsert: (
						values: Record<string, unknown>,
						options?: { onConflict?: string },
					) => Promise<{ error: unknown }>;
				}
			).upsert(updateData, { onConflict: "id" });

			if (updateError) {
				setError(handleUpdateError(updateError));
				setSaving(false);
				return;
			}

			setSuccess(true);

			// Update localStorage
			updateLocalStorage(user.id, displayName, username);

			// Also sync to CockroachDB so team views reflect the new name
			await syncProfileToAPI(
				user.id,
				user.email || currentEmail,
				displayName,
				username,
			);

			if (onSave) {
				onSave();
			}

			// Close modal after a brief success message
			setTimeout(() => {
				onClose();
			}, 1500);
		} catch {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	// Helper function to render success message
	const renderSuccessMessage = () => (
		<div className="text-center py-8">
			<div
				className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
					darkMode ? "bg-green-900" : "bg-green-100"
				}`}
			>
				<User
					className={`w-8 h-8 ${darkMode ? "text-green-300" : "text-green-600"}`}
				/>
			</div>
			<h3
				className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				Profile Updated!
			</h3>
			<p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
				Your name will now appear properly in teams.
			</p>
		</div>
	);

	// Helper function to render warning banner
	const renderWarningBanner = () => (
		<div
			className={`p-4 rounded-lg ${
				darkMode
					? "bg-yellow-900 bg-opacity-30 border border-yellow-700"
					: "bg-yellow-50 border border-yellow-200"
			}`}
		>
			<div className="flex items-start space-x-3">
				<User
					className={`w-5 h-5 mt-0.5 ${darkMode ? "text-yellow-300" : "text-yellow-600"}`}
				/>
				<div>
					<p
						className={`text-sm font-medium ${darkMode ? "text-yellow-200" : "text-yellow-800"}`}
					>
						Current name: {currentName}
					</p>
					<p
						className={`text-xs mt-1 ${darkMode ? "text-yellow-300" : "text-yellow-700"}`}
					>
						Let&apos;s give you a proper name that others can recognize!
					</p>
				</div>
			</div>
		</div>
	);

	// Helper function to render error message
	const renderErrorMessage = () => {
		if (!error) {
			return null;
		}
		return (
			<div
				className={`p-3 rounded-lg text-sm ${
					darkMode
						? "bg-red-900 bg-opacity-30 text-red-200"
						: "bg-red-50 text-red-800"
				}`}
			>
				{error}
			</div>
		);
	};

	// Helper function to render display name input
	const renderDisplayNameInput = () => (
		<div>
			<label
				htmlFor="display-name"
				className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
			>
				Display Name *
			</label>
			<input
				id="display-name"
				type="text"
				value={displayName}
				onChange={(e) => setDisplayName(e.target.value)}
				placeholder="How you'd like to be called"
				className={`w-full px-3 py-2 rounded-lg border ${
					darkMode
						? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
						: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
				} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
			/>
		</div>
	);

	// Helper function to render username input
	const renderUsernameInput = () => (
		<div>
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
				placeholder="Unique username (optional)"
				className={`w-full px-3 py-2 rounded-lg border ${
					darkMode
						? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
						: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
				} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
			/>
		</div>
	);

	// Helper function to render form content
	const renderFormContent = () => (
		<>
			{renderWarningBanner()}
			{renderErrorMessage()}
			<div className="space-y-4">
				{renderDisplayNameInput()}
				{renderUsernameInput()}
				{currentEmail && (
					<div
						className={`flex items-center space-x-2 text-sm ${
							darkMode ? "text-gray-400" : "text-gray-600"
						}`}
					>
						<Mail className="w-4 h-4" />
						<span>{currentEmail}</span>
					</div>
				)}
			</div>
		</>
	);

	// Helper function to render footer
	const renderFooter = () => (
		<div
			className={`flex items-center justify-end space-x-3 p-6 border-t ${
				darkMode ? "border-gray-700" : "border-gray-200"
			}`}
		>
			<button
				type="button"
				onClick={onClose}
				className={`px-4 py-2 rounded-lg text-sm font-medium ${
					darkMode
						? "text-gray-400 hover:text-gray-300"
						: "text-gray-600 hover:text-gray-800"
				}`}
			>
				Skip for now
			</button>
			<button
				type="button"
				onClick={handleSave}
				disabled={saving || !displayName.trim()}
				className={`px-4 py-2 rounded-lg text-sm font-medium ${
					saving || !displayName.trim()
						? "bg-gray-400 text-gray-200 cursor-not-allowed"
						: "bg-blue-600 hover:bg-blue-700 text-white"
				}`}
			>
				{saving ? "Saving..." : "Save Profile"}
			</button>
		</div>
	);

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50 p-4"
			style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
		>
			<div
				className={`w-full max-w-md rounded-lg shadow-xl ${darkMode ? "bg-gray-800" : "bg-white"}`}
			>
				{/* Header */}
				<div
					className={`flex items-center justify-between p-6 border-b ${
						darkMode ? "border-gray-700" : "border-gray-200"
					}`}
				>
					<div className="flex items-center space-x-3">
						<div
							className={`p-2 rounded-full ${darkMode ? "bg-blue-900" : "bg-blue-100"}`}
						>
							<Edit3
								className={`w-5 h-5 ${darkMode ? "text-blue-300" : "text-blue-600"}`}
							/>
						</div>
						<div>
							<h2
								className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								Complete Your Profile
							</h2>
							<p
								className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
							>
								Help others recognize you in teams
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className={`p-2 rounded-full transition-colors ${
							darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
						}`}
					>
						<X
							className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
						/>
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-4">
					{success ? renderSuccessMessage() : renderFormContent()}
				</div>

				{/* Footer */}
				{!success && renderFooter()}
			</div>
		</div>
	);
}
