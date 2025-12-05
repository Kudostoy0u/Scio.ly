"use client";
import { Download, Upload } from "lucide-react";
import Link from "next/link";

export function ThemeToggleButton({
	darkMode,
	shouldBeTransparent,
	onThemeToggle,
}: {
	darkMode: boolean;
	shouldBeTransparent: boolean;
	onThemeToggle: () => void;
}) {
	const getMobileButtonClasses = () => {
		return `p-2 rounded-md transition-colors duration-200 ${
			shouldBeTransparent
				? "hover:text-gray-700 text-gray-300 backdrop-blur-sm"
				: ""
		} ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-gray-900"}`;
	};

	return (
		<button
			type="button"
			onClick={onThemeToggle}
			className={getMobileButtonClasses()}
			aria-label="Toggle theme"
		>
			{darkMode ? (
				<svg
					className="w-5 h-5"
					fill="currentColor"
					viewBox="0 0 20 20"
					aria-label="Light mode"
				>
					<title>Light mode</title>
					<path
						fillRule="evenodd"
						d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
						clipRule="evenodd"
					/>
				</svg>
			) : (
				<svg
					className="w-5 h-5"
					fill="currentColor"
					viewBox="0 0 20 20"
					aria-label="Dark mode"
				>
					<title>Dark mode</title>
					<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
				</svg>
			)}
		</button>
	);
}

export function InstallButton({
	darkMode,
	shouldBeTransparent,
	isStandalone,
	onInstallClick,
}: {
	darkMode: boolean;
	shouldBeTransparent: boolean;
	isStandalone: boolean;
	onInstallClick: () => void;
}) {
	const getMobileButtonClasses = () => {
		return `p-2 rounded-md transition-colors duration-200 ${
			shouldBeTransparent
				? "hover:text-gray-700 text-gray-300 backdrop-blur-sm"
				: ""
		} ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-gray-900"}`;
	};

	if (isStandalone) {
		return (
			<Link
				href="/offline"
				className={getMobileButtonClasses()}
				aria-label="Offline downloads"
			>
				<Download className="w-5 h-5" />
			</Link>
		);
	}
	return (
		<button
			type="button"
			onClick={onInstallClick}
			className={getMobileButtonClasses()}
			aria-label="Install app"
		>
			<Upload className="w-5 h-5" />
		</button>
	);
}

export function HamburgerButton({
	darkMode,
	shouldBeTransparent,
	mobileMenuOpen,
	onMenuToggle,
}: {
	darkMode: boolean;
	shouldBeTransparent: boolean;
	mobileMenuOpen: boolean;
	onMenuToggle: () => void;
}) {
	const getMobileButtonClasses = () => {
		return `p-2 rounded-md transition-colors duration-200 ${
			shouldBeTransparent
				? "hover:text-gray-700 text-gray-300 backdrop-blur-sm"
				: ""
		} ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-700 hover:text-gray-900"}`;
	};

	return (
		<button
			type="button"
			onClick={onMenuToggle}
			className={getMobileButtonClasses()}
			aria-label="Toggle mobile menu"
		>
			<div className="w-5 h-5 relative flex items-center justify-center">
				<span
					className={`absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out ${
						mobileMenuOpen ? "rotate-45 translate-y-0" : "-translate-y-1.5"
					}`}
				/>
				<span
					className={`absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out ${
						mobileMenuOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
					}`}
				/>
				<span
					className={`absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out ${
						mobileMenuOpen ? "-rotate-45 translate-y-0" : "translate-y-1.5"
					}`}
				/>
			</div>
		</button>
	);
}
