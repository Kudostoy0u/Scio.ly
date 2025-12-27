"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logging/logger";

// Image and Link are used within UserDropdown/AuthModal
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { db } from "@/app/utils/db";
import { resetTeamsClientCache } from "@/lib/query/resetTeamsClientCache";
import { preloadImage } from "@/lib/utils/media/preloadImage";
import type { User } from "@supabase/supabase-js";
import {} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AuthModal from "./auth/AuthModal";
import UserDropdown from "./auth/UserDropdown";

export default function AuthButton() {
	const { darkMode } = useTheme();
	const { user: ctxUser, client } = useAuth();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [showSignInModal, setShowSignInModal] = useState(false);
	const [isOffline, setIsOffline] = useState(false);
	const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [authError, setAuthError] = useState("");
	const [authLoading, setAuthLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [displayName, setDisplayName] = useState<string | null>(null);
	const [photoUrl, setPhotoUrl] = useState<string | null>(null);
	const [oauthLoading, setOauthLoading] = useState(false);
	const [confirmPassword, setConfirmPassword] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const subtleLinkClass = darkMode
		? "text-blue-300 hover:text-blue-200"
		: "text-blue-500 hover:text-blue-600";
	const [username, setUsername] = useState<string | null>(null);

	useEffect(() => {
		setUser(ctxUser ?? null);
		setLoading(false);
	}, [ctxUser]);
	useEffect(() => {
		if (ctxUser?.id) {
			try {
				const cachedName = SyncLocalStorage.getItem(
					`scio_display_name_${ctxUser.id}`,
				);
				if (cachedName) {
					setDisplayName(cachedName);
				}
				const cachedUsername = SyncLocalStorage.getItem(
					`scio_username_${ctxUser.id}`,
				);
				if (cachedUsername) {
					setUsername(cachedUsername);
				}
			} catch {
				// Ignore errors when loading cached username
			}
		}
	}, [ctxUser?.id]);
	// Notifications are now handled efficiently via useEfficientNotifications hook
	// This reduces API calls by using intelligent caching and team membership checks

	useEffect(() => {
		if (ctxUser?.id) {
			try {
				const cachedPhotoUrl = SyncLocalStorage.getItem(
					`scio_profile_photo_${ctxUser.id}`,
				);
				if (cachedPhotoUrl) {
					setPhotoUrl(cachedPhotoUrl);

					preloadImage(cachedPhotoUrl).catch(() => {
						SyncLocalStorage.removeItem(`scio_profile_photo_${ctxUser.id}`);
						setPhotoUrl(null);
					});
				}
			} catch {
				// Ignore errors when loading cached photo URL
			}
		}
	}, [ctxUser?.id]);

	const clearUserFromLocalStorage = () => {
		try {
			SyncLocalStorage.removeItem("scio_user_data");
			SyncLocalStorage.setItem("scio_is_logged_in", "0");
			SyncLocalStorage.removeItem("scio_display_name");

			if (user?.id) {
				SyncLocalStorage.removeItem(`scio_profile_photo_${user.id}`);
				SyncLocalStorage.removeItem(`scio_display_name_${user.id}`);
				SyncLocalStorage.removeItem(`scio_username_${user.id}`);
			}
		} catch {
			// Ignore errors when clearing user data from localStorage
		}
	};

	useEffect(() => {
		const handleOnline = () => setIsOffline(false);
		const handleOffline = () => setIsOffline(true);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		setIsOffline(!window.navigator.onLine);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// moved to '@/lib/utils/media/preloadImage'

	useEffect(() => {
		let active = true;
		const supabase = client;
		const isActive = () => active;

		// Helper function to save display name
		const saveDisplayNameLocal = (userId: string, displayName: string) => {
			setDisplayName(displayName);
			try {
				SyncLocalStorage.setItem(`scio_display_name_${userId}`, displayName);
			} catch {
				// Ignore errors when saving display name to localStorage
			}
		};

		// Helper function to save username
		const saveUsernameLocal = (userId: string, username: string) => {
			setUsername(username);
			try {
				SyncLocalStorage.setItem(`scio_username_${userId}`, username);
			} catch {
				// Ignore errors when saving username to localStorage
			}
		};

		// Helper function to handle photo URL
		const handlePhotoUrlLocal = async (
			userId: string,
			photo: string,
			isActiveFn: () => boolean,
		) => {
			try {
				SyncLocalStorage.setItem(`scio_profile_photo_${userId}`, photo);
				await preloadImage(photo);
				if (isActiveFn()) {
					setPhotoUrl(photo);
				}
			} catch {
				SyncLocalStorage.removeItem(`scio_profile_photo_${userId}`);
			}
		};

		// Helper function to process profile data
		const processProfileData = async (
			userId: string,
			profile: {
				display_name?: string;
				username?: string;
				photo_url?: string;
			} | null,
			isActiveFn: () => boolean,
		) => {
			if (!isActiveFn()) {
				return;
			}
			if (!profile) {
				return;
			}

			if (profile.display_name) {
				saveDisplayNameLocal(userId, profile.display_name);
			}

			if (profile.username) {
				saveUsernameLocal(userId, profile.username);
			}

			if (profile.photo_url) {
				await handlePhotoUrlLocal(userId, profile.photo_url, isActiveFn);
			}
		};

		// Helper function to fetch and process user profile
		const fetchUserProfile = async (
			userId: string,
			supabaseClient: typeof client,
			isActiveFn: () => boolean,
		) => {
			if (!isActiveFn()) {
				return;
			}

			const { data: profile } = await supabaseClient
				.from("users")
				.select("display_name, photo_url, username")
				.eq("id", userId)
				.maybeSingle();

			await processProfileData(userId, profile, isActiveFn);
		};

		(async () => {
			try {
				if (
					!ctxUser?.id ||
					typeof ctxUser.id !== "string" ||
					ctxUser.id.trim() === ""
				) {
					return;
				}

				await fetchUserProfile(ctxUser.id, supabase, isActive);
			} catch {
				// Ignore errors when loading user profile
			}
		})();
		return () => {
			active = false;
		};
	}, [client, ctxUser?.id]);

	// Helper function to validate signup inputs
	const validateSignupInputs = (): string | null => {
		if (!confirmPassword) {
			return "Please confirm your password";
		}
		if (confirmPassword !== password) {
			return "Passwords do not match";
		}
		return null;
	};

	// Helper function to check if email exists
	const checkEmailExists = async (emailToCheck: string): Promise<boolean> => {
		try {
			const { data: existing, error: existsErr } = await client
				.from("users")
				.select("id")
				.eq("email", emailToCheck)
				.maybeSingle();
			return existing !== null && !existsErr;
		} catch {
			return false;
		}
	};

	// Helper function to handle signup error messages
	const getSignupErrorMessage = (error: { message: string }): string => {
		if (
			error.message.includes("already registered") ||
			error.message.includes("already exists") ||
			error.message.includes("already been registered") ||
			error.message.includes("User already registered")
		) {
			return "Email is already in use.";
		}
		return error.message;
	};

	// Helper function to handle signup
	const handleSignup = async (): Promise<void> => {
		const validationError = validateSignupInputs();
		if (validationError) {
			setAuthError(validationError);
			return;
		}

		const emailExists = await checkEmailExists(email);
		if (emailExists) {
			setAuthError("Email is already in use.");
			return;
		}

		const { data, error } = await client.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
			},
		});

		if (error) {
			setAuthError(getSignupErrorMessage(error));
		} else if (data.user?.email_confirmed_at) {
			setAuthError("Email is already in use.");
		} else {
			// Signup successful - close the modal
			setShowSignInModal(false);
			resetForm();
		}
	};

	// Helper function to handle signin error messages
	const getSigninErrorMessage = async (
		emailToCheck: string,
	): Promise<string> => {
		try {
			const { data: existing, error: readErr } = await client
				.from("users")
				.select("id")
				.eq("email", emailToCheck)
				.maybeSingle();
			if (existing && !readErr) {
				return "Incorrect password.";
			}
			if (existing || readErr) {
				return "Incorrect email or password.";
			}
			return "No account found with this email. Please sign up instead.";
		} catch {
			return "Incorrect email or password.";
		}
	};

	// Helper function to handle signin
	const handleSignin = async (): Promise<void> => {
		const { error } = await client.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			if (error.message.includes("Invalid login credentials")) {
				const errorMsg = await getSigninErrorMessage(email);
				setAuthError(errorMsg);
			} else {
				setAuthError(error.message);
			}
		} else {
			setShowSignInModal(false);
			setEmail("");
			setPassword("");
		}
	};

	const handleEmailPasswordAuth = async () => {
		if (!(email && password)) {
			setAuthError("Please fill in all fields");
			return;
		}

		if (password.length < 6) {
			setAuthError("Password must be at least 6 characters");
			return;
		}

		setAuthLoading(true);
		setAuthError("");

		try {
			if (authMode === "signup") {
				await handleSignup();
			} else {
				await handleSignin();
			}
		} catch (error) {
			setAuthError(
				`An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setAuthLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		try {
			setOauthLoading(true);
			const redirectTo =
				typeof window !== "undefined"
					? `${window.location.origin}${window.location.pathname}`
					: undefined;
			const { error } = await client.auth.signInWithOAuth({
				provider: "google",
				options: { redirectTo },
			});
			if (error) {
				setAuthError(error.message);
			}
		} catch (err) {
			setAuthError(
				`An unexpected error occurred: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setOauthLoading(false);
		}
	};

	const handleSignOut = async () => {
		try {
			await db.teamRosterPrefs.clear().catch(() => undefined);
			await resetTeamsClientCache().catch(() => undefined);
			await client.auth.signOut({ scope: "local" }).catch(() => undefined);

			try {
				const { resetAllLocalStorageExceptTheme } = await import(
					"@/app/utils/dashboardData"
				);
				resetAllLocalStorageExceptTheme();
			} catch {
				clearUserFromLocalStorage();
			}
			setUser(null);
			setIsDropdownOpen(false);

			client.auth.signOut({ scope: "global" }).catch((err) => {
				logger.warn("Non-fatal global sign-out issue:", err);
			});

			window.location.reload();
		} catch (error) {
			logger.error("Error signing out:", error);
		}
	};

	const resetForm = () => {
		setEmail("");
		setPassword("");
		setAuthError("");
		setAuthMode("signin");
		setConfirmPassword("");
	};

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
			</div>
		);
	}

	if (user) {
		return (
			<UserDropdown
				darkMode={!!darkMode}
				user={user}
				photoUrl={photoUrl}
				displayName={displayName}
				username={username}
				handleSignOut={handleSignOut}
				isDropdownOpen={isDropdownOpen}
				setIsDropdownOpen={setIsDropdownOpen}
				dropdownRef={dropdownRef}
				triggerRef={triggerRef}
			/>
		);
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setShowSignInModal(true)}
				className={`px-2 py-2 text-sm font-medium transition-colors duration-200 ${
					darkMode
						? "text-blue-400 hover:text-blue-300"
						: "text-blue-500 hover:text-blue-600"
				}`}
			>
				Sign In
			</button>

			<AuthModal
				open={showSignInModal}
				darkMode={!!darkMode}
				authMode={authMode}
				setAuthMode={(m) => {
					setAuthMode(m);
					if (m === "signin") {
						setAuthError("");
					}
				}}
				email={email}
				setEmail={setEmail}
				password={password}
				setPassword={setPassword}
				confirmPassword={confirmPassword}
				setConfirmPassword={setConfirmPassword}
				showPassword={showPassword}
				setShowPassword={setShowPassword}
				authError={authError}
				authLoading={authLoading}
				oauthLoading={oauthLoading}
				isOffline={isOffline}
				subtleLinkClass={subtleLinkClass}
				onClose={() => {
					setShowSignInModal(false);
					resetForm();
				}}
				handleEmailPasswordAuth={handleEmailPasswordAuth}
				handleGoogleSignIn={handleGoogleSignIn}
			/>
		</>
	);
}
