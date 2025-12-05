"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type React from "react";

interface NavigationLinksProps {
	darkMode: boolean;
	pathname: string;
	moreDropdownOpen: boolean;
	moreDropdownRef: React.RefObject<HTMLDivElement | null>;
	onMoreDropdownToggle: () => void;
	onMoreDropdownClose: () => void;
}

export function DesktopNavLinks({
	darkMode,
	pathname,
}: { darkMode: boolean; pathname: string }) {
	const getLinkStyles = (path: string) => {
		const isActive = pathname === path;
		const baseStyles =
			"px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
		const activeStyles = isActive
			? darkMode
				? "text-white font-semibold"
				: "text-gray-900 font-semibold"
			: darkMode
				? "text-gray-300 hover:text-white"
				: "text-gray-700 hover:text-gray-900";
		return `${baseStyles} ${activeStyles}`;
	};

	return (
		<>
			<Link href="/practice" className={getLinkStyles("/practice")}>
				Practice
			</Link>
			<Link href="/dashboard" className={getLinkStyles("/dashboard")}>
				Dashboard
			</Link>
			<Link href="/teams" className={getLinkStyles("/teams")}>
				Teams
			</Link>
			<Link href="/analytics" className={getLinkStyles("/analytics")}>
				Analytics
			</Link>
		</>
	);
}

export function MoreDropdown({
	darkMode,
	pathname,
	moreDropdownOpen,
	moreDropdownRef,
	onMoreDropdownToggle,
	onMoreDropdownClose,
}: NavigationLinksProps) {
	const renderMoreDropdownLink = (href: string, label: string) => {
		const isActive = pathname === href;
		return (
			<Link
				href={href}
				className={`block px-4 py-2 text-sm transition-colors duration-200 ${
					isActive
						? darkMode
							? "text-white bg-gray-700"
							: "text-gray-900 bg-gray-100"
						: darkMode
							? "text-gray-300 hover:text-white hover:bg-gray-700"
							: "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
				}`}
				onClick={onMoreDropdownClose}
			>
				{label}
			</Link>
		);
	};

	return (
		<div className="relative" ref={moreDropdownRef}>
			<button
				type="button"
				onClick={onMoreDropdownToggle}
				className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1 ${
					pathname === "/about" ||
					pathname === "/contact" ||
					pathname === "/join"
						? darkMode
							? "text-white font-semibold"
							: "text-gray-900 font-semibold"
						: darkMode
							? "text-gray-300 hover:text-white"
							: "text-gray-700 hover:text-gray-900"
				}`}
				aria-label="Toggle more menu"
			>
				More
				<ChevronDown
					className={`w-4 h-4 transition-transform duration-200 ${moreDropdownOpen ? "rotate-180" : ""}`}
				/>
			</button>

			<AnimatePresence>
				{moreDropdownOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
							darkMode
								? "bg-gray-800 border border-gray-700"
								: "bg-white border border-gray-200"
						}`}
					>
						{renderMoreDropdownLink("/join", "Join Us")}
						{renderMoreDropdownLink("/contact", "Contact Us")}
						{renderMoreDropdownLink("/about", "About Us")}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export function MobileNavLinks({
	darkMode,
	pathname,
	onClose,
}: {
	darkMode: boolean;
	pathname: string;
	onClose: () => void;
}) {
	const mobileLinkStyles = (path: string) => {
		const isActive = pathname === path;
		const baseMobile = "block px-4 py-2 text-sm ";
		const activeStyles = isActive
			? darkMode
				? "text-white font-semibold"
				: "text-gray-900 font-semibold"
			: darkMode
				? "text-gray-300 hover:text-white"
				: "text-gray-700 hover:text-gray-900";
		return `${baseMobile} ${activeStyles}`;
	};

	return (
		<>
			<Link
				href="/practice"
				className={mobileLinkStyles("/practice")}
				onClick={onClose}
			>
				Practice
			</Link>
			<Link
				href="/dashboard"
				className={mobileLinkStyles("/dashboard")}
				onClick={onClose}
			>
				Dashboard
			</Link>
			<Link
				href="/teams"
				className={mobileLinkStyles("/teams")}
				onClick={onClose}
			>
				Teams
			</Link>
			<Link
				href="/analytics"
				className={mobileLinkStyles("/analytics")}
				onClick={onClose}
			>
				Analytics
			</Link>
		</>
	);
}

export function MobileMoreSection({
	darkMode,
	pathname,
	onClose,
}: {
	darkMode: boolean;
	pathname: string;
	onClose: () => void;
}) {
	const mobileLinkStyles = (path: string) => {
		const isActive = pathname === path;
		const baseMobile = "block px-4 py-2 text-sm ";
		const activeStyles = isActive
			? darkMode
				? "text-white font-semibold"
				: "text-gray-900 font-semibold"
			: darkMode
				? "text-gray-300 hover:text-white"
				: "text-gray-700 hover:text-gray-900";
		return `${baseMobile} ${activeStyles}`;
	};

	return (
		<div className="pt-2 pb-1">
			<div
				className={`px-4 py-1 text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
			>
				MORE
			</div>
			<Link
				href="/join"
				className={mobileLinkStyles("/join")}
				onClick={onClose}
			>
				Join Us
			</Link>
			<Link
				href="/contact"
				className={mobileLinkStyles("/contact")}
				onClick={onClose}
			>
				Contact Us
			</Link>
			<Link
				href="/about"
				className={mobileLinkStyles("/about")}
				onClick={onClose}
			>
				About Us
			</Link>
		</div>
	);
}
