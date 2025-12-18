"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { CheckCircle2, Link2, UserPlus, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

export interface TeamInvitationModalInvite {
	id: string;
	teamSlug: string;
	teamName: string;
	school: string;
	division: string;
	role?: "captain" | "member";
	rosterDisplayName?: string;
}

interface TeamInvitationModalProps {
	invites: TeamInvitationModalInvite[];
	onClose: () => void;
	onAccept: (invite: TeamInvitationModalInvite) => Promise<void>;
	onDecline: (invite: TeamInvitationModalInvite) => Promise<void>;
}

export default function TeamInvitationModal({
	invites,
	onClose,
	onAccept,
	onDecline,
}: TeamInvitationModalProps) {
	const { darkMode } = useTheme();
	const [processing, setProcessing] = useState<{
		inviteId: string;
		action: "accept" | "decline";
	} | null>(null);

	const hasAnyLinkInvites = useMemo(
		() => invites.some((i) => !!i.rosterDisplayName),
		[invites],
	);

	const handleAccept = async (invite: TeamInvitationModalInvite) => {
		setProcessing({ inviteId: invite.id, action: "accept" });
		try {
			await onAccept(invite);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to accept invitation",
			);
		} finally {
			setProcessing(null);
		}
	};

	const handleDecline = async (invite: TeamInvitationModalInvite) => {
		setProcessing({ inviteId: invite.id, action: "decline" });
		try {
			await onDecline(invite);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to decline invitation",
			);
		} finally {
			setProcessing(null);
		}
	};

	if (invites.length === 0) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
			<div
				className={`relative max-w-lg w-full rounded-lg shadow-xl ${
					darkMode ? "bg-gray-800" : "bg-white"
				}`}
			>
				<div
					className={`flex items-center justify-between p-6 border-b ${
						darkMode ? "border-gray-700" : "border-gray-200"
					}`}
				>
					<div className="flex items-center space-x-3">
						{hasAnyLinkInvites ? (
							<Link2
								className={`w-6 h-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
							/>
						) : (
							<UserPlus
								className={`w-6 h-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
							/>
						)}
						<h2
							className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							Team Invitation
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className={`p-1 rounded transition-colors ${
							darkMode
								? "hover:bg-gray-700 text-gray-400 hover:text-white"
								: "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
						}`}
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
					<p
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						{hasAnyLinkInvites
							? "A team captain invited you to join, and optionally link your account to an existing roster entry."
							: "A team captain invited you to join their team."}
					</p>

					{invites.map((invite) => {
						const isProcessingInvite = processing?.inviteId === invite.id;
						const isAccepting =
							isProcessingInvite && processing?.action === "accept";
						const isDeclining =
							isProcessingInvite && processing?.action === "decline";

						return (
							<div
								key={invite.id}
								className={`p-4 rounded-lg border ${
									darkMode
										? "bg-gray-700 border-gray-600"
										: "bg-gray-50 border-gray-200"
								}`}
							>
								<div className="flex items-start justify-between mb-3">
									<div>
										<h3
											className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											{invite.teamName}
										</h3>
										<p
											className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
										>
											{invite.school} • Division {invite.division}
											{invite.role ? (
												<span className="ml-2">• {invite.role}</span>
											) : null}
										</p>
									</div>
									<UserPlus
										className={`w-5 h-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
									/>
								</div>

								{invite.rosterDisplayName ? (
									<div
										className={`flex items-center space-x-2 mb-3 text-sm ${
											darkMode ? "text-gray-300" : "text-gray-700"
										}`}
									>
										<span>Link as:</span>
										<span
											className={`font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}
										>
											{invite.rosterDisplayName}
										</span>
									</div>
								) : null}

								<div className="flex items-center space-x-2">
									<button
										type="button"
										onClick={() => handleAccept(invite)}
										disabled={isProcessingInvite}
										className={`relative flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
											isProcessingInvite
												? "bg-gray-400 text-gray-200 cursor-not-allowed"
												: "bg-green-600 text-white hover:bg-green-700"
										}`}
									>
										<span
											className={`inline-flex items-center justify-center gap-2 ${
												isAccepting ? "opacity-0" : "opacity-100"
											}`}
										>
											<CheckCircle2 className="w-4 h-4" />
											<span>Join team</span>
										</span>
										{isAccepting ? (
											<span className="absolute inset-0 flex items-center justify-center">
												<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
											</span>
										) : null}
									</button>
									<button
										type="button"
										onClick={() => handleDecline(invite)}
										disabled={isProcessingInvite}
										className={`relative flex-1 flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
											isProcessingInvite
												? "bg-gray-400 text-gray-200 cursor-not-allowed"
												: darkMode
													? "bg-gray-600 text-gray-300 hover:bg-gray-500"
													: "bg-gray-200 text-gray-700 hover:bg-gray-300"
										}`}
									>
										<span
											className={`inline-flex items-center justify-center gap-2 ${
												isDeclining ? "opacity-0" : "opacity-100"
											}`}
										>
											<XCircle className="w-4 h-4" />
											<span>Decline</span>
										</span>
										{isDeclining ? (
											<span className="absolute inset-0 flex items-center justify-center">
												<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
											</span>
										) : null}
									</button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
