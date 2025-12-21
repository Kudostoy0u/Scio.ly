"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import type { Settings } from "@/app/practice/types";
import {
	type FavoriteConfig,
	getFavoriteConfigs,
	removeFavoriteConfig,
} from "@/app/utils/favorites";
import { listDownloadedEventSlugs } from "@/app/utils/storage";
import { buildTestParams, saveTestParams } from "@/app/utils/testParams";
import { clearTestSession } from "@/app/utils/timeManagement";
import { BookCheck, Hourglass, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const DESKTOP_SLOT_IDS = [
	"desktop-slot-1",
	"desktop-slot-2",
	"desktop-slot-3",
	"desktop-slot-4",
];
const MOBILE_SLOT_IDS = ["mobile-slot-1", "mobile-slot-2"];

const buildConfigKey = (config: FavoriteConfig, prefix: string) =>
	`${prefix}-${config.eventName}-${JSON.stringify(config.settings)}`;

export default function FavoriteConfigsCard() {
	const { darkMode } = useTheme();
	const router = useRouter();
	const [favorites, setFavorites] = useState<FavoriteConfig[]>([]);
	const [isOffline, setIsOffline] = useState<boolean>(false);
	const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());
	const [selectedMobileCard, setSelectedMobileCard] = useState<number | null>(
		null,
	);

	useEffect(() => {
		try {
			setFavorites(getFavoriteConfigs());
		} catch {
			// Ignore local storage read errors
		}

		const onStorage = (e: StorageEvent) => {
			if (e.key === "scio_favorite_test_configs") {
				setFavorites(getFavoriteConfigs());
			}
		};
		window.addEventListener("storage", onStorage);

		const updateOnline = () => setIsOffline(!navigator.onLine);
		updateOnline();
		window.addEventListener("online", updateOnline);
		window.addEventListener("offline", updateOnline);
		(async () => {
			try {
				const keys = await listDownloadedEventSlugs();
				setDownloadedSet(new Set(keys));
			} catch {
				// Ignore offline cache read errors
			}
		})();
		return () => {
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("online", updateOnline);
			window.removeEventListener("offline", updateOnline);
		};
	}, []);

	useEffect(() => {
		const handleClickOutside = (_event: MouseEvent) => {
			if (selectedMobileCard !== null) {
				setSelectedMobileCard(null);
			}
		};

		if (selectedMobileCard !== null) {
			document.addEventListener("click", handleClickOutside);
		}

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, [selectedMobileCard]);

	const cardStyle = darkMode
		? "bg-gray-800 border border-gray-700"
		: "bg-white border border-gray-200";

	const startFromConfig = (config: FavoriteConfig) => {
		const { eventName, settings } = config;
		if (isOffline) {
			const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
			if (!downloadedSet.has(slug)) {
				toast.error(
					"This event is not downloaded for offline use. Go to Offline page to download it.",
				);
				return;
			}
		}
		try {
			clearTestSession();
		} catch {
			// Ignore session clearing errors
		}
		const testParams = buildTestParams(eventName, settings);
		saveTestParams(testParams);
		if (eventName === "Codebusters") {
			router.push("/codebusters");
		} else {
			router.push("/test");
		}
	};

	const handleRemove = (config: FavoriteConfig) => {
		try {
			const next = removeFavoriteConfig(config);
			setFavorites(next);
		} catch {
			// Ignore remove errors
		}
	};

	return (
		<div className={`rounded-lg ${cardStyle} pl-5 pr-5 h-32 overflow-hidden`}>
			<DesktopFavoritesGrid
				favorites={favorites}
				darkMode={darkMode}
				onStart={startFromConfig}
				onRemove={handleRemove}
			/>
			<MobileFavoritesGrid
				favorites={favorites}
				darkMode={darkMode}
				onStart={startFromConfig}
				onRemove={handleRemove}
				selectedIndex={selectedMobileCard}
				onToggleSelected={setSelectedMobileCard}
			/>
		</div>
	);
}

// local normalization no longer used; centralized via buildtestparams

// summarizesettings retained historically; currently unused after grid redesign

function ConfigSummaryGrid({
	settings,
	darkMode,
	isMobile = false,
}: { settings: Settings; darkMode: boolean; isMobile?: boolean }) {
	const typeLabel =
		settings.types === "both"
			? "MCQ+FRQ"
			: settings.types === "free-response"
				? "FRQ"
				: "MCQ";
	const divLabel =
		settings.division === "any" ? "Div B/C" : `Div ${settings.division}`;
	const textSize = isMobile ? "text-[9px]" : "text-xs";
	const iconSize = isMobile ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
	const gap = isMobile ? "gap-0.5" : "gap-1";
	const gridGap = isMobile ? "gap-x-1 gap-y-0.5" : "gap-x-3 gap-y-1";
	const primaryText = `${darkMode ? "text-gray-200" : "text-gray-800"}`;
	const secondaryText = `${darkMode ? "text-gray-400" : "text-gray-500"}`;
	const iconColor = darkMode ? "text-gray-300" : "text-gray-600";

	const metricRows: Array<{
		key: string;
		value: string | number;
		suffix: string;
		Icon: typeof BookCheck;
	}> = [
		{
			key: "questions",
			value: settings.questionCount,
			suffix: "qs",
			Icon: BookCheck,
		},
		{ key: "time", value: settings.timeLimit, suffix: "min", Icon: Hourglass },
	];

	return (
		<div className={`grid grid-cols-2 ${gridGap} mt-1`}>
			{metricRows.map(({ key, value, suffix, Icon }) => (
				<div key={key} className={`flex items-center ${gap} ${textSize}`}>
					<Icon className={`${iconSize} ${iconColor}`} />
					<span className={primaryText}>{value}</span>
					<span className={secondaryText}>{suffix}</span>
				</div>
			))}
			<div className={`${textSize} ${primaryText}`}>{typeLabel}</div>
			<div className={`${textSize} ${primaryText}`}>{divLabel}</div>
		</div>
	);
}

function DesktopFavoritesGrid({
	favorites,
	darkMode,
	onStart,
	onRemove,
}: {
	favorites: FavoriteConfig[];
	darkMode: boolean;
	onStart: (config: FavoriteConfig) => void;
	onRemove: (config: FavoriteConfig) => void;
}) {
	return (
		<div className="hidden md:flex flex-row w-full items-center gap-4 h-full">
			<div className="flex-none min-w-[110px]">
				<h3
					className={`${darkMode ? "text-white" : "text-gray-800"} text-lg font-semibold leading-tight`}
				>
					<span className="block">Favorited</span>
					<span className="block">Configs</span>
				</h3>
			</div>

			<div className="flex-1 h-full">
				<div className="grid grid-cols-4 gap-4 h-full items-center">
					{DESKTOP_SLOT_IDS.map((slotId, index) => {
						const fav = favorites[index];
						if (!fav) {
							return (
								<PlaceholderTile
									key={`${slotId}-placeholder`}
									darkMode={darkMode}
									label="No favorited configuration"
								/>
							);
						}
						return (
							<FavoriteConfigTile
								key={buildConfigKey(fav, slotId)}
								config={fav}
								darkMode={darkMode}
								onStart={onStart}
								onRemove={onRemove}
								summaryVariant="desktop"
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function MobileFavoritesGrid({
	favorites,
	darkMode,
	onStart,
	onRemove,
	selectedIndex,
	onToggleSelected,
}: {
	favorites: FavoriteConfig[];
	darkMode: boolean;
	onStart: (config: FavoriteConfig) => void;
	onRemove: (config: FavoriteConfig) => void;
	selectedIndex: number | null;
	onToggleSelected: (next: number | null) => void;
}) {
	return (
		<div className="flex md:hidden flex-col w-full h-full pb-2">
			<div className="flex justify-center pt-4 pb-1 px-4">
				<h3
					className={`${darkMode ? "text-white" : "text-gray-800"} text-lg font-semibold text-center`}
				>
					Favorited Configs
				</h3>
			</div>

			<div className="flex-1 px-1">
				<div className="grid grid-cols-2 gap-3 h-full text-xs">
					{MOBILE_SLOT_IDS.map((slotId, index) => {
						const fav = favorites[index];
						if (!fav) {
							return (
								<PlaceholderTile
									key={`${slotId}-placeholder`}
									darkMode={darkMode}
									label="Empty"
									isCompact={true}
								/>
							);
						}
						return (
							<MobileFavoriteTile
								key={buildConfigKey(fav, slotId)}
								config={fav}
								darkMode={darkMode}
								onStart={onStart}
								onRemove={onRemove}
								isSelected={selectedIndex === index}
								onToggle={() =>
									onToggleSelected(selectedIndex === index ? null : index)
								}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function FavoriteConfigTile({
	config,
	darkMode,
	onStart,
	onRemove,
	summaryVariant,
}: {
	config: FavoriteConfig;
	darkMode: boolean;
	onStart: (config: FavoriteConfig) => void;
	onRemove: (config: FavoriteConfig) => void;
	summaryVariant: "desktop" | "mobile";
}) {
	return (
		<div
			className={`relative group rounded-md overflow-hidden h-[80%] ${darkMode ? "bg-gray-900" : "bg-gray-50"} border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
		>
			<button
				type="button"
				className="relative z-10 w-full h-full p-3 flex flex-col items-start justify-between text-left"
				onClick={() => onStart(config)}
			>
				<div
					className={`text-xs font-semibold ${darkMode ? "text-white" : "text-gray-900"} break-words leading-snug`}
				>
					{config.eventName}
				</div>
				<div className="w-full">
					<ConfigSummaryGrid
						settings={config.settings}
						darkMode={darkMode}
						isMobile={summaryVariant === "mobile"}
					/>
				</div>
			</button>
			<div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors pointer-events-none" />
			<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 pointer-events-none group-hover:pointer-events-auto">
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onStart(config);
					}}
					className="p-2 rounded-full border border-white/70 text-white hover:border-white"
					title="Start"
				>
					<Play className="w-5 h-5" />
				</button>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onRemove(config);
					}}
					className="p-2 rounded-full border border-white/70 text-white hover:border-white"
					title="Remove"
				>
					<Trash2 className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}

function MobileFavoriteTile({
	config,
	darkMode,
	onStart,
	onRemove,
	isSelected,
	onToggle,
}: {
	config: FavoriteConfig;
	darkMode: boolean;
	onStart: (config: FavoriteConfig) => void;
	onRemove: (config: FavoriteConfig) => void;
	isSelected: boolean;
	onToggle: () => void;
}) {
	return (
		<div
			className={`relative group rounded-md overflow-hidden h-full ${darkMode ? "bg-gray-900" : "bg-gray-50"} border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
		>
			<button
				type="button"
				className="relative z-10 w-full h-full p-1.5 flex flex-col items-start justify-between text-left"
				onClick={(event) => {
					event.stopPropagation();
					onToggle();
				}}
				aria-pressed={isSelected}
			>
				<div
					className={`text-[11px] font-semibold ${darkMode ? "text-white" : "text-gray-900"} break-words leading-tight`}
				>
					{config.eventName}
				</div>
				<div className="w-full">
					<ConfigSummaryGrid
						settings={config.settings}
						darkMode={darkMode}
						isMobile={true}
					/>
				</div>
			</button>
			<div
				className={`absolute inset-0 transition-colors pointer-events-none ${
					isSelected ? "bg-black/50" : "bg-black/0"
				}`}
			/>
			<div
				className={`absolute inset-0 transition-opacity flex items-center justify-center gap-3 z-20 ${
					isSelected
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
			>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onStart(config);
					}}
					className="p-2 rounded-full border border-white/70 text-white hover:border-white active:bg-white/20"
					title="Start"
				>
					<Play className="w-5 h-5" />
				</button>
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onRemove(config);
					}}
					className="p-2 rounded-full border border-white/70 text-white hover:border-white active:bg-white/20"
					title="Remove"
				>
					<Trash2 className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}

function PlaceholderTile({
	darkMode,
	label,
	isCompact = false,
}: {
	darkMode: boolean;
	label: string;
	isCompact?: boolean;
}) {
	const height = isCompact ? "h-full" : "h-[80%]";
	const textSize = isCompact ? "text-[10px]" : "text-xs";
	return (
		<div
			className={`flex items-center justify-center rounded-md ${height} ${
				darkMode
					? "bg-gray-900/30 border border-gray-800"
					: "bg-gray-50/60 border border-gray-200"
			}`}
		>
			<span
				className={`${darkMode ? "text-gray-400" : "text-gray-500"} ${textSize} text-center px-2`}
			>
				{label}
			</span>
		</div>
	);
}
