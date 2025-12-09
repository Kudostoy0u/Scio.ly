"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface QuoteLengthSliderProps {
	min: number;
	max: number;
	value: [number, number];
	onValueChange: (value: [number, number]) => void;
	disabled?: boolean;
	id?: string;
}

const QuoteLengthSlider: React.FC<QuoteLengthSliderProps> = ({
	min,
	max,
	value,
	onValueChange,
	disabled = false,
	id,
}) => {
	const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null);
	const sliderRef = useRef<HTMLDivElement>(null);
	const { darkMode } = useTheme();

	const handleMouseDown = (e: React.MouseEvent, thumb: "start" | "end") => {
		if (disabled) {
			return;
		}
		setIsDragging(thumb);
		e.preventDefault();
	};

	const handleTouchStart = (e: React.TouchEvent, thumb: "start" | "end") => {
		if (disabled) {
			return;
		}
		setIsDragging(thumb);
		e.preventDefault();
	};

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!(isDragging && sliderRef.current) || disabled) {
				return;
			}

			const rect = sliderRef.current.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const percentage = Math.max(0, Math.min(1, x / rect.width));
			const newValue = Math.round(min + percentage * (max - min));

			if (isDragging === "start") {
				const newStartValue = Math.min(newValue, value[1] - 1);
				onValueChange([newStartValue, value[1]]);
			} else {
				const newEndValue = Math.max(newValue, value[0] + 1);
				onValueChange([value[0], newEndValue]);
			}
		},
		[isDragging, value, min, max, onValueChange, disabled],
	);

	const handleTouchMove = useCallback(
		(e: TouchEvent) => {
			if (!(isDragging && sliderRef.current) || disabled) {
				return;
			}

			const rect = sliderRef.current.getBoundingClientRect();
			const touch = e.touches[0];
			if (!touch) {
				return;
			}
			const x = touch.clientX - rect.left;
			const percentage = Math.max(0, Math.min(1, x / rect.width));
			const newValue = Math.round(min + percentage * (max - min));

			if (isDragging === "start") {
				const newStartValue = Math.min(newValue, value[1] - 1);
				onValueChange([newStartValue, value[1]]);
			} else {
				const newEndValue = Math.max(newValue, value[0] + 1);
				onValueChange([value[0], newEndValue]);
			}
		},
		[isDragging, value, min, max, onValueChange, disabled],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(null);
	}, []);

	const handleTouchEnd = useCallback(() => {
		setIsDragging(null);
	}, []);

	useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			document.addEventListener("touchmove", handleTouchMove, {
				passive: false,
			});
			document.addEventListener("touchend", handleTouchEnd);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.removeEventListener("touchmove", handleTouchMove);
				document.removeEventListener("touchend", handleTouchEnd);
			};
		}
		return undefined;
	}, [
		isDragging,
		handleMouseMove,
		handleTouchMove,
		handleMouseUp,
		handleTouchEnd,
	]);

	const startPercentage = ((value[0] - min) / (max - min)) * 100;
	const endPercentage = ((value[1] - min) / (max - min)) * 100;

	return (
		<div className="space-y-3" id={id}>
			{/* Value display */}
			<div className="flex items-center justify-between text-sm">
				<span className={darkMode ? "text-gray-300" : "text-gray-700"}>
					Range: {value[0]} - {value[1]} characters
				</span>
				<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
					{value[1] - value[0] + 1} character range
				</span>
			</div>

			{/* Slider */}
			<div className="relative px-2">
				<div
					ref={sliderRef}
					className={`relative h-8 flex items-center ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
				>
					{/* Background track */}
					<div
						className={`absolute w-full h-1 rounded-full ${darkMode ? "bg-gray-600" : "bg-gray-300"}`}
					/>

					{/* Active range track */}
					<div
						className={`absolute h-1 rounded-full bg-blue-500 ${isDragging ? "" : "transition-all duration-200"}`}
						style={{
							left: `${startPercentage}%`,
							width: `${endPercentage - startPercentage}%`,
						}}
					/>

					{/* Start thumb */}
					<div
						className={`absolute w-4 h-4 rounded-full border-2 transform -translate-x-1/2 shadow-lg touch-none ${
							isDragging ? "" : "transition-all duration-200"
						} ${
							disabled
								? "cursor-not-allowed bg-gray-400 border-gray-500"
								: darkMode
									? "cursor-grab active:cursor-grabbing bg-white border-blue-400 hover:border-blue-300 hover:shadow-xl"
									: "cursor-grab active:cursor-grabbing bg-white border-blue-500 hover:border-blue-600 hover:shadow-xl"
						}`}
						style={{ left: `${startPercentage}%` }}
						onMouseDown={(e) => handleMouseDown(e, "start")}
						onTouchStart={(e) => handleTouchStart(e, "start")}
					/>

					{/* End thumb */}
					<div
						className={`absolute w-4 h-4 rounded-full border-2 transform -translate-x-1/2 shadow-lg touch-none ${
							isDragging ? "" : "transition-all duration-200"
						} ${
							disabled
								? "cursor-not-allowed bg-gray-400 border-gray-500"
								: darkMode
									? "cursor-grab active:cursor-grabbing bg-white border-blue-400 hover:border-blue-300 hover:shadow-xl"
									: "cursor-grab active:cursor-grabbing bg-white border-blue-500 hover:border-blue-600 hover:shadow-xl"
						}`}
						style={{ left: `${endPercentage}%` }}
						onMouseDown={(e) => handleMouseDown(e, "end")}
						onTouchStart={(e) => handleTouchStart(e, "end")}
					/>
				</div>
			</div>

			{/* Min/Max labels */}
			<div className="flex justify-between text-xs px-2">
				<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
					{min} char{min !== 1 ? "s" : ""}
				</span>
				<span className={darkMode ? "text-gray-400" : "text-gray-500"}>
					{max} chars
				</span>
			</div>
		</div>
	);
};

export default QuoteLengthSlider;
