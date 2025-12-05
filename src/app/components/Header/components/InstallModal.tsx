"use client";
import {
	AlertTriangle,
	CheckCircle2,
	Chrome as ChromeIcon,
	X as CloseIcon,
	Compass,
	MonitorSmartphone,
	SquarePlus,
	Upload,
} from "lucide-react";
import type React from "react";
import { FaFirefoxBrowser } from "react-icons/fa";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallModalProps {
	isOpen: boolean;
	darkMode: boolean;
	isSafari: boolean;
	isChromium: boolean;
	isFirefox: boolean;
	isStandalone: boolean;
	canPromptInstall: boolean;
	installPromptRef: React.MutableRefObject<BeforeInstallPromptEvent | null>;
	onClose: () => void;
	onInstallPrompt: () => Promise<void>;
}

export function InstallModal({
	isOpen,
	darkMode,
	isSafari,
	isChromium,
	isFirefox,
	isStandalone,
	canPromptInstall,
	installPromptRef: _unused,
	onClose,
	onInstallPrompt,
}: InstallModalProps) {
	if (!isOpen) {
		return null;
	}

	const renderSafariInstructions = () => (
		<div>
			<div className="text-lg font-semibold flex items-center gap-2 mb-3">
				<Compass className="w-4 h-7" />
				<span>Safari (iOS/macOS)</span>
			</div>
			<ol className="list-decimal pl-5 space-y-1">
				<li className="flex items-center gap-2">
					<Upload className="w-5 h-7" />
					Tap the Share button below.
				</li>
				<li className="flex items-center gap-2">
					<SquarePlus className="w-5 h-7" />
					Scroll and tap Add to Home Screen.
				</li>
				<li className="flex items-center gap-2">
					<CheckCircle2 className="w-5 h-7" />
					Scio.ly app is ready for wherever you go!
				</li>
			</ol>
		</div>
	);

	const renderChromiumInstructions = () => (
		<div>
			<div className="text-lg font-semibold flex items-center gap-2 mb-3">
				<ChromeIcon className="w-4 h-4" />
				<span>Chromium (Chrome/Brave/Edge)</span>
			</div>
			{canPromptInstall ? (
				<ol className="list-decimal pl-5 space-y-1">
					<li className="flex items-start gap-2">
						<SquarePlus className="w-5 h-7" />
						<span>
							Click{" "}
							<button
								type="button"
								onClick={onInstallPrompt}
								className="underline font-medium text-blue-500 hover:text-blue-600"
							>
								this link
							</button>{" "}
							to open the install prompt.
						</span>
					</li>
					<li className="flex items-start gap-2">
						<CheckCircle2 className="w-8 h-8" />
						<span>
							Then choose &quot;Install&quot; in the browser dialog to add
							Scio.ly to your home screen.
						</span>
					</li>
				</ol>
			) : (
				<ol className="list-decimal pl-5 space-y-2 pb-3">
					<li className="flex items-start gap-3 pb-3">
						<AlertTriangle className="w-8 h-8" />
						<span>
							Install prompt not available. Your browser may not support in-app
							prompts or the app is already installed.
						</span>
					</li>
				</ol>
			)}
		</div>
	);

	const renderFirefoxInstructions = () => (
		<div>
			<div className="text-lg font-semibold flex items-center gap-2 mb-3">
				<FaFirefoxBrowser className="w-5 h-5" />
				<span>Firefox</span>
			</div>
			<div className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
				Firefox does not support installing this PWA. Please use Safari
				(iOS/macOS) or a Chromium browser (Chrome/Brave/Edge) to install the
				app.
			</div>
		</div>
	);

	const renderOtherBrowserInstructions = () => (
		<div>
			<div className="flex items-center gap-2 mb-2">
				<MonitorSmartphone className="w-4 h-4" />
				<span>Your browser</span>
			</div>
			<div className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
				Your browser may not support in-app install prompts. Try your
				browser&apos;s menu and look for &quot;Install app&quot; or &quot;Add to
				Home screen.&quot;
			</div>
		</div>
	);

	const renderInstallModalContent = () => {
		if (isSafari) {
			return renderSafariInstructions();
		}
		if (isChromium) {
			return renderChromiumInstructions();
		}
		if (isFirefox) {
			return renderFirefoxInstructions();
		}
		return renderOtherBrowserInstructions();
	};

	return (
		<dialog
			open={true}
			className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-transparent backdrop:bg-[rgba(0,0,0,0.5)]"
			onClick={onClose}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onClose();
				}
			}}
			aria-label="Install app instructions"
		>
			<div
				className={`${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"} rounded-xl shadow-xl w-full max-w-md overflow-hidden`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						onClose();
					}
					e.stopPropagation();
				}}
			>
				<div
					className={`px-5 py-4 flex items-center justify-between ${darkMode ? "border-b border-gray-700" : "border-b border-gray-200"}`}
				>
					<div className="flex items-center gap-2">
						<MonitorSmartphone className="w-5 h-5 text-blue-500" />
						<h2 className="text-lg font-semibold">Install Scio.ly App</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className={`${darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
						aria-label="Close"
					>
						<CloseIcon className="w-5 h-5" />
					</button>
				</div>
				<div className="p-5 space-y-4 text-sm">
					{isStandalone && (
						<div
							className={`flex items-center gap-2 ${darkMode ? "text-green-400" : "text-green-700"}`}
						>
							<CheckCircle2 className="w-4 h-4" />
							App is already installed.
						</div>
					)}
					{renderInstallModalContent()}
				</div>
			</div>
		</dialog>
	);
}
