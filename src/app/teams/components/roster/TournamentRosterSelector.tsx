"use client";

import {
	Archive,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Eye,
	EyeOff,
	Pencil,
	Plus,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";

type TournamentRosterStatus = "active" | "inactive" | "archived";

export interface TournamentRoster {
	id: string;
	name: string;
	status: TournamentRosterStatus;
	createdAt: string;
	updatedAt: string;
	archivedAt?: string | null;
	isPublic?: boolean | null;
}

interface TournamentRosterSelectorProps {
	darkMode: boolean;
	rosters: TournamentRoster[];
	archivedRosters: TournamentRoster[];
	selectedRosterId: string | null;
	onSelectRoster: (rosterId: string) => void;
	onCreateRoster?: () => void;
	onRenameRoster?: (rosterId: string, name: string) => void;
	onPromoteRoster?: (rosterId: string) => void;
	onArchiveRoster?: (rosterId: string) => void;
	onRestoreRoster?: (rosterId: string) => void;
	onDeleteRoster?: (rosterId: string) => void;
	onSetRosterPublic?: (rosterId: string, isPublic: boolean) => void;
	readOnly?: boolean;
	showHelperText?: boolean;
	showCreate?: boolean;
	defaultShowArchived?: boolean;
	showPublicBadge?: boolean;
	collapsed?: boolean;
	onToggleCollapsed?: () => void;
}

export default function TournamentRosterSelector({
	darkMode,
	rosters,
	archivedRosters,
	selectedRosterId,
	onSelectRoster,
	onCreateRoster,
	onRenameRoster,
	onPromoteRoster,
	onArchiveRoster,
	onRestoreRoster,
	onDeleteRoster,
	onSetRosterPublic,
	readOnly = false,
	showHelperText = true,
	showCreate = true,
	defaultShowArchived = false,
	showPublicBadge = false,
	collapsed = false,
	onToggleCollapsed,
}: TournamentRosterSelectorProps) {
	const [editingRosterId, setEditingRosterId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");
	const [showArchived, setShowArchived] = useState(defaultShowArchived);

	const handleStartEdit = (roster: TournamentRoster) => {
		setEditingRosterId(roster.id);
		setEditingName(roster.name);
	};

	const handleCommitEdit = () => {
		if (!editingRosterId) {
			return;
		}
		const trimmed = editingName.trim();
		if (!trimmed) {
			return;
		}
		const existing = [...rosters, ...archivedRosters].find(
			(roster) => roster.id === editingRosterId,
		);
		if (existing && existing.name === trimmed) {
			setEditingRosterId(null);
			setEditingName("");
			return;
		}
		if (onRenameRoster) {
			onRenameRoster(editingRosterId, trimmed);
		}
		setEditingRosterId(null);
		setEditingName("");
	};

	const rosterCardClasses = (rosterId: string) => {
		const isSelected = rosterId === selectedRosterId;
		return `flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 min-w-[220px] transition-all ${
			isSelected
				? darkMode
					? "bg-emerald-950/30 border-emerald-500 text-emerald-200"
					: "bg-emerald-50 border-emerald-500 text-emerald-800"
				: darkMode
					? "bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800"
					: "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
		}`;
	};

	const IconButton = ({
		label,
		onClick,
		className,
		children,
	}: {
		label: string;
		onClick: (event: MouseEvent<HTMLButtonElement>) => void;
		className: string;
		children: ReactNode;
	}) => (
		<div className="relative group">
			<button
				type="button"
				onClick={onClick}
				className={className}
				aria-label={label}
				title={label}
			>
				{children}
			</button>
			<div
				className={`absolute right-full top-1/2 -translate-y-1/2 mr-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
					darkMode
						? "bg-gray-800 text-white border border-gray-700"
						: "bg-white text-gray-900 border border-gray-200 shadow-lg"
				}`}
			>
				{label}
				<div
					className={`absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 ${
						darkMode ? "border-l-gray-800" : "border-l-white"
					}`}
				/>
			</div>
		</div>
	);

	const IconBadge = ({
		label,
		className,
		children,
	}: {
		label: string;
		className: string;
		children: ReactNode;
	}) => (
		<div className="relative group">
			<span className={className} aria-label={label} title={label}>
				{children}
			</span>
			<div
				className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
					darkMode
						? "bg-gray-800 text-white border border-gray-700"
						: "bg-white text-gray-900 border border-gray-200 shadow-lg"
				}`}
			>
				{label}
				<div
					className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
						darkMode ? "border-t-gray-800" : "border-t-white"
					}`}
				/>
			</div>
		</div>
	);

	return (
		<div
			className={`relative rounded-xl border p-4 ${darkMode ? "border-gray-700 bg-gray-900/40" : "border-gray-200 bg-white"}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div
						className={`text-sm font-semibold uppercase tracking-wide ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						Tournament Rosters
					</div>
					{showHelperText && (
						<div
							className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							Active roster is the only one visible to team members.
						</div>
					)}
				</div>
				<div className="flex items-center gap-2">
					{showCreate && onCreateRoster && (
						<button
							type="button"
							onClick={onCreateRoster}
							className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
								darkMode
									? "bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30"
									: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
							}`}
						>
							<Plus className="h-4 w-4" />
							Add roster
						</button>
					)}
					<button
						type="button"
						onClick={() => setShowArchived((prev) => !prev)}
						className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
							darkMode
								? "bg-gray-800 text-gray-200 hover:bg-gray-700"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						{showArchived ? "Hide Archived" : "Show Archived"} (
						{archivedRosters.length})
						{showArchived ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
					</button>
				</div>
			</div>

			<div className="mt-4 flex flex-wrap gap-3">
				{rosters.map((roster) => {
					const isActive = roster.status === "active";
					const isSelected = roster.id === selectedRosterId;
					return (
						<div key={roster.id} className={rosterCardClasses(roster.id)}>
							{editingRosterId === roster.id ? (
								<div className="flex flex-1 items-center gap-3">
									<span
										className={`h-2.5 w-2.5 rounded-full ${
											isActive ? "bg-emerald-500" : "bg-yellow-400"
										}`}
										aria-label={isActive ? "Active roster" : "Inactive roster"}
									/>
									<div className="flex flex-col">
										<input
											type="text"
											value={editingName}
											onChange={(event) => setEditingName(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === "Escape") {
													setEditingRosterId(null);
													setEditingName("");
													return;
												}
												if (event.key === "Enter") {
													event.preventDefault();
													handleCommitEdit();
												}
											}}
											className={`rounded-md border px-2 py-1 text-sm ${
												darkMode
													? "border-gray-600 bg-gray-900 text-gray-100"
													: "border-gray-300 bg-white text-gray-800"
											}`}
										/>
										<span className="text-xs">
											{isActive ? "Active" : "Inactive"}
										</span>
									</div>
								</div>
							) : (
								<button
									type="button"
									onClick={() => onSelectRoster(roster.id)}
									className="flex flex-1 items-center gap-3 text-left"
								>
									<span
										className={`h-2.5 w-2.5 rounded-full ${
											isActive ? "bg-emerald-500" : "bg-yellow-400"
										}`}
										aria-label={isActive ? "Active roster" : "Inactive roster"}
									/>
									<div className="flex flex-col">
										<span
											className={`text-sm font-semibold ${
												isSelected
													? darkMode
														? "text-emerald-100"
														: "text-emerald-800"
													: ""
											}`}
										>
											{roster.name}
										</span>
										<span className="text-xs">
											{isActive ? "Active" : "Inactive"}
										</span>
									</div>
								</button>
							)}
							<div className="flex items-center gap-2">
								{!readOnly && editingRosterId === roster.id ? (
									<IconButton
										label="Save roster name"
										onClick={(event) => {
											event.stopPropagation();
											handleCommitEdit();
										}}
										className={`inline-flex items-center justify-center rounded-md p-1 ${
											darkMode
												? "text-emerald-200 hover:bg-emerald-600/30"
												: "text-emerald-700 hover:bg-emerald-100"
										}`}
									>
										<CheckCircle2 className="h-4 w-4" />
									</IconButton>
								) : readOnly ? null : (
									<>
										<IconButton
											label="Rename roster"
											onClick={(event) => {
												event.stopPropagation();
												handleStartEdit(roster);
											}}
											className={`inline-flex items-center justify-center rounded-md p-1 ${
												darkMode
													? "text-gray-300 hover:bg-gray-700"
													: "text-gray-600 hover:bg-gray-100"
											}`}
										>
											<Pencil className="h-4 w-4" />
										</IconButton>
										{!isActive && (
											<IconButton
												label="Promote roster to active"
												onClick={(event) => {
													event.stopPropagation();
													onPromoteRoster?.(roster.id);
												}}
												className={`inline-flex items-center justify-center rounded-md p-1 ${
													darkMode
														? "text-emerald-200 hover:bg-emerald-600/30"
														: "text-emerald-700 hover:bg-emerald-100"
												}`}
											>
												<CheckCircle2 className="h-4 w-4" />
											</IconButton>
										)}
										{!isActive && (
											<IconButton
												label="Archive roster"
												onClick={(event) => {
													event.stopPropagation();
													onArchiveRoster?.(roster.id);
												}}
												className={`inline-flex items-center justify-center rounded-md p-1 ${
													darkMode
														? "text-yellow-200 hover:bg-yellow-600/20"
														: "text-yellow-600 hover:bg-yellow-100"
												}`}
											>
												<Archive className="h-4 w-4" />
											</IconButton>
										)}
									</>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{showArchived && (
				<div className="mt-4">
					<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
						Archived rosters
					</div>
					{archivedRosters.length === 0 ? (
						<div
							className={`mt-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
						>
							No archived rosters yet.
						</div>
					) : (
						<div className="mt-3 flex flex-wrap gap-3">
							{archivedRosters.map((roster) => (
								<div key={roster.id} className={rosterCardClasses(roster.id)}>
									<button
										type="button"
										onClick={() => onSelectRoster(roster.id)}
										className="flex flex-1 items-center gap-3 text-left"
									>
										<span
											className={`h-2.5 w-2.5 rounded-full ${
												darkMode ? "bg-orange-400" : "bg-orange-500"
											}`}
											aria-label="Archived roster"
										/>
										<div className="flex flex-col">
											<span className="text-sm font-semibold">
												{roster.name}
											</span>
											<span className="text-xs">Archived</span>
										</div>
									</button>
									<div className="flex items-center gap-2">
										{showPublicBadge && roster.isPublic ? (
											<IconBadge
												label="Public roster"
												className={`inline-flex items-center justify-center rounded-md p-1 ${
													darkMode ? "text-amber-200" : "text-amber-600"
												}`}
											>
												<Eye className="h-4 w-4" />
											</IconBadge>
										) : null}
										{!readOnly && onSetRosterPublic && (
											<IconButton
												label={
													roster.isPublic
														? "Hide from members"
														: "Show to members"
												}
												onClick={() =>
													onSetRosterPublic(roster.id, !roster.isPublic)
												}
												className={`inline-flex items-center justify-center rounded-md p-1 ${
													darkMode
														? "text-amber-200 hover:bg-amber-600/20"
														: "text-amber-600 hover:bg-amber-100"
												}`}
											>
												{roster.isPublic ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</IconButton>
										)}
										{!readOnly && onRestoreRoster && (
											<IconButton
												label="Restore roster"
												onClick={() => onRestoreRoster(roster.id)}
												className={`inline-flex items-center justify-center rounded-md p-1 ${
													darkMode
														? "text-blue-200 hover:bg-blue-600/30"
														: "text-blue-700 hover:bg-blue-100"
												}`}
											>
												<RotateCcw className="h-4 w-4" />
											</IconButton>
										)}
										{!readOnly && onDeleteRoster && (
											<IconButton
												label="Delete roster"
												onClick={() => onDeleteRoster(roster.id)}
												className={`inline-flex items-center justify-center rounded-md p-1 ${
													darkMode
														? "text-rose-200 hover:bg-rose-600/30"
														: "text-rose-700 hover:bg-rose-100"
												}`}
											>
												<Trash2 className="h-4 w-4" />
											</IconButton>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{onToggleCollapsed && (
				<div className="absolute bottom-3 right-3">
					<IconButton
						label={collapsed ? "Move to top" : "Move to bottom"}
						onClick={(event) => {
							event.stopPropagation();
							onToggleCollapsed();
						}}
						className={`inline-flex items-center justify-center rounded-md p-1 ${
							darkMode
								? "text-gray-300 hover:bg-gray-800"
								: "text-gray-600 hover:bg-gray-100"
						}`}
					>
						<ChevronDown
							className={`h-4 w-4 transition-transform ${
								collapsed ? "rotate-180" : ""
							}`}
						/>
					</IconButton>
				</div>
			)}
		</div>
	);
}
