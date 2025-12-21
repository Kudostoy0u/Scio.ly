"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import Modal from "./Modal";

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	confirmVariant?: "default" | "danger" | "warning";
}

export default function ConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	confirmVariant = "default",
}: ConfirmModalProps) {
	const { darkMode } = useTheme();

	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	const confirmButtonClasses = {
		default: darkMode
			? "bg-blue-600 hover:bg-blue-700 text-white"
			: "bg-blue-600 hover:bg-blue-700 text-white",
		danger: darkMode
			? "bg-red-600 hover:bg-red-700 text-white"
			: "bg-red-600 hover:bg-red-700 text-white",
		warning: darkMode
			? "bg-amber-600 hover:bg-amber-700 text-white"
			: "bg-amber-600 hover:bg-amber-700 text-white",
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
			<div className="space-y-6">
				<p
					className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
				>
					{message}
				</p>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${darkMode ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
					>
						{cancelText}
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${confirmButtonClasses[confirmVariant]}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</Modal>
	);
}
