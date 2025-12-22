import {
	createAssignment,
	generateQuestions,
	getAvailableEvents,
	getEventCapabilitiesForEvent,
	getEventSubtopics,
	validateAssignmentDetails,
	validateQuestionGeneration,
	validateRosterSelection,
} from "@/app/teams/components/assignment/assignmentUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the external dependencies
vi.mock("@/lib/utils/assessments/eventConfig", () => ({
	getEventCapabilities: vi.fn(() => ({
		supportsPictureQuestions: false,
		supportsIdentificationOnly: false,
	})),
}));

vi.mock("@/lib/constants/events2026", () => ({
	EVENTS_2026: [
		{
			name: "Test Event 1",
			subtopics: ["Subtopic 1", "Subtopic 2"],
		},
		{
			name: "Test Event 2",
			subtopics: ["Subtopic 3", "Subtopic 4"],
		},
	],
}));

// Mock fetch
global.fetch = vi.fn();

describe("assignmentUtils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(global.fetch as ReturnType<typeof vi.fn>).mockClear();
	});

	describe("getAvailableEvents", () => {
		it("should return list of available events", () => {
			const events = getAvailableEvents();
			expect(events).toEqual(["Test Event 1", "Test Event 2"]);
		});
	});

	describe("getEventSubtopics", () => {
		it("should return subtopics for existing event", async () => {
			// Mock fetch for API call
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: ["Subtopic 1", "Subtopic 2"],
				}),
			});

			const subtopics = await getEventSubtopics("Test Event 1");
			expect(subtopics).toEqual(["Subtopic 1", "Subtopic 2"]);
		});

		it("should return subtopics for mapped event (Water Quality)", async () => {
			// Mock fetch for API call with mapped event name
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: ["Freshwater Subtopic 1", "Freshwater Subtopic 2"],
				}),
			});

			const subtopics = await getEventSubtopics("Water Quality");
			expect(subtopics).toEqual([
				"Freshwater Subtopic 1",
				"Freshwater Subtopic 2",
			]);

			// Verify it called the API with the mapped event name
			expect(fetch).toHaveBeenCalledWith(
				"/api/meta/subtopics?event=Water%20Quality%20-%20Freshwater",
			);
		});

		it("should return subtopics for mapped event (Dynamic Planet)", async () => {
			// Mock fetch for API call with mapped event name
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: ["Oceanography Subtopic 1", "Oceanography Subtopic 2"],
				}),
			});

			const subtopics = await getEventSubtopics("Dynamic Planet");
			expect(subtopics).toEqual([
				"Oceanography Subtopic 1",
				"Oceanography Subtopic 2",
			]);

			// Verify it called the API with the mapped event name
			expect(fetch).toHaveBeenCalledWith(
				"/api/meta/subtopics?event=Dynamic%20Planet%20-%20Oceanography",
			);
		});

		it("should return combined subtopics for Anatomy & Physiology", async () => {
			// Mock fetch for all three anatomy events
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						success: true,
						data: ["Endocrine Subtopic 1", "Endocrine Subtopic 2"],
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						success: true,
						data: ["Nervous Subtopic 1", "Nervous Subtopic 2"],
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						success: true,
						data: ["Sense Organs Subtopic 1", "Sense Organs Subtopic 2"],
					}),
				});

			const subtopics = await getEventSubtopics("Anatomy & Physiology");
			expect(subtopics).toEqual([
				"Endocrine Subtopic 1",
				"Endocrine Subtopic 2",
				"Nervous Subtopic 1",
				"Nervous Subtopic 2",
				"Sense Organs Subtopic 1",
				"Sense Organs Subtopic 2",
			]);
		});

		it("should return empty array for non-existing event", async () => {
			// Mock fetch for API call
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true, data: [] }),
			});

			const subtopics = await getEventSubtopics("Non-existing Event");
			expect(subtopics).toEqual([]);
		});
	});

	describe("getEventCapabilitiesForEvent", () => {
		it("should return event capabilities", () => {
			const capabilities = getEventCapabilitiesForEvent("Test Event 1");
			expect(capabilities).toEqual({
				supportsPictureQuestions: false,
				supportsIdentificationOnly: false,
			});
		});
	});

	describe("generateQuestions", () => {
		it("should generate questions successfully", async () => {
			const mockQuestions = [
				{
					question_text: "Test question?",
					question_type: "multiple_choice",
					points: 10,
					order_index: 1,
				},
			];

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ questions: mockQuestions }),
			});

			const questions = await generateQuestions(
				"Test Event 1",
				5,
				"both",
				2,
				false,
				"team123",
				["any"],
				undefined,
				["Subtopic 1"],
			);

			expect(questions).toEqual(mockQuestions);
			expect(fetch).toHaveBeenCalledWith(
				"/api/teams/team123/assignments/generate-questions",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						event_name: "Test Event 1",
						question_count: 5,
						question_types: ["multiple_choice", "free_response"],
						subtopics: ["Subtopic 1"],
						id_percentage: 40, // 2 out of 5 questions = 40%
						pure_id_only: false,
						supports_picture_questions: false,
						supports_identification_only: false,
						difficulties: ["any"],
					}),
				},
			);
		});

		it("should throw error when API call fails", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
			});

			await expect(
				generateQuestions("Test Event 1", 5, "both", 0, false, "team123"),
			).rejects.toThrow("Failed to generate questions");
		});
	});

	describe("createAssignment", () => {
		it("should create assignment for team", async () => {
			const mockAssignment = { id: "assignment123", title: "Test Assignment" };
			const assignmentData = {
				title: "Test Assignment",
				description: "Test Description",
				assignment_type: "homework",
				due_date: "2023-12-31",
				points: 100,
				time_limit_minutes: 30,
				event_name: "Test Event 1",
				questions: [],
				roster_members: ["John Doe"],
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockAssignment,
			});

			const result = await createAssignment(
				"team123",
				undefined,
				assignmentData,
			);

			expect(result).toEqual(mockAssignment);
			expect(fetch).toHaveBeenCalledWith("/api/teams/team123/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(assignmentData),
			});
		});

		it("should create assignment for subteam", async () => {
			const mockAssignment = { id: "assignment123", title: "Test Assignment" };
			const assignmentData = {
				title: "Test Assignment",
				description: "Test Description",
				assignment_type: "homework",
				due_date: "2023-12-31",
				points: 100,
				time_limit_minutes: 30,
				event_name: "Test Event 1",
				questions: [],
				roster_members: ["John Doe"],
			};

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockAssignment,
			});

			const result = await createAssignment(
				"team123",
				"subteam456",
				assignmentData,
			);

			expect(result).toEqual(mockAssignment);
			expect(fetch).toHaveBeenCalledWith(
				"/api/teams/team123/subteams/subteam456/assignments",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(assignmentData),
				},
			);
		});

		it("should throw error when API call fails", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
			});

			const assignmentData = {
				title: "Test Assignment",
				description: "Test Description",
				assignment_type: "homework",
				due_date: "2023-12-31",
				points: 100,
				time_limit_minutes: 30,
				event_name: "Test Event 1",
				questions: [],
				roster_members: ["John Doe"],
			};

			await expect(
				createAssignment("team123", undefined, assignmentData),
			).rejects.toThrow("Failed to create assignment");
		});
	});

	describe("validation functions", () => {
		describe("validateAssignmentDetails", () => {
			it("should return null for valid details", () => {
				const result = validateAssignmentDetails({
					title: "Test Assignment",
					eventName: "Test Event 1",
				});
				expect(result).toBeNull();
			});

			it("should return error for missing title", () => {
				const result = validateAssignmentDetails({
					title: "",
					eventName: "Test Event 1",
				});
				expect(result).toBe("Title is required to proceed");
			});

			it("should return error for missing event name", () => {
				const result = validateAssignmentDetails({
					title: "Test Assignment",
					eventName: "",
				});
				expect(result).toBe("Event selection is required to proceed");
			});
		});

		describe("validateQuestionGeneration", () => {
			it("should return null for valid settings", () => {
				const result = validateQuestionGeneration({
					questionCount: 10,
					questionType: "both",
				});
				expect(result).toBeNull();
			});

			it("should return error for invalid question count", () => {
				const result = validateQuestionGeneration({
					questionCount: 0,
					questionType: "both",
				});
				expect(result).toBe("Question count must be between 1 and 50");
			});

			it("should return error for too many questions", () => {
				const result = validateQuestionGeneration({
					questionCount: 100,
					questionType: "both",
				});
				expect(result).toBe("Question count must be between 1 and 50");
			});
		});

		describe("validateRosterSelection", () => {
			it("should return null for valid selection", () => {
				const result = validateRosterSelection(["John Doe", "Jane Smith"]);
				expect(result).toBeNull();
			});

			it("should return error for empty selection", () => {
				const result = validateRosterSelection([]);
				expect(result).toBe("Please select at least one roster member");
			});
		});
	});
});
