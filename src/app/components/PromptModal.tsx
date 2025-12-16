"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useState, useEffect } from "react";
import Modal from "./Modal";

interface PromptModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (value: string) => void;
	title: string;
	message?: string;
	placeholder?: string;
	defaultValue?: string;
	confirmText?: string;
	cancelText?: string;
	required?: boolean;
}

export default function PromptModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	placeholder = "",
	defaultValue = "",
	confirmText = "Confirm",
	cancelText = "Cancel",
	required = false,
}: PromptModalProps) {
	const { darkMode } = useTheme();
	const [value, setValue] = useState(defaultValue);

	// Reset value when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setValue(defaultValue);
		}
	}, [isOpen, defaultValue]);

	const handleConfirm = () => {
		if (required && !value.trim()) {
			return;
		}
		onConfirm(value);
		onClose();
		setValue("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleConfirm();
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
			<div className="space-y-6">
				{message && (
					<p
						className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
					>
						{message}
					</p>
				)}
				<input
					type="text"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
						darkMode
							? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
							: "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
					}`}
					autoFocus
				/>
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
						disabled={required && !value.trim()}
						className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
							required && !value.trim()
								? "bg-gray-400 cursor-not-allowed"
								: "bg-blue-600 hover:bg-blue-700"
						}`}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</Modal>
	);
}
