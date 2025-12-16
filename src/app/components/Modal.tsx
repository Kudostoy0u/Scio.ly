"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

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
	const dialogRef = useRef<HTMLDialogElement>(null);

	// Handle dialog open/close
	useEffect(() => {
		if (!dialogRef.current) return;

		if (isOpen) {
			dialogRef.current.showModal();
			document.body.style.overflow = "hidden";
		} else {
			dialogRef.current.close();
			document.body.style.overflow = "";
		}

		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const maxWidthClasses = {
		sm: "max-w-sm",
		md: "max-w-md",
		lg: "max-w-lg",
		xl: "max-w-xl",
		"2xl": "max-w-2xl",
	};

	const handleDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
		// Close dialog when clicking on the backdrop (the dialog element itself)
		if (e.target === dialogRef.current) {
			onClose();
		}
	};

	const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
		// Close dialog when pressing Enter or Space on the backdrop
		if (
			e.target === dialogRef.current &&
			(e.key === "Enter" || e.key === " ")
		) {
			e.preventDefault();
			onClose();
		}
	};

	return (
		<dialog
			ref={dialogRef}
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent"
			style={{
				backgroundColor: "transparent",
			}}
			onClick={handleDialogClick}
			onKeyDown={handleDialogKeyDown}
			aria-labelledby={title ? "modal-title" : undefined}
		>
			<div
				className={`relative w-full ${maxWidthClasses[maxWidth]} rounded-xl shadow-2xl border ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
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
		</dialog>
	);
}
