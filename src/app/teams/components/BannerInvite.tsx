"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { trpc } from "@/lib/trpc/client";
import { Copy, Crown, Users, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "react-toastify";

interface BannerInviteProps {
	isOpen: boolean;
	onClose: () => void;
	teamSlug: string;
}

export default function BannerInvite({
	isOpen,
	onClose,
	teamSlug,
}: BannerInviteProps) {
	const { darkMode } = useTheme();
	const {
		data: codes,
		isLoading: loading,
		error,
	} = trpc.teams.getCodes.useQuery({ teamSlug }, { enabled: isOpen });

	useEffect(() => {
		if (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to load invite codes",
			);
		}
	}, [error]);

	const copyToClipboard = async (text: string, type: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${type} code copied to clipboard`);
		} catch (_error) {
			toast.error("Failed to copy code");
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto"
			style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
		>
			<div className="min-h-full flex items-center justify-center p-4">
				<div
					className={`w-full max-w-md sm:max-w-xl rounded-lg border ${
						darkMode
							? "bg-gray-800 border-gray-700"
							: "bg-white border-gray-200"
					}`}
				>
					<div className="p-4 sm:p-6">
						<div className="flex items-center justify-between mb-6">
							<h2
								className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								Team Invite Codes
							</h2>
							<button
								type="button"
								onClick={onClose}
								aria-label="Close"
								className={`p-2 rounded-lg transition-colors ${
									darkMode
										? "hover:bg-gray-700 text-gray-400"
										: "hover:bg-gray-100 text-gray-500"
								}`}
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{loading ? (
							<div className="flex items-center justify-center py-12">
								<div
									className={`animate-spin rounded-full h-8 w-8 border-b-2 ${darkMode ? "border-white" : "border-gray-900"}`}
								/>
							</div>
						) : codes ? (
							<div className="space-y-4 sm:space-y-6">
								{/* Captain Code */}
								<div
									className={`p-4 sm:p-6 rounded-lg border-2 ${
										darkMode
											? "bg-yellow-900/20 border-yellow-700"
											: "bg-yellow-50 border-yellow-200"
									}`}
								>
									<div className="flex items-center space-x-3 mb-4">
										<Crown className="w-6 h-6 text-yellow-600" />
										<h3
											className={`text-lg font-semibold ${darkMode ? "text-yellow-300" : "text-yellow-800"}`}
										>
											Captain Invite Code
										</h3>
									</div>
									<p
										className={`text-sm mb-4 ${darkMode ? "text-yellow-200" : "text-yellow-700"}`}
									>
										Share this code with potential captains. They can join as
										co-captains.
									</p>
									<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
										<div
											className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-mono text-base sm:text-lg ${
												darkMode
													? "bg-gray-700 text-white border border-gray-600"
													: "bg-white text-gray-900 border border-gray-300"
											}`}
										>
											{codes.captainCode}
										</div>
										<button
											type="button"
											onClick={() =>
												codes.captainCode &&
												copyToClipboard(codes.captainCode, "Captain")
											}
											className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors ${
												darkMode
													? "bg-yellow-600 text-white hover:bg-yellow-700"
													: "bg-yellow-600 text-white hover:bg-yellow-700"
											}`}
										>
											<Copy className="w-4 h-4" />
										</button>
									</div>
								</div>

								{/* User Code */}
								<div
									className={`p-4 sm:p-6 rounded-lg border-2 ${
										darkMode
											? "bg-blue-900/20 border-blue-700"
											: "bg-blue-50 border-blue-200"
									}`}
								>
									<div className="flex items-center space-x-3 mb-4">
										<Users className="w-6 h-6 text-blue-600" />
										<h3
											className={`text-lg font-semibold ${darkMode ? "text-blue-300" : "text-blue-800"}`}
										>
											User Invite Code
										</h3>
									</div>
									<p
										className={`text-sm mb-4 ${darkMode ? "text-blue-200" : "text-blue-700"}`}
									>
										Share this code with potential team members. They can join
										as regular members.
									</p>
									<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
										<div
											className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-mono text-base sm:text-lg ${
												darkMode
													? "bg-gray-700 text-white border border-gray-600"
													: "bg-white text-gray-900 border border-gray-300"
											}`}
										>
											{codes.userCode}
										</div>
										<button
											type="button"
											onClick={() =>
												codes.userCode &&
												copyToClipboard(codes.userCode, "User")
											}
											className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-colors ${
												darkMode
													? "bg-blue-600 text-white hover:bg-blue-700"
													: "bg-blue-600 text-white hover:bg-blue-700"
											}`}
										>
											<Copy className="w-4 h-4" />
										</button>
									</div>
								</div>

								{/* Instructions */}
								<div
									className={`p-3 sm:p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
								>
									<h4
										className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-800"}`}
									>
										How to use these codes:
									</h4>
									<ul
										className={`text-sm space-y-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
									>
										<li>• Share the Captain Code with potential co-captains</li>
										<li>• Share the User Code with regular team members</li>
										<li>• Recipients can use these codes to join your team</li>
										<li>
											• Codes are unique to your team and don&apos;t expire
										</li>
									</ul>
								</div>
							</div>
						) : (
							<div
								className={`text-center py-12 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
							>
								<p>Failed to load invite codes</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
