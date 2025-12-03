"use client";
import type { Question } from "@/app/utils/geminiService";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AssignPage() {
	const params = useSearchParams();
	const router = useRouter();
	const eventName = params.get("event") || "";
	const scope = params.get("scope") || "all";
	const teamId = params.get("team") || "A";
	const [questionCount, setQuestionCount] = useState<number>(10);
	const [timeLimit, setTimeLimit] = useState<number>(30);
	const [types, setTypes] = useState<
		"multiple-choice" | "free-response" | "both"
	>("multiple-choice");
	const [division, setDivision] = useState<"B" | "C" | "any">(() => {
		try {
			const selStr = SyncLocalStorage.getItem("teamsSelection");
			if (selStr) {
				const sel = JSON.parse(selStr);
				if (sel?.division === "B" || sel?.division === "C") {
					return sel.division;
				}
			}
		} catch {
			// Ignore localStorage parse errors
		}
		return "any";
	});
	const [subtopics, setSubtopics] = useState<string>("");
	const [preview, setPreview] = useState<Question[]>([]);
	const [loadingPreview, setLoadingPreview] = useState(false);
	const [sending, setSending] = useState(false);

	useEffect(() => {
		const load = async () => {
			setLoadingPreview(true);
			try {
				const sp = new URLSearchParams();
				sp.set("event", eventName);
				sp.set("limit", String(questionCount));
				if (types === "multiple-choice") {
					sp.set("question_type", "mcq");
				}
				if (types === "free-response") {
					sp.set("question_type", "frq");
				}
				if (division && division !== "any") {
					sp.set("division", division);
				}
				if (subtopics.trim()) {
					sp.set("subtopics", subtopics.trim());
				}
				const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
				const res = await fetch(`${origin}/api/questions?${sp.toString()}`, {
					cache: "no-store",
				});
				if (res.ok) {
					const json = await res.json();
					const questions = Array.isArray(json.data)
						? json.data
						: json.data?.questions || [];
					const valid = questions.filter(
						(q: Question) =>
							q.answers && Array.isArray(q.answers) && q.answers.length > 0,
					);
					setPreview(valid.slice(0, questionCount));
				}
			} catch {
				// Ignore preview load errors
			}
			setLoadingPreview(false);
		};
		if (eventName) {
			load();
		}
	}, [eventName, questionCount, types, division, subtopics]);

	const replaceQuestion = async (idx: number) => {
		try {
			const sp = new URLSearchParams();
			sp.set("event", eventName);
			sp.set("limit", "1");
			if (types === "multiple-choice") {
				sp.set("question_type", "mcq");
			}
			if (types === "free-response") {
				sp.set("question_type", "frq");
			}
			if (division && division !== "any") {
				sp.set("division", division);
			}
			if (subtopics.trim()) {
				sp.set("subtopics", subtopics.trim());
			}
			const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "";
			const res = await fetch(`${origin}/api/questions?${sp.toString()}`, {
				cache: "no-store",
			});
			const json = await res.json();
			const q = (
				Array.isArray(json.data) ? json.data : json.data?.questions || []
			)[0];
			setPreview((prev) => {
				const copy = prev.slice();
				if (q) {
					copy[idx] = q;
				}
				return copy;
			});
		} catch {
			// Ignore localStorage errors
		}
	};

	const sendAssignment = async () => {
		setSending(true);
		try {
			const selectionStr = SyncLocalStorage.getItem("teamsSelection");
			const sel = selectionStr ? JSON.parse(selectionStr) : null;
			const school = sel?.school;
			const divisionSel = sel?.division;
			if (!(school && divisionSel)) {
				return;
			}
			const assignees = scope === "all" ? [{ name: "ALL" }] : [{ name: scope }];
			const params = {
				eventName,
				questionCount,
				timeLimit,
				types,
				division,
				subtopics: subtopics
					? subtopics
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean)
					: [],
			};
			const res = await fetch("/api/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					school,
					division: divisionSel,
					teamId,
					eventName,
					assignees,
					params,
					questions: preview,
				}),
			});
			if (res.ok) {
				const json = await res.json();
				const assignmentId = json?.data?.id;
				if (assignmentId) {
					SyncLocalStorage.setItem("currentAssignmentId", String(assignmentId));
				}
				// Launch the test page with configured params
				const sp = new URLSearchParams();
				sp.set("event", eventName);
				sp.set("questionCount", String(questionCount));
				sp.set("timeLimit", String(timeLimit));
				sp.set("types", types);
				sp.set("division", division);
				if (subtopics.trim()) {
					sp.set("subtopics", subtopics.trim());
				}
				router.push(`/test?${sp.toString()}`);
			}
		} catch {
			// Ignore assignment creation errors
		}
		setSending(false);
	};

	return (
		<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<div className="mb-4">
				<h1 className="text-2xl font-bold">Assign Test: {eventName}</h1>
				<div className="text-sm text-gray-600">
					Team {teamId} — Scope: {scope}
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<div className="border rounded p-3">
					<div className="font-medium mb-2">Parameters</div>
					<div className="space-y-2 text-sm">
						<div className="flex gap-2 items-center">
							<label htmlFor="question-count" className="w-32">
								Question Count
							</label>
							<input
								id="question-count"
								type="number"
								value={questionCount}
								onChange={(e) =>
									setQuestionCount(
										Math.max(1, Math.min(200, Number(e.target.value || 0))),
									)
								}
								className="border rounded px-2 py-1 w-24"
							/>
						</div>
						<div className="flex gap-2 items-center">
							<label htmlFor="time-limit" className="w-32">
								Time Limit (min)
							</label>
							<input
								id="time-limit"
								type="number"
								value={timeLimit}
								onChange={(e) =>
									setTimeLimit(
										Math.max(1, Math.min(180, Number(e.target.value || 0))),
									)
								}
								className="border rounded px-2 py-1 w-24"
							/>
						</div>
						<div className="flex gap-2 items-center">
							<label htmlFor="types" className="w-32">
								Types
							</label>
							<select
								id="types"
								value={types}
								onChange={(e) => {
									const value = e.target.value;
									if (
										value === "multiple-choice" ||
										value === "free-response" ||
										value === "both"
									) {
										setTypes(value);
									}
								}}
								className="border rounded px-2 py-1"
							>
								<option value="multiple-choice">Multiple Choice</option>
								<option value="free-response">Free Response</option>
								<option value="both">Both</option>
							</select>
						</div>
						<div className="flex gap-2 items-center">
							<label htmlFor="division" className="w-32">
								Division
							</label>
							<select
								id="division"
								value={division}
								onChange={(e) => {
									const value = e.target.value;
									if (value === "B" || value === "C" || value === "any") {
										setDivision(value);
									}
								}}
								className="border rounded px-2 py-1"
							>
								<option value="any">Any</option>
								<option value="B">B</option>
								<option value="C">C</option>
							</select>
						</div>
						<div className="flex gap-2 items-center">
							<label htmlFor="subtopics" className="w-32">
								Subtopics
							</label>
							<input
								id="subtopics"
								value={subtopics}
								onChange={(e) => setSubtopics(e.target.value)}
								placeholder="comma,separated"
								className="border rounded px-2 py-1 flex-1"
							/>
						</div>
					</div>
				</div>
				<div className="border rounded p-3">
					<div className="font-medium mb-2">Preview ({preview.length})</div>
					<div className="space-y-2 max-h-80 overflow-auto">
						{loadingPreview ? (
							<div>Loading…</div>
						) : (
							preview.map((q, idx) => (
								<div
									key={`preview-${idx}-${String(q.question).slice(0, 20)}`}
									className="border rounded p-2"
								>
									<div className="text-sm font-medium mb-1">Q{idx + 1}</div>
									<div className="text-sm mb-2">
										{q.question || "Untitled question"}
									</div>
									<button
										type="button"
										onClick={() => replaceQuestion(idx)}
										className="text-xs px-2 py-1 rounded border"
									>
										Replace
									</button>
								</div>
							))
						)}
					</div>
				</div>
			</div>
			<div className="flex justify-end">
				<button
					type="button"
					disabled={sending}
					onClick={sendAssignment}
					className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
				>
					Send
				</button>
			</div>
		</div>
	);
}
