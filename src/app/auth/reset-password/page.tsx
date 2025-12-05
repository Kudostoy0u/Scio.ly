"use client";

import { supabase } from "@/lib/supabase";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useState } from "react";

function ResetPasswordContent() {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isValidLink, setIsValidLink] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const accessToken = searchParams.get("access_token");

		if (!accessToken) {
			setError("Invalid reset link. Please request a new password reset.");
			return;
		}

		setIsValidLink(true);
	}, [searchParams]);

	const handlePasswordReset = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!isValidLink) {
			setError("Invalid reset link. Please request a new password reset.");
			return;
		}

		if (password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const { error: updateError } = await supabase.auth.updateUser({
				password: password,
			});

			if (updateError) {
				setError(updateError.message);
			} else {
				setSuccess(true);
				setTimeout(() => {
					router.push("/");
				}, 2000);
			}
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	if (success) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
					<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<Check className="w-8 h-8 text-green-600" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Password Updated!
					</h1>
					<p className="text-gray-600 mb-6">
						Your password has been successfully updated. You&apos;ll be
						redirected to the home page shortly.
					</p>
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
				</div>
			</div>
		);
	}

	if (!isValidLink) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
					<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<X className="w-8 h-8 text-red-600" />
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Invalid Link
					</h1>
					<p className="text-gray-600 mb-6">
						{error ||
							"This password reset link is invalid or has expired. Please request a new password reset."}
					</p>
					<button
						type="button"
						onClick={() => router.push("/")}
						className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
					>
						Back to Home
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Update Your Password
					</h1>
					<p className="text-gray-600">
						Enter your new password below to complete the update process.
					</p>
				</div>

				<form onSubmit={handlePasswordReset} className="space-y-4">
					<div className="relative">
						<input
							type={showPassword ? "text" : "password"}
							placeholder="New Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
							required={true}
							minLength={6}
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
						>
							{showPassword ? (
								<EyeOff className="w-4 h-4" />
							) : (
								<Eye className="w-4 h-4" />
							)}
						</button>
					</div>

					<div className="relative">
						<input
							type={showConfirmPassword ? "text" : "password"}
							placeholder="Confirm New Password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
							required={true}
							minLength={6}
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
						>
							{showConfirmPassword ? (
								<EyeOff className="w-4 h-4" />
							) : (
								<Eye className="w-4 h-4" />
							)}
						</button>
					</div>

					{error && (
						<div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
							{error}
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
					>
						{loading ? (
							<div className="flex items-center justify-center">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
								Updating Password...
							</div>
						) : (
							"Update Password"
						)}
					</button>
				</form>

				<div className="mt-6 text-center">
					<button
						type="button"
						onClick={() => router.push("/")}
						className="text-blue-600 hover:text-blue-700 text-sm"
					>
						Back to Home
					</button>
				</div>
			</div>
		</div>
	);
}

function LoadingFallback() {
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
				<p className="text-lg">Loading...</p>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={<LoadingFallback />}>
			<ResetPasswordContent />
		</Suspense>
	);
}
