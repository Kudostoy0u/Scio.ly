"use client";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";

import ContactModal from "@/app/components/ContactModal";
import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { ContactFormData } from "@/app/dashboard/types";
import { handleContactSubmission } from "@/app/utils/contactUtils";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPen } from "react-icons/fa";
import { toast } from "react-toastify";
import ActionButtons from "./ActionButtons";
import AnimatedAccuracy from "./AnimatedAccuracy";
import FavoriteConfigsCard from "./FavoriteConfigsCard";
// import HylasBanner from "./HylasBanner";
import MetricsCard from "./MetricsCard";
import QuestionsThisWeekChart from "./QuestionsThisWeekChart";
import WelcomeMessage from "./WelcomeMessage";

import { useAuth } from "@/app/contexts/AuthContext";
// import {
// 	BannerProvider,
// 	useBannerContext,
// } from "@/app/dashboard/contexts/bannerContext";
import { useDashboardData } from "@/app/dashboard/hooks/useDashboardData";
import type { UseDashboardDataReturn } from "@/app/dashboard/hooks/useDashboardData";

type HistoryData = UseDashboardDataReturn["historyData"];
type DashboardMetricsData = UseDashboardDataReturn["metrics"];
type ViewMode = "daily" | "weekly" | "allTime";
type Totals = { questions: number; correct: number };

const DAYS_IN_WEEK = 7;

function DashboardContent({ initialUser }: { initialUser?: User | null }) {
	const controller = useDashboardController(initialUser);
	const {
		router,
		darkMode,
		setDarkMode,
		metrics,
		historyData,
		greetingName,
		isLoading,
		contactModalOpen,
		setContactModalOpen,
		handleContact,
		correctView,
		setCorrectView,
		accuracyView,
		cycleAccuracyView,
		getAccuracyForView,
		weeklyTotals,
		allTimeTotals,
		cardStyle,
		bannerVisible,
		// closeBanner,
		currentUser,
	} = controller;

	return (
		<div className="relative min-h-screen">
			{/* Background */}
			<div
				className={`absolute inset-0 ${
					darkMode ? "bg-gray-900" : "bg-gray-50"
				} transition-colors duration-300`}
			/>

			{/* Main Content */}
			<div className="relative z-10">
				{/* {bannerVisible && <HylasBanner onClose={closeBanner} />} */}
				<div
					className={bannerVisible ? "relative" : ""}
					style={bannerVisible ? { marginTop: "32px" } : {}}
				>
					<Header />
				</div>

				<div
					className={`container mx-auto px-4 pb-8 ${bannerVisible ? "pt-28" : "pt-24"}`}
				>
					<HeroRow
						router={router}
						greetingName={greetingName}
						darkMode={darkMode}
						currentUser={currentUser}
						setDarkMode={setDarkMode}
						isLoading={isLoading}
					/>
					<MetricsSection
						metrics={metrics}
						weeklyTotals={weeklyTotals}
						allTimeTotals={allTimeTotals}
						correctView={correctView}
						onViewChange={setCorrectView}
						darkMode={darkMode}
						isLoading={isLoading}
					/>
					<AccuracySection
						historyData={historyData}
						darkMode={darkMode}
						accuracyView={accuracyView}
						onCycleView={cycleAccuracyView}
						cardStyle={cardStyle}
						getAccuracyForView={getAccuracyForView}
					/>
					{/* Action Buttons */}
					<ActionButtons darkMode={darkMode} />
				</div>
			</div>

			{/* Contact Modal */}
			<ContactModal
				isOpen={contactModalOpen}
				onClose={() => setContactModalOpen(false)}
				onSubmit={handleContact}
				darkMode={darkMode}
			/>
		</div>
	);
}

function HeroRow({
	router,
	greetingName,
	darkMode,
	currentUser,
	setDarkMode,
	isLoading,
}: {
	router: ReturnType<typeof useRouter>;
	greetingName: string;
	darkMode: boolean;
	currentUser: User | null;
	setDarkMode: (value: boolean) => void;
	isLoading: boolean;
}) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 md:mb-8">
			<div className="lg:col-span-2">
				<div className="h-32">
					<WelcomeMessage
						greetingName={greetingName}
						darkMode={darkMode}
						currentUser={currentUser}
						setDarkMode={setDarkMode}
						isLoading={isLoading}
					/>
				</div>
			</div>
			<div className="lg:col-span-1">
				<motion.button
					onClick={() => router.push("/practice")}
					className="rounded-lg w-full h-32 py-7 px-6 text-white text-center flex flex-col items-center justify-center bg-blue-600 relative overflow-hidden group"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<div className="absolute inset-0 flex items-center justify-center transition-all duration-600 ease-in-out -translate-y-4 group-hover:translate-y-0">
						<FaPen className="text-3xl transition-all duration-600 ease-in-out group-hover:rotate-[-270deg]" />
					</div>
					<span className="text-xl font-bold absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 translate-y-4">
						Practice
					</span>
				</motion.button>
			</div>
		</div>
	);
}

function MetricsSection({
	metrics,
	weeklyTotals,
	allTimeTotals,
	correctView,
	onViewChange,
	darkMode,
	isLoading,
}: {
	metrics: DashboardMetricsData;
	weeklyTotals: Totals;
	allTimeTotals: Totals;
	correctView: ViewMode;
	onViewChange: (view: ViewMode) => void;
	darkMode: boolean;
	isLoading: boolean;
}) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 lg:mb-8">
			<div className="lg:col-span-1">
				<div className="h-32">
					<MetricsCard
						title="Correct Answers"
						dailyValue={metrics.correctAnswers}
						weeklyValue={weeklyTotals.correct}
						allTimeValue={allTimeTotals.correct}
						view={correctView}
						onViewChange={onViewChange}
						color="text-green-600"
						darkMode={darkMode}
						dailyDenominator={metrics.questionsAttempted}
						weeklyDenominator={weeklyTotals.questions}
						allTimeDenominator={allTimeTotals.questions}
						formatAsFraction={true}
						isLoading={isLoading}
					/>
				</div>
			</div>
			<div className="lg:col-span-2">
				<div className="h-32 lg:mb-0">
					<FavoriteConfigsCard />
				</div>
			</div>
		</div>
	);
}

function AccuracySection({
	historyData,
	darkMode,
	accuracyView,
	onCycleView,
	cardStyle,
	getAccuracyForView,
}: {
	historyData: HistoryData;
	darkMode: boolean;
	accuracyView: ViewMode;
	onCycleView: () => void;
	cardStyle: string;
	getAccuracyForView: (view: ViewMode) => number;
}) {
	const faces: Array<{
		view: ViewMode;
		title: string;
		rotation: string;
		aria: string;
	}> = [
		{
			view: "daily",
			title: "Daily Accuracy",
			rotation: "0deg",
			aria: "Daily accuracy gauge",
		},
		{
			view: "weekly",
			title: "Weekly Accuracy",
			rotation: "180deg",
			aria: "Weekly accuracy gauge",
		},
		{
			view: "allTime",
			title: "All-Time Accuracy",
			rotation: "360deg",
			aria: "All-time accuracy gauge",
		},
	];

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 lg:mb-8">
			<QuestionsThisWeekChart historyData={historyData} darkMode={darkMode} />
			<div className="perspective-1000 hover:scale-[1.02] transition-transform duration-300 h-full">
				<button
					type="button"
					className="w-full h-full p-0 rounded-lg cursor-pointer transition-transform duration-700 relative grid grid-cols-1"
					style={{
						transformStyle: "preserve-3d",
						transform:
							accuracyView === "daily"
								? "rotateX(0deg)"
								: accuracyView === "weekly"
									? "rotateX(180deg)"
									: "rotateX(360deg)",
					}}
					onClick={onCycleView}
					aria-label="Cycle accuracy view"
				>
					{faces.map((face) => (
						<AccuracyFace
							key={face.view}
							face={face}
							accuracyView={accuracyView}
							darkMode={darkMode}
							getAccuracyForView={getAccuracyForView}
							cardStyle={cardStyle}
						/>
					))}
				</button>
			</div>
		</div>
	);
}

function AccuracyFace({
	face,
	accuracyView,
	darkMode,
	getAccuracyForView,
	cardStyle,
}: {
	face: { view: ViewMode; title: string; rotation: string; aria: string };
	accuracyView: ViewMode;
	darkMode: boolean;
	getAccuracyForView: (view: ViewMode) => number;
	cardStyle: string;
}) {
	const accuracyValue = getAccuracyForView(face.view);

	// Logic to prevent z-fighting between Daily (0deg) and All-Time (360deg) faces
	// We only hide a face if it directly conflicts with the currently active view
	let opacity = 1;
	if (face.view === "daily" && accuracyView === "allTime") {
		opacity = 0;
	}
	if (face.view === "allTime" && accuracyView === "daily") {
		opacity = 0;
	}

	return (
		<div
			className={`w-full h-full col-start-1 row-start-1 flex flex-col p-6 rounded-lg ${cardStyle}`}
			style={{
				backfaceVisibility: "hidden",
				transform: `rotateX(${face.rotation})`,
				opacity,
				transition: "opacity 0ms", // Instant switch to avoid z-fighting during reset
			}}
		>
			<h2
				className={`text-xl font-semibold mb-2 text-left ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				{face.title}
			</h2>
			<div className="flex items-center justify-center flex-grow">
				<svg
					className="w-72 h-40"
					viewBox="0 0 100 60"
					role="img"
					aria-label={face.aria}
				>
					<title>{face.title}</title>
					<path
						d="M5 50 A 45 45 0 0 1 95 50"
						fill="none"
						stroke={darkMode ? "#374151" : "#e2e8f0"}
						strokeWidth="8"
						strokeLinecap="round"
					/>
					<motion.path
						d="M5 50 A 45 45 0 0 1 95 50"
						fill="none"
						stroke={darkMode ? "#60a5fa" : "#3b82f6"}
						strokeWidth="8"
						strokeLinecap="round"
						initial={{ pathLength: 0 }}
						animate={{ pathLength: accuracyValue / 100 }}
						transition={{ duration: 1, ease: "easeOut" }}
					/>
					<AnimatedAccuracy
						value={Math.round(accuracyValue)}
						darkMode={darkMode}
						className="text-2xl font-bold"
					/>
				</svg>
			</div>
		</div>
	);
}

function useDashboardController(initialUser?: User | null) {
	const router = useRouter();
	const { darkMode, setDarkMode } = useTheme();
	const { user: authUser } = useAuth();
	// const { bannerVisible, closeBanner } = useBannerContext();
	const bannerVisible = false;
	const closeBanner = () => {};
	const [currentUser, setCurrentUser] = useState<User | null>(
		initialUser ?? null,
	);
	const [contactModalOpen, setContactModalOpen] = useState(false);
	const [correctView, setCorrectView] = useState<ViewMode>(() =>
		loadStoredViewPreference("dashboard.correctView"),
	);
	const [accuracyView, setAccuracyView] = useState<ViewMode>(() =>
		loadStoredViewPreference("dashboard.accuracyView"),
	);
	const { metrics, historyData, greetingName, isLoading } =
		useDashboardData(currentUser);

	useEffect(() => {
		try {
			if (typeof window !== "undefined") {
				SyncLocalStorage.setItem("dashboard.correctView", correctView);
				SyncLocalStorage.setItem("dashboard.accuracyView", accuracyView);
			}
		} catch (error) {
			logger.error(
				"Error saving dashboard view preferences to localStorage:",
				error,
			);
		}
	}, [correctView, accuracyView]);

	useEffect(() => {
		setCurrentUser(authUser ?? initialUser ?? null);
	}, [authUser, initialUser]);

	const handleContact = useCallback(async (data: ContactFormData) => {
		try {
			await handleContactSubmission(data);
			setContactModalOpen(false);
			toast.success("Message sent successfully!");
		} catch (error) {
			logger.error("Error sending contact message:", error);
			toast.error("Failed to send message. Please try again.");
		}
	}, []);

	const cycleAccuracyView = useCallback(() => {
		setAccuracyView((prev) => {
			if (prev === "daily") {
				return "weekly";
			}
			if (prev === "weekly") {
				return "allTime";
			}
			return "daily";
		});
	}, []);

	const weeklyTotals = useMemo(
		() => computeWeeklyTotals(historyData),
		[historyData],
	);
	const allTimeTotals = useMemo(
		() => computeAllTimeTotals(historyData),
		[historyData],
	);
	const weeklyAccuracy = useMemo(
		() => computeWeeklyAccuracy(historyData),
		[historyData],
	);
	const allTimeAccuracy = useMemo(
		() => computeAllTimeAccuracy(historyData),
		[historyData],
	);
	const getAccuracyForView = useCallback(
		(view: ViewMode) =>
			resolveAccuracyValue(view, metrics, weeklyAccuracy, allTimeAccuracy),
		[metrics, weeklyAccuracy, allTimeAccuracy],
	);
	const cardStyle = useMemo(
		() =>
			darkMode
				? "bg-gray-800 border border-gray-700"
				: "bg-white border border-gray-200",
		[darkMode],
	);

	return {
		router,
		darkMode,
		setDarkMode,
		metrics,
		historyData,
		greetingName,
		isLoading,
		contactModalOpen,
		setContactModalOpen,
		handleContact,
		correctView,
		setCorrectView,
		accuracyView,
		cycleAccuracyView,
		getAccuracyForView,
		weeklyTotals,
		allTimeTotals,
		cardStyle,
		bannerVisible,
		closeBanner,
		currentUser,
	};
}

export default function DashboardMain({
	initialUser,
}: { initialUser?: User | null }) {
	return (
		// <BannerProvider>
		<DashboardContent initialUser={initialUser} />
		// </BannerProvider>
	);
}

function loadStoredViewPreference(key: string): ViewMode {
	if (typeof window === "undefined") {
		return "daily";
	}
	const stored = SyncLocalStorage.getItem(key);
	if (stored === "weekly" || stored === "allTime") {
		return stored;
	}
	return "daily";
}

function getRecentDateKeys(days: number): string[] {
	const dates: string[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		dates.push(date.toISOString().split("T")[0] ?? "");
	}
	return dates.filter(Boolean);
}

function computeWeeklyTotals(historyData: HistoryData): Totals {
	const recentDates = getRecentDateKeys(DAYS_IN_WEEK);
	return recentDates.reduce(
		(acc, date) => {
			const stats = historyData[date];
			if (!stats) {
				return acc;
			}
			return {
				questions: acc.questions + (stats.questionsAttempted || 0),
				correct: acc.correct + (stats.correctAnswers || 0),
			};
		},
		{ questions: 0, correct: 0 },
	);
}

function computeAllTimeTotals(historyData: HistoryData): Totals {
	return Object.values(historyData).reduce(
		(acc, stats) => ({
			questions: acc.questions + (stats?.questionsAttempted || 0),
			correct: acc.correct + (stats?.correctAnswers || 0),
		}),
		{ questions: 0, correct: 0 },
	);
}

function computeWeeklyAccuracy(historyData: HistoryData) {
	const totals = computeWeeklyTotals(historyData);
	return totals.questions > 0 ? (totals.correct / totals.questions) * 100 : 0;
}

function computeAllTimeAccuracy(historyData: HistoryData) {
	const totals = computeAllTimeTotals(historyData);
	return totals.questions > 0 ? (totals.correct / totals.questions) * 100 : 0;
}

function resolveAccuracyValue(
	view: "daily" | "weekly" | "allTime",
	metrics: DashboardMetricsData,
	weeklyAccuracy: number,
	allTimeAccuracy: number,
) {
	if (view === "daily") {
		return metrics.questionsAttempted > 0
			? (metrics.correctAnswers / metrics.questionsAttempted) * 100
			: 0;
	}
	if (view === "weekly") {
		return weeklyAccuracy;
	}
	return allTimeAccuracy;
}
