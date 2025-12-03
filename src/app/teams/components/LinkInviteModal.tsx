"use client";

import { useTheme } from "@/app/contexts/themeContext";
import { trpc } from "@/lib/trpc/client";
import { CheckCircle2, Link2, UserPlus, X, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

interface LinkInvite {
	id: string;
	teamId: string;
	slug: string;
	teamName: string;
	school: string;
	division: string;
	rosterDisplayName: string;
}

interface LinkInviteModalProps {
	linkInvites: LinkInvite[];
	onClose: () => void;
}

export default function LinkInviteModal({
	linkInvites,
	onClose,
}: LinkInviteModalProps) {
	const { darkMode } = useTheme();
	const [processing, setProcessing] = useState<string | null>(null);
	const acceptMutation = trpc.teams.acceptLinkInvite.useMutation();
	const declineMutation = trpc.teams.declineLinkInvite.useMutation();
	const utils = trpc.useUtils();

	const handleAccept = async (linkInviteId: string) => {
		setProcessing(linkInviteId);
		try {
			await acceptMutation.mutateAsync({ linkInviteId });
			toast.success("You've been linked to the team roster!");
			await utils.teams.pendingLinkInvites.invalidate();
			await utils.teams.listUserTeams.invalidate();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to accept link invitation",
			);
		} finally {
			setProcessing(null);
		}
	};

	const handleDecline = async (linkInviteId: string) => {
		setProcessing(linkInviteId);
		try {
			await declineMutation.mutateAsync({ linkInviteId });
			toast.info("Link invitation declined");
			await utils.teams.pendingLinkInvites.invalidate();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to decline link invitation",
			);
		} finally {
			setProcessing(null);
		}
	};

	if (linkInvites.length === 0) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
			<div
				className={`relative max-w-lg w-full rounded-lg shadow-xl ${
					darkMode ? "bg-gray-800" : "bg-white"
				}`}
			>
				{/* Header */}
				<div
					className={`flex items-center justify-between p-6 border-b ${
						darkMode ? "border-gray-700" : "border-gray-200"
					}`}
				>
					<div className="flex items-center space-x-3">
						<Link2 className={`w-6 h-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
						<h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
							Link Roster Invitations
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

				{/* Content */}
				<div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
					<p
						className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
					>
						Team captains have invited you to link your account to their roster
						entries. Accepting will add you to the team.
					</p>

					{linkInvites.map((invite) => (
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
									</p>
								</div>
								<UserPlus
									className={`w-5 h-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
								/>
							</div>

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

							<div className="flex items-center space-x-2">
								<button
									type="button"
									onClick={() => handleAccept(invite.id)}
									disabled={processing === invite.id}
									className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
										processing === invite.id
											? "bg-gray-400 text-gray-200 cursor-not-allowed"
											: "bg-green-600 text-white hover:bg-green-700"
									}`}
								>
									{processing === invite.id ? (
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<>
											<CheckCircle2 className="w-4 h-4" />
											<span>Accept & Join</span>
										</>
									)}
								</button>
								<button
									type="button"
									onClick={() => handleDecline(invite.id)}
									disabled={processing === invite.id}
									className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
										processing === invite.id
											? "bg-gray-400 text-gray-200 cursor-not-allowed"
											: darkMode
												? "bg-gray-600 text-gray-300 hover:bg-gray-500"
												: "bg-gray-200 text-gray-700 hover:bg-gray-300"
									}`}
								>
									{processing === invite.id ? (
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										<>
											<XCircle className="w-4 h-4" />
											<span>Decline</span>
										</>
									)}
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
