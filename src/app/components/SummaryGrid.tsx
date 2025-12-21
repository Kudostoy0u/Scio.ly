"use client";
import type { LucideIcon } from "lucide-react";
import React from "react";

export interface SummaryItem {
	label: string;
	value: string | number;
	valueClassName?: string;
	icon?: LucideIcon;
}

interface SummaryGridProps {
	items: SummaryItem[];
	darkMode: boolean;
	showCompactLayout: boolean; // controls 4-col -> 2x2 transform
	className?: string; // optional wrapper classes
}

// Summary card component (extracted to reduce complexity)
interface SummaryCardProps {
	item: SummaryItem | undefined;
	showCompactLayout: boolean;
	cardBase: string;
	cardPadding: string;
	labelClass: string;
	valueClassBase: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
	item,
	showCompactLayout,
	cardBase,
	cardPadding,
	labelClass,
	valueClassBase,
}) => {
	if (!item) {
		return null;
	}

	const iconOpacityClass = showCompactLayout
		? "opacity-100"
		: "opacity-0 md:opacity-0";
	const labelVisibilityClass = showCompactLayout
		? "max-h-0 opacity-0 md:max-h-6 md:opacity-100"
		: "max-h-6 opacity-100";

	return (
		<div className={`${cardBase} ${cardPadding} relative`}>
			{item.icon && (
				<div
					className={`absolute left-1 md:left-2 top-1/2 -translate-y-1/2 transition-opacity duration-300 md:transition-none ${iconOpacityClass}`}
				>
					{React.createElement(item.icon, {
						className: `w-3 h-3 md:w-4 md:h-4 ${item.valueClassName || ""}`,
					})}
				</div>
			)}
			<div className={`${valueClassBase} ${item.valueClassName || ""}`}>
				{item.value}
			</div>
			<div
				className={`${labelClass} transition-all duration-300 md:transition-none overflow-hidden ${labelVisibilityClass}`}
			>
				{item.label}
			</div>
		</div>
	);
};

export default function SummaryGrid({
	items,
	darkMode,
	showCompactLayout,
	className = "",
}: SummaryGridProps) {
	const cardBase = `text-center rounded-lg transition-all duration-500 md:transition-none ${darkMode ? "bg-gray-700" : "bg-gray-50"}`;
	const cardPadding = showCompactLayout
		? "py-1.5 px-2 md:py-2 md:px-6"
		: "py-2 md:py-2"; // more padding in compact mode
	const labelClass = `${darkMode ? "text-gray-300" : "text-gray-600"} text-xs md:text-sm`;
	const valueClassBase = "font-bold text-base md:text-xl"; // smaller on mobile

	return (
		<div
			className={`grid transition-all duration-500 ease-in-out md:transition-none ${
				showCompactLayout
					? "grid-cols-4 md:grid-cols-2 gap-1.5 md:gap-3 w-full md:max-w-[280px] md:mx-auto"
					: "grid-cols-2 md:grid-cols-4 gap-3"
			} ${className}`}
		>
			<SummaryCard
				item={items[0]}
				showCompactLayout={showCompactLayout}
				cardBase={cardBase}
				cardPadding={cardPadding}
				labelClass={labelClass}
				valueClassBase={valueClassBase}
			/>
			<SummaryCard
				item={items[1]}
				showCompactLayout={showCompactLayout}
				cardBase={cardBase}
				cardPadding={cardPadding}
				labelClass={labelClass}
				valueClassBase={valueClassBase}
			/>
			<SummaryCard
				item={items[2]}
				showCompactLayout={showCompactLayout}
				cardBase={cardBase}
				cardPadding={cardPadding}
				labelClass={labelClass}
				valueClassBase={valueClassBase}
			/>
			<SummaryCard
				item={items[3]}
				showCompactLayout={showCompactLayout}
				cardBase={cardBase}
				cardPadding={cardPadding}
				labelClass={labelClass}
				valueClassBase={valueClassBase}
			/>
		</div>
	);
}
