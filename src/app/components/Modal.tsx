"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
	showCloseButton?: boolean;
}

export default function Modal({
	isOpen,
	onClose,
	title,
	children,
	maxWidth = "md",
	showCloseButton = true,
}: ModalProps) {
	const { darkMode } = useTheme();

	// Handle Escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	// Prevent body scroll when modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const maxWidthClasses = {
		sm: "max-w-sm",
		md: "max-w-md",
		lg: "max-w-lg",
		xl: "max-w-xl",
		"2xl": "max-w-2xl",
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{
				backgroundColor: darkMode
					? "rgba(0, 0, 0, 0.75)"
					: "rgba(0, 0, 0, 0.5)",
			}}
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? "modal-title" : undefined}
		>
			<div
				className={`relative w-full ${maxWidthClasses[maxWidth]} rounded-xl shadow-2xl border ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
				onClick={(e) => e.stopPropagation()}
			>
				{(title || showCloseButton) && (
					<div
						className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
					>
						{title && (
							<h3
								id="modal-title"
								className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
							>
								{title}
							</h3>
						)}
						{showCloseButton && (
							<button
								type="button"
								onClick={onClose}
								className={`p-2 rounded-lg transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"}`}
								aria-label="Close"
							>
								<X className="h-5 w-5" />
							</button>
						)}
					</div>
				)}
				<div className="px-6 py-4">{children}</div>
			</div>
		</div>
	);
}
