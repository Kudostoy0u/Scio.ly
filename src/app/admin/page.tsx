"use client";
import logger from "@/lib/utils/logger";

import api from "@/app/api";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import PasswordAuth from "./PasswordAuth";

type EditRow = {
	id: string;
	event: string;
	original: Record<string, unknown>;
	edited: Record<string, unknown>;
	updatedAt: string;
	canLocateTarget?: boolean;
};

type BlacklistRow = {
	id: string;
	event: string;
	question: Record<string, unknown>;
	createdAt: string;
	existsInQuestions?: boolean;
};

type AdminOverview = {
	edits: EditRow[];
	blacklists: BlacklistRow[];
	stats?: {
		totalEdits: number;
		totalRemoved: number;
		editsResolvable: number;
		removedResolvable: number;
		byEvent: Record<string, { edits: number; removed: number }>;
	};
};

function QuestionOptions({
	options,
	answers,
}: {
	options: unknown[];
	answers: unknown[];
}) {
	return (
		<ul className="list-disc ml-5">
			{options.map((o, i) => (
				<li
					key={`option-${i}-${String(o)}`}
					className={
						answers.includes(i) || answers.includes(o)
							? "text-green-600 dark:text-green-400"
							: ""
					}
				>
					{String(o)}
				</li>
			))}
		</ul>
	);
}

function Q({ data }: { data: Record<string, unknown> }) {
	const question = (data.question as string) || "";
	const answers = Array.isArray(data.answers)
		? (data.answers as unknown[])
		: [];
	const options = Array.isArray(data.options)
		? (data.options as unknown[])
		: [];
	const hasOptions = options.length > 0;
	const hasAnswers = answers.length > 0;

	return (
		<div>
			<div className="font-medium break-words whitespace-normal">
				{question}
			</div>
			{hasOptions && (
				<div className="mt-2 text-sm">
					<div className="font-medium">Options</div>
					<QuestionOptions options={options} answers={answers} />
				</div>
			)}
			{!hasOptions && hasAnswers && (
				<div className="mt-2 text-sm">
					Answer: {answers.map((a) => String(a)).join(", ")}
				</div>
			)}
		</div>
	);
}

interface EditRowCardProps {
	row: EditRow;
	darkMode: boolean;
	border: string;
	muted: string;
	busy: Record<string, boolean>;
	onUndo: (id: string) => void;
}

function EditRowCard({
	row,
	darkMode,
	border,
	muted,
	busy,
	onUndo,
}: EditRowCardProps) {
	return (
		<div className={`border ${border} rounded-md p-3`}>
			<div className="text-xs mb-2 ${muted}">
				Updated {new Date(row.updatedAt).toLocaleString()}
			</div>
			<div className="text-xs mb-2 ${muted}">
				Target: {row.canLocateTarget ? "Resolvable" : "Needs manual mapping"}
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div>
					<div className={`${muted} text-sm mb-1`}>Original</div>
					<Q data={row.original} />
				</div>
				<div>
					<div className={`${muted} text-sm mb-1`}>Edited</div>
					<Q data={row.edited} />
				</div>
			</div>
			<div className="mt-3 flex gap-2">
				<button
					type="button"
					onClick={() => onUndo(row.id)}
					disabled={!!busy[row.id]}
					className={`px-3 py-1 rounded-md ${busy[row.id] ? "opacity-50" : darkMode ? "bg-yellow-600 text-white" : "bg-yellow-500 text-white"}`}
				>
					Undo Edit
				</button>
			</div>
		</div>
	);
}

interface EditsTabProps {
	groupedEdits: Record<string, EditRow[]>;
	darkMode: boolean;
	border: string;
	muted: string;
	busy: Record<string, boolean>;
	bulkBusy: Record<string, boolean>;
	bulkMessage: string | null;
	onApplyAll: () => void;
	onUndoAll: () => void;
	onUndo: (id: string) => void;
}

function EditsTab({
	groupedEdits,
	darkMode,
	border,
	muted,
	busy,
	bulkBusy,
	bulkMessage,
	onApplyAll,
	onUndoAll,
	onUndo,
}: EditsTabProps) {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<button
					type="button"
					onClick={onApplyAll}
					disabled={!!bulkBusy.applyAllEdits}
					className={`px-3 py-1 rounded-md ${bulkBusy.applyAllEdits ? "opacity-50" : "bg-blue-600 text-white"}`}
				>
					Apply All Edits
				</button>
				<button
					type="button"
					onClick={onApplyAll}
					disabled={true}
					className="hidden"
				/>
				<button
					type="button"
					onClick={onUndoAll}
					disabled={!!bulkBusy.undoAllEdits}
					className={`px-3 py-1 rounded-md ${bulkBusy.undoAllEdits ? "opacity-50" : darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100"}`}
				>
					Undo All Edits
				</button>
				{bulkMessage && (
					<span className={`text-sm ${muted}`}>{bulkMessage}</span>
				)}
			</div>
			{Object.entries(groupedEdits).map(([event, rows]) => (
				<div key={event} className="border-b pb-4 last:border-b-0">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">{event}</h2>
						<span className={`${muted} text-sm`}>{rows.length} edits</span>
					</div>
					<div className="mt-3 grid md:grid-cols-2 gap-4">
						{rows.map((r) => (
							<EditRowCard
								key={r.id}
								row={r}
								darkMode={darkMode}
								border={border}
								muted={muted}
								busy={busy}
								onUndo={onUndo}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

interface RemovedTabProps {
	groupedRemoved: Record<string, BlacklistRow[]>;
	darkMode: boolean;
	border: string;
	muted: string;
	busy: Record<string, boolean>;
	bulkBusy: Record<string, boolean>;
	bulkMessage: string | null;
	onApplyAll: () => void;
	onRestoreAll: () => void;
	onUndo: (id: string) => void;
}

function RemovedTab({
	groupedRemoved,
	darkMode,
	border,
	muted,
	busy,
	bulkBusy,
	bulkMessage,
	onApplyAll,
	onRestoreAll,
	onUndo,
}: RemovedTabProps) {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-2">
				<button
					type="button"
					onClick={onApplyAll}
					disabled={!!bulkBusy.applyAllRemoved}
					className={`px-3 py-1 rounded-md ${bulkBusy.applyAllRemoved ? "opacity-50" : "bg-blue-600 text-white"}`}
				>
					Apply All Removes
				</button>
				<button
					type="button"
					onClick={onRestoreAll}
					disabled={!!bulkBusy.restoreAllRemoved}
					className={`px-3 py-1 rounded-md ${bulkBusy.restoreAllRemoved ? "opacity-50" : darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100"}`}
				>
					Undo All Removes
				</button>
				{bulkMessage && (
					<span className={`text-sm ${muted}`}>{bulkMessage}</span>
				)}
			</div>
			{Object.entries(groupedRemoved).map(([event, rows]) => (
				<div key={event} className="border-b pb-4 last:border-b-0">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">{event}</h2>
						<span className={`${muted} text-sm`}>{rows.length} removed</span>
					</div>
					<div className="mt-3 grid md:grid-cols-2 gap-4">
						{rows.map((r) => (
							<div key={r.id} className={`border ${border} rounded-md p-3`}>
								<div className="text-xs mb-2 ${muted}">
									Removed {new Date(r.createdAt).toLocaleString()}
								</div>
								<Q data={r.question} />
								<div className="mt-3 flex gap-2">
									<button
										type="button"
										onClick={() => onUndo(r.id)}
										disabled={!!busy[r.id]}
										className={`px-3 py-1 rounded-md ${busy[r.id] ? "opacity-50" : "bg-green-600 text-white"}`}
									>
										Undo Removal
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

export default function AdminPage() {
	const { darkMode } = useTheme();
	const [data, setData] = useState<AdminOverview>({
		edits: [],
		blacklists: [],
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<Record<string, boolean>>({});
	const [tab, setTab] = useState<"edits" | "removed">("edits");
	const [bulkBusy, setBulkBusy] = useState<Record<string, boolean>>({});
	const [bulkMessage, setBulkMessage] = useState<string | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [adminPassword, setAdminPassword] = useState<string>("");

	const bg = darkMode ? "bg-gray-900" : "bg-gray-50";
	const card = darkMode ? "bg-gray-800" : "bg-white";
	const border = darkMode ? "border-gray-700" : "border-gray-200";
	const muted = darkMode ? "text-gray-300" : "text-gray-700";

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(api.admin, {
				headers: {
					"X-Admin-Password": adminPassword,
				},
			});
			const json = await res.json();
			if (!json.success) {
				throw new Error(json.error || "Failed to load");
			}
			setData(json.data as AdminOverview);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}, [adminPassword]);

	const handleAuthenticated = (password: string) => {
		setAdminPassword(password);
		setIsAuthenticated(true);
	};

	useEffect(() => {
		if (isAuthenticated) {
			fetchData();
		}
	}, [isAuthenticated, fetchData]);

	const groupedEdits = useMemo(() => {
		const map: Record<string, EditRow[]> = {};
		for (const r of data.edits) {
			if (r.event) {
				if (!map[r.event]) {
					map[r.event] = [];
				}
				map[r.event]?.push(r);
			}
		}
		return map;
	}, [data.edits]);

	const groupedRemoved = useMemo(() => {
		const map: Record<string, BlacklistRow[]> = {};
		for (const r of data.blacklists) {
			if (r.event) {
				if (!map[r.event]) {
					map[r.event] = [];
				}
				map[r.event]?.push(r);
			}
		}
		return map;
	}, [data.blacklists]);

	const updateDataAfterUndo = useCallback(
		(id: string, action: "undoEdit" | "undoRemove") => {
			if (action === "undoEdit") {
				setData((prev) => ({
					...prev,
					edits: prev.edits.filter((e) => e.id !== id),
				}));
			} else {
				setData((prev) => ({
					...prev,
					blacklists: prev.blacklists.filter((b) => b.id !== id),
				}));
			}
		},
		[],
	);

	const handleUndoAction = useCallback(
		async (id: string, action: "undoEdit" | "undoRemove") => {
			if (busy[id]) {
				return;
			}
			setBusy((prev) => ({ ...prev, [id]: true }));
			try {
				const res = await fetch(api.admin, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Admin-Password": adminPassword,
					},
					body: JSON.stringify({ id, action }),
				});
				const json = await res
					.json()
					.catch(() => ({ success: false, error: "Empty response" }));
				if (!json.success) {
					throw new Error(json.error || "Action failed");
				}

				updateDataAfterUndo(id, action);
				toast.success(json.message || "Success");
			} catch (e) {
				logger.error(e);
				toast.error(e instanceof Error ? e.message : "Action failed");
			} finally {
				setBusy((prev) => ({ ...prev, [id]: false }));
			}
		},
		[adminPassword, busy, updateDataAfterUndo],
	);

	const act = handleUndoAction;

	const handleUndoAllEdits = useCallback(async () => {
		setBulkBusy((prev) => ({ ...prev, undoAllEdits: true }));
		try {
			const res = await fetch(api.admin, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Password": adminPassword,
				},
				body: JSON.stringify({ action: "undoAllEdits" }),
			});
			const json = await res
				.json()
				.catch(() => ({ success: false, error: "Empty response" }));
			if (!json.success) {
				throw new Error(json.error || "Action failed");
			}
			setBulkMessage(json.message || "Done");
			await fetchData();
			toast.success(json.message || "Done");
		} catch (e) {
			setBulkMessage(e instanceof Error ? e.message : "Action failed");
			toast.error(e instanceof Error ? e.message : "Action failed");
		} finally {
			setBulkBusy((prev) => ({ ...prev, undoAllEdits: false }));
		}
	}, [adminPassword, fetchData]);

	const handleRestoreAllRemoved = useCallback(async () => {
		setBulkBusy((prev) => ({ ...prev, restoreAllRemoved: true }));
		try {
			const res = await fetch(api.admin, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Password": adminPassword,
				},
				body: JSON.stringify({ action: "restoreAllRemoved" }),
			});
			const json = await res
				.json()
				.catch(() => ({ success: false, error: "Empty response" }));
			if (!json.success) {
				throw new Error(json.error || "Action failed");
			}
			setBulkMessage(json.message || "Done");
			await fetchData();
			toast.success(json.message || "Done");
		} catch (e) {
			setBulkMessage(e instanceof Error ? e.message : "Action failed");
			toast.error(e instanceof Error ? e.message : "Action failed");
		} finally {
			setBulkBusy((prev) => ({ ...prev, restoreAllRemoved: false }));
		}
	}, [adminPassword, fetchData]);

	const bulk = async (action: "applyAllEdits" | "applyAllRemoved") => {
		if (bulkBusy[action]) {
			return;
		}
		setBulkBusy((prev) => ({ ...prev, [action]: true }));
		try {
			const res = await fetch(api.admin, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Admin-Password": adminPassword,
				},
				body: JSON.stringify({ action }),
			});
			const json = await res
				.json()
				.catch(() => ({ success: false, error: "Empty response" }));
			if (!json.success) {
				throw new Error(json.error || "Action failed");
			}
			await fetchData();
			setBulkMessage(json.message || "Done");
		} catch (e) {
			logger.error(e);
			setBulkMessage(e instanceof Error ? e.message : "Action failed");
		} finally {
			setBulkBusy((prev) => ({ ...prev, [action]: false }));
		}
	};

	if (!isAuthenticated) {
		return <PasswordAuth onAuthenticated={handleAuthenticated} />;
	}

	return (
		<div className={`min-h-screen ${bg}`}>
			<div className="container mx-auto px-4 py-8">
				<div className={`${card} border ${border} rounded-lg p-4 mb-4`}>
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold">Admin</h1>
						<div className="space-x-2">
							<button
								type="button"
								className={`px-3 py-1 rounded-md ${tab === "edits" ? "bg-blue-600 text-white" : darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100"}`}
								onClick={() => setTab("edits")}
							>
								Edits
							</button>
							<button
								type="button"
								className={`px-3 py-1 rounded-md ${tab === "removed" ? "bg-blue-600 text-white" : darkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100"}`}
								onClick={() => setTab("removed")}
							>
								Removed
							</button>
						</div>
					</div>
					{data.stats && (
						<div className={"mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3"}>
							<div
								className={`${darkMode ? "bg-gray-700" : "bg-gray-100"} rounded-md p-3`}
							>
								<div className={`text-sm ${muted}`}>Total Edits</div>
								<div className="text-xl font-semibold">
									{data.stats.totalEdits}
								</div>
							</div>
							<div
								className={`${darkMode ? "bg-gray-700" : "bg-gray-100"} rounded-md p-3`}
							>
								<div className={`text-sm ${muted}`}>Resolvable Edits</div>
								<div className="text-xl font-semibold">
									{data.stats.editsResolvable}
								</div>
							</div>
							<div
								className={`${darkMode ? "bg-gray-700" : "bg-gray-100"} rounded-md p-3`}
							>
								<div className={`text-sm ${muted}`}>Removed Records</div>
								<div className="text-xl font-semibold">
									{data.stats.totalRemoved}
								</div>
							</div>
							<div
								className={`${darkMode ? "bg-gray-700" : "bg-gray-100"} rounded-md p-3`}
							>
								<div className={`text-sm ${muted}`}>Resolvable Removed</div>
								<div className="text-xl font-semibold">
									{data.stats.removedResolvable}
								</div>
							</div>
						</div>
					)}
				</div>

				{loading ? (
					<div className={`${card} border ${border} rounded-lg p-6`}>
						Loading...
					</div>
				) : error ? (
					<div
						className={`${card} border ${border} rounded-lg p-6 text-red-600`}
					>
						{error}
					</div>
				) : (
					<div className={`${card} border ${border} rounded-lg p-4`}>
						{tab === "edits" && (
							<EditsTab
								groupedEdits={groupedEdits}
								darkMode={darkMode}
								border={border}
								muted={muted}
								busy={busy}
								bulkBusy={bulkBusy}
								bulkMessage={bulkMessage}
								onApplyAll={() => bulk("applyAllEdits")}
								onUndoAll={handleUndoAllEdits}
								onUndo={(id) => act(id, "undoEdit")}
							/>
						)}

						{tab === "removed" && (
							<RemovedTab
								groupedRemoved={groupedRemoved}
								darkMode={darkMode}
								border={border}
								muted={muted}
								busy={busy}
								bulkBusy={bulkBusy}
								bulkMessage={bulkMessage}
								onApplyAll={() => bulk("applyAllRemoved")}
								onRestoreAll={handleRestoreAllRemoved}
								onUndo={(id) => act(id, "undoRemove")}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
