"use client";
import logger from "@/lib/utils/logger";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { handleCareersSubmission } from "@/app/utils/careersUtils";
import {
	Briefcase,
	Clock,
	GraduationCap,
	Mail,
	MessageCircle,
	Send,
	User,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "react-toastify";

const WORD_SPLIT_REGEX = /\s+/;

interface JoinFormData {
	name: string;
	email: string;
	discordId: string;
	position: string;
	hoursPerWeek: string;
	experience: string;
	message: string;
}

export default function JoinClientPage() {
	const { darkMode } = useTheme();
	const [formData, setFormData] = useState<JoinFormData>({
		name: "",
		email: "",
		discordId: "",
		position: "",
		hoursPerWeek: "",
		experience: "",
		message: "",
	});
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!(
				formData.name.trim() &&
				formData.email.trim() &&
				formData.discordId.trim() &&
				formData.position.trim() &&
				formData.hoursPerWeek.trim() &&
				formData.message.trim()
			)
		) {
			toast.error("Please fill in all required fields");
			return;
		}
		setLoading(true);
		try {
			const result = await handleCareersSubmission(formData);
			if (result.success) {
				toast.success(result.message);
				setFormData({
					name: "",
					email: "",
					discordId: "",
					position: "",
					hoursPerWeek: "",
					experience: "",
					message: "",
				});
			} else {
				toast.error(result.message);
			}
		} catch (error) {
			logger.error("Careers form error:", error);
			toast.error("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof JoinFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const countWords = (text: string) => {
		return text.trim() === "" ? 0 : text.trim().split(WORD_SPLIT_REGEX).length;
	};

	const experienceWordCount = countWords(formData.experience);
	const messageWordCount = countWords(formData.message);

	return (
		<div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
			<Header />
			{/* Global ToastContainer handles notifications */}
			<div className="pt-32 px-4 sm:px-6 lg:px-8">
				<div className="max-w-2xl mx-auto">
					<div className="mb-8">
						<h1
							className={`text-3xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							Join Our Team
						</h1>
						<p className={`${darkMode ? "text-gray-400" : "text-gray-600"}`}>
							Become a Scio.ly developer! Join a team of highly motivated high
							school and college students working on a site that thousands of
							competitors use every day.{" "}
							<span className="font-semibold">
								Better Science Olympiad practice, for everyone.
							</span>
						</p>
					</div>
					<div
						className={`${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"} rounded-lg p-6`}
					>
						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label
									htmlFor="name"
									className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									<User className="w-4 h-4" />
									Full Name *
								</label>
								<input
									id="name"
									type="text"
									value={formData.name}
									onChange={(e) => handleInputChange("name", e.target.value)}
									placeholder="Your full name"
									className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"}`}
									required={true}
								/>
							</div>
							<div>
								<label
									htmlFor="email"
									className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									<Mail className="w-4 h-4" />
									Email *
								</label>
								<input
									id="email"
									type="email"
									value={formData.email}
									onChange={(e) => handleInputChange("email", e.target.value)}
									placeholder="your.email@example.com"
									className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"}`}
									required={true}
								/>
							</div>
							<div>
								<label
									htmlFor="discordId"
									className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									<MessageCircle className="w-4 h-4" />
									Preferred communication medium
								</label>
								<input
									id="discordId"
									type="text"
									value={formData.discordId}
									onChange={(e) =>
										handleInputChange("discordId", e.target.value)
									}
									placeholder="For example: Text messages, 123-456-7890"
									className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"}`}
									required={false}
								/>
								<p
									className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-400"}`}
								>
									How should we communicate with you day-to-day? A Discord handle is preferred but not required!
								</p>
							</div>
							<div>
								<label
									htmlFor="position"
									className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									<Briefcase className="w-4 h-4" />
									Position of Interest *
								</label>
								<select
									id="position"
									value={formData.position}
									onChange={(e) =>
										handleInputChange("position", e.target.value)
									}
									className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
									required={true}
								>
									<option value="">Select a position</option>
									<option value="Marketing">Marketing</option>
									<option value="Development">Development</option>
									<option value="Content Creation">Content Creation</option>
									<option value="Community Management">
										Community Management
									</option>
									<option value="UI/UX Design">UI/UX Design</option>
									<option value="Other">Other</option>
								</select>
							</div>
							<div>
								<label
									htmlFor="hoursPerWeek"
									className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									<Clock className="w-4 h-4" />
									Hours Able to Contribute per Week *
								</label>
								<select
									id="hoursPerWeek"
									value={formData.hoursPerWeek}
									onChange={(e) =>
										handleInputChange("hoursPerWeek", e.target.value)
									}
									className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
									required={true}
								>
									<option value="">Select hours per week</option>
									<option value="1-2 hours">1-2 hours</option>
									<option value="3-4 hours">3-4 hours</option>
									<option value="5-9 hours">5-9 hours</option>
									<option value="10+ hours">10+ hours</option>
								</select>
							</div>
							<div>
								<label
									htmlFor="experience"
									className={`flex items-center gap-2 text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									<GraduationCap className="w-4 h-4" />
									Relevant Experience
								</label>
								<textarea
									id="experience"
									value={formData.experience}
									onChange={(e) => {
										const text = e.target.value;
										if (countWords(text) <= 50) {
											handleInputChange("experience", text);
										}
									}}
									placeholder="Tell us about your relevant experience, skills, and background... (50 words max)"
									rows={4}
									className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"}`}
								/>
								<div className="flex justify-between items-center mt-1">
									<p
										className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
									>
										We&apos;re looking for people ready to hustle! If you have
										any, link relevant projects, Instagram accounts if you want
										to market, GitHub if you want to write code, etc.
									</p>
									<span
										className={`text-xs ${experienceWordCount > 50 ? "text-red-500" : darkMode ? "text-gray-500" : "text-gray-400"}`}
									>
										{experienceWordCount}/50 words
									</span>
								</div>
							</div>
							<div>
								<label
									htmlFor="message"
									className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
								>
									Why do ya wanna join? *
								</label>
								<textarea
									id="message"
									value={formData.message}
									onChange={(e) => {
										const text = e.target.value;
										if (countWords(text) <= 50) {
											handleInputChange("message", text);
										}
									}}
									placeholder="Please tell us why you&apos;d like to join our team and what you can bring to Scio.ly... (50 words max)"
									rows={6}
									className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"}`}
									required={true}
								/>
								<div className="flex justify-between items-center mt-1">
									<p
										className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
									>
										Yes, it&apos;s a resume line. But what else interests you
										about a position with Scio.ly?
									</p>
									<span
										className={`text-xs ${messageWordCount > 50 ? "text-red-500" : darkMode ? "text-gray-500" : "text-gray-400"}`}
									>
										{messageWordCount}/50 words
									</span>
								</div>
							</div>
							<div className="flex justify-end">
								<button
									type="submit"
									disabled={loading}
									className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors duration-200"
								>
									{loading ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
											Sending...
										</>
									) : (
										<>
											<Send className="w-4 h-4" />
											Submit Application
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
			<div className="pb-8" />
		</div>
	);
}
