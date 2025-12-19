"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
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
	const previouslyFocusedRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!isOpen) return;
		previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = "";
			previouslyFocusedRef.current?.focus?.();
			previouslyFocusedRef.current = null;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	const maxWidthClasses = {
		sm: "max-w-sm",
		md: "max-w-md",
		lg: "max-w-lg",
		xl: "max-w-xl",
		"2xl": "max-w-2xl",
		"4xl": "max-w-4xl",
	};

	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				className="absolute inset-0 bg-black/50"
				aria-label="Close modal"
				onClick={onClose}
			/>
			<dialog
				open
				className={`relative w-full ${maxWidthClasses[maxWidth]} rounded-xl shadow-2xl border ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
				style={{ margin: 0, padding: 0, border: "none" }}
				aria-modal="true"
				aria-labelledby={title ? "modal-title" : undefined}
				onClick={(e) => {
					// Prevent clicks inside dialog from closing modal
					e.stopPropagation();
				}}
				onKeyDown={(e) => {
					// Prevent keyboard events from bubbling to overlay
					e.stopPropagation();
				}}
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
			</dialog>
		</div>,
		document.body,
	);
}
