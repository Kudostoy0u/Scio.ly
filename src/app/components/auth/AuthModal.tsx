/* Presentational Auth modal extracted from AuthButton */
"use client";
import { Eye, EyeOff, X } from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
import GoogleSignInButton from "./GoogleSignInButton";

type AuthMode = "signin" | "signup" | "reset";

type AuthModalProps = {
	open: boolean;
	darkMode: boolean;
	authMode: AuthMode;
	setAuthMode: (m: AuthMode) => void;
	email: string;
	setEmail: (v: string) => void;
	password: string;
	setPassword: (v: string) => void;
	confirmPassword: string;
	setConfirmPassword: (v: string) => void;
	firstName: string;
	setFirstName: (v: string) => void;
	lastName: string;
	setLastName: (v: string) => void;
	showPassword: boolean;
	setShowPassword: (v: boolean) => void;
	authError: string;
	authSuccess: string;
	authLoading: boolean;
	oauthLoading: boolean;
	isOffline: boolean;
	subtleLinkClass: string;
	resetEmailSent: boolean;
	onClose: () => void;
	handlePasswordReset: () => void | Promise<void>;
	handleEmailPasswordAuth: () => void | Promise<void>;
	handleGoogleSignIn: () => void | Promise<void>;
};

// Helper function to get modal title
function getModalTitle(authMode: AuthMode): string {
	if (authMode === "signin") {
		return "Sign In";
	}
	if (authMode === "signup") {
		return "Sign Up";
	}
	return "Reset Password";
}

// Helper function to get modal description
function getModalDescription(authMode: AuthMode): string {
	if (authMode === "signin") {
		return "Welcome back! Sign in to continue your learning journey.";
	}
	if (authMode === "signup") {
		return "Join Scio.ly to start practicing Science Olympiad questions.";
	}
	return "Enter your email to receive a password reset link.";
}

// Helper function to render modal header
function renderModalHeader(authMode: AuthMode, darkMode: boolean) {
	return (
		<div className="text-center mb-6">
			<h2
				className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				{getModalTitle(authMode)}
			</h2>
			<p className={darkMode ? "text-gray-300" : "text-gray-600"}>
				{getModalDescription(authMode)}
			</p>
		</div>
	);
}

// Helper function to render input field
function renderInput(
	type: string,
	placeholder: string,
	value: string,
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
	darkMode: boolean,
	required = false,
	minLength?: number,
	className = "",
) {
	return (
		<input
			type={type}
			placeholder={placeholder}
			value={value}
			onChange={onChange}
			className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className} ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
			required={required}
			minLength={minLength}
		/>
	);
}

// Helper function to render password input with toggle
function renderPasswordInput(
	showPassword: boolean,
	password: string,
	setPassword: (v: string) => void,
	setShowPassword: (v: boolean) => void,
	darkMode: boolean,
	placeholder = "Password",
) {
	return (
		<div className="relative">
			{renderInput(
				showPassword ? "text" : "password",
				placeholder,
				password,
				(e) => setPassword(e.target.value),
				darkMode,
				true,
				6,
				"pr-12",
			)}
			<button
				type="button"
				onClick={() => setShowPassword(!showPassword)}
				className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
			>
				{showPassword ? (
					<EyeOff className="w-4 h-4" />
				) : (
					<Eye className="w-4 h-4" />
				)}
			</button>
		</div>
	);
}

// Helper function to render reset password form
function renderResetPasswordForm(props: AuthModalProps) {
	const {
		email,
		setEmail,
		authError,
		resetEmailSent,
		authLoading,
		handlePasswordReset,
		setAuthMode,
		subtleLinkClass,
		darkMode,
	} = props;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				handlePasswordReset();
			}}
			className="space-y-4"
		>
			<div>
				{renderInput(
					"email",
					"Email",
					email,
					(e) => setEmail(e.target.value),
					darkMode,
					true,
				)}
			</div>
			{authError && (
				<div className="text-red-500 text-sm bg-red-400 p-3 rounded-lg">
					{authError}
				</div>
			)}
			{resetEmailSent && (
				<div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
					Password reset email sent! Check your inbox.
				</div>
			)}
			<button
				type="submit"
				disabled={authLoading}
				className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
			>
				{authLoading ? (
					<div className="flex items-center justify-center">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
						Sending Reset Email...
					</div>
				) : (
					"Send Reset Email"
				)}
			</button>
			<div className="text-center">
				<button
					type="button"
					onClick={() => setAuthMode("signin")}
					className={`${subtleLinkClass} text-sm`}
				>
					Back to Sign In
				</button>
			</div>
		</form>
	);
}

// Helper function to render signin/signup form
function renderSignInSignUpForm(props: AuthModalProps) {
	const {
		authMode,
		firstName,
		setFirstName,
		lastName,
		setLastName,
		email,
		setEmail,
		password,
		setPassword,
		confirmPassword,
		setConfirmPassword,
		showPassword,
		setShowPassword,
		authError,
		authSuccess,
		authLoading,
		handleEmailPasswordAuth,
		setAuthMode,
		subtleLinkClass,
		darkMode,
	} = props;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				handleEmailPasswordAuth();
			}}
			className="space-y-4"
		>
			{authMode === "signup" && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{renderInput(
						"text",
						"First name",
						firstName,
						(e) => setFirstName(e.target.value),
						darkMode,
						true,
					)}
					{renderInput(
						"text",
						"Last name",
						lastName,
						(e) => setLastName(e.target.value),
						darkMode,
						true,
					)}
				</div>
			)}
			<div>
				{renderInput(
					"email",
					"Email",
					email,
					(e) => setEmail(e.target.value),
					darkMode,
					true,
					undefined,
					"pr-12",
				)}
			</div>
			{renderPasswordInput(
				showPassword,
				password,
				setPassword,
				setShowPassword,
				darkMode,
			)}
			{authMode === "signup" && (
				<div>
					{renderInput(
						"password",
						"Confirm password",
						confirmPassword,
						(e) => setConfirmPassword(e.target.value),
						darkMode,
						true,
						6,
					)}
				</div>
			)}
			{authError && (
				<div className="text-white text-sm bg-red-400 p-3 rounded-lg">
					{authError}
				</div>
			)}
			{authSuccess && (
				<div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">
					{authSuccess}
				</div>
			)}
			<button
				type="submit"
				disabled={authLoading}
				className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
			>
				{authLoading ? (
					<div className="flex items-center justify-center">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
						{authMode === "signin" ? "Signing In..." : "Signing Up..."}
					</div>
				) : authMode === "signin" ? (
					"Sign In"
				) : (
					"Sign Up"
				)}
			</button>
			{authMode === "signin" && (
				<div className="text-center">
					<button
						type="button"
						onClick={() => setAuthMode("reset")}
						className={`${subtleLinkClass} text-sm`}
					>
						Forgot your password?
					</button>
				</div>
			)}
		</form>
	);
}

// Helper function to render OAuth section
function renderOAuthSection(props: AuthModalProps) {
	const { darkMode, oauthLoading, isOffline, handleGoogleSignIn } = props;

	return (
		<div className="mt-4">
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<div
						className={`w-full border-t ${darkMode ? "border-gray-600" : "border-gray-300"}`}
					/>
				</div>
				<div className="relative flex justify-center text-sm">
					<span
						className={`px-2 ${darkMode ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500"}`}
					>
						Or continue with
					</span>
				</div>
			</div>
			<div className="mt-4">
				<GoogleSignInButton
					darkMode={darkMode}
					oauthLoading={oauthLoading}
					isOffline={isOffline}
					onClick={handleGoogleSignIn}
				/>
			</div>
		</div>
	);
}

// Helper function to render auth mode toggle
function renderAuthModeToggle(props: AuthModalProps) {
	const { authMode, setAuthMode, subtleLinkClass } = props;

	return (
		<div className="mt-4 text-center">
			<button
				type="button"
				onClick={() => {
					setAuthMode(authMode === "signin" ? "signup" : "signin");
				}}
				className={`${subtleLinkClass} text-sm`}
			>
				{authMode === "signin"
					? "Don't have an account? Sign up"
					: "Already have an account? Sign in"}
			</button>
		</div>
	);
}

export default function AuthModal({
	open,
	darkMode,
	authMode,
	setAuthMode,
	email,
	setEmail,
	password,
	setPassword,
	confirmPassword,
	setConfirmPassword,
	firstName,
	setFirstName,
	lastName,
	setLastName,
	showPassword,
	setShowPassword,
	authError,
	authSuccess,
	authLoading,
	oauthLoading,
	isOffline,
	subtleLinkClass,
	resetEmailSent,
	onClose,
	handlePasswordReset,
	handleEmailPasswordAuth,
	handleGoogleSignIn,
}: AuthModalProps) {
	if (!open) {
		return null;
	}

	const content = (
		<div
			className="fixed inset-0 z-[9999]"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "1rem",
				backgroundColor: "rgba(0, 0, 0, 0.5)",
			}}
			onMouseDown={onClose}
		>
			<div
				className={`relative rounded-lg p-6 w-full max-w-md ${darkMode ? "bg-gray-800" : "bg-white"}`}
				onMouseDown={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className={`absolute top-4 right-4 transition-colors duration-200 ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
				>
					<X className="w-6 h-6" />
				</button>

				{renderModalHeader(authMode, darkMode)}

				{authMode === "reset" ? (
					renderResetPasswordForm({
						open,
						darkMode,
						authMode,
						setAuthMode,
						email,
						setEmail,
						password,
						setPassword,
						confirmPassword,
						setConfirmPassword,
						firstName,
						setFirstName,
						lastName,
						setLastName,
						showPassword,
						setShowPassword,
						authError,
						authSuccess,
						authLoading,
						oauthLoading,
						isOffline,
						subtleLinkClass,
						resetEmailSent,
						onClose,
						handlePasswordReset,
						handleEmailPasswordAuth,
						handleGoogleSignIn,
					})
				) : (
					<>
						{renderSignInSignUpForm({
							open,
							darkMode,
							authMode,
							setAuthMode,
							email,
							setEmail,
							password,
							setPassword,
							confirmPassword,
							setConfirmPassword,
							firstName,
							setFirstName,
							lastName,
							setLastName,
							showPassword,
							setShowPassword,
							authError,
							authSuccess,
							authLoading,
							oauthLoading,
							isOffline,
							subtleLinkClass,
							resetEmailSent,
							onClose,
							handlePasswordReset,
							handleEmailPasswordAuth,
							handleGoogleSignIn,
						})}
						{renderOAuthSection({
							open,
							darkMode,
							authMode,
							setAuthMode,
							email,
							setEmail,
							password,
							setPassword,
							confirmPassword,
							setConfirmPassword,
							firstName,
							setFirstName,
							lastName,
							setLastName,
							showPassword,
							setShowPassword,
							authError,
							authSuccess,
							authLoading,
							oauthLoading,
							isOffline,
							subtleLinkClass,
							resetEmailSent,
							onClose,
							handlePasswordReset,
							handleEmailPasswordAuth,
							handleGoogleSignIn,
						})}
						{renderAuthModeToggle({
							open,
							darkMode,
							authMode,
							setAuthMode,
							email,
							setEmail,
							password,
							setPassword,
							confirmPassword,
							setConfirmPassword,
							firstName,
							setFirstName,
							lastName,
							setLastName,
							showPassword,
							setShowPassword,
							authError,
							authSuccess,
							authLoading,
							oauthLoading,
							isOffline,
							subtleLinkClass,
							resetEmailSent,
							onClose,
							handlePasswordReset,
							handleEmailPasswordAuth,
							handleGoogleSignIn,
						})}
					</>
				)}
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(content, document.body)
		: null;
}
