"use client";

import AuthButton from "@/app/components/AuthButton";
import { useTheme } from "@/app/contexts/ThemeContext";
// import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { InstallModal } from "./Header/components/InstallModal";
import { Logo } from "./Header/components/Logo";
import {
	HamburgerButton,
	InstallButton,
	ThemeToggleButton,
} from "./Header/components/mobileButtons";
import {
	DesktopNavLinks,
	MobileMoreSection,
	MobileNavLinks,
	MoreDropdown,
} from "./Header/components/navigationLinks";
import {
	detectBrowserTypes,
	isClickOnToggleButton,
} from "./Header/utils/browserDetection";
import {
	computeBackgroundColor,
	computeBorderColor,
	computeHeaderOpacity,
	shouldShowBlur,
} from "./Header/utils/headerStyles";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface HeaderProps {
	logoOffsetClassName?: string;
	leftAddon?: React.ReactNode;
	hideMobileNav?: boolean;
}

export default function Header({
	logoOffsetClassName,
	leftAddon,
	hideMobileNav = false,
}: HeaderProps) {
	const { darkMode, setDarkMode } = useTheme();
	const [showInstallModal, setShowInstallModal] = useState(false);
	const [isSafari, setIsSafari] = useState(false);
	const [isChromium, setIsChromium] = useState(false);
	const [isFirefox, setIsFirefox] = useState(false);
	const [isStandalone, setIsStandalone] = useState(false);
	const [canPromptInstall, setCanPromptInstall] = useState(false);
	const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
	const pathname = usePathname();
	const dropdownRef = useRef<HTMLDivElement>(null);
	const moreDropdownRef = useRef<HTMLDivElement | null>(null);
	const [scrollOpacity, setScrollOpacity] = useState(0);

	const [headerOpacity, setHeaderOpacity] = useState(1);

	const isHomePage = pathname === "/";
	const isDashboard = pathname?.startsWith("/dashboard");
	const isTestPage =
		pathname?.startsWith("/test") ||
		pathname?.startsWith("/codebusters") ||
		pathname?.startsWith("/unlimited");
	const isTeamsPage = pathname?.startsWith("/teams");

	// const [bannerVisible, setBannerVisible] = useState<boolean | null>(null);
	const bannerVisible = false;

	// useEffect(() => {
	// 	if (isDashboard || isHomePage) {
	// 		const checkBannerVisibility = () => {
	// 			const bannerClosed =
	// 				SyncLocalStorage.getItem("hylas-banner-closed") === "true";
	// 			setBannerVisible(!bannerClosed);
	// 		};

	// 		checkBannerVisibility();

	// 		window.addEventListener("storage", checkBannerVisibility);
	// 		window.addEventListener("banner-closed", checkBannerVisibility);
	// 		return () => {
	// 			window.removeEventListener("storage", checkBannerVisibility);
	// 			window.removeEventListener("banner-closed", checkBannerVisibility);
	// 		};
	// 	}
	// 	return undefined;
	// }, [isDashboard, isHomePage]);

	const handleScroll = useCallback(() => {
		const currentY = window.scrollY || 0;

		if (isTestPage) {
			const fadeThreshold = 100; // px until header starts fading
			const fadeProgress = Math.max(
				0,
				Math.min(1, (currentY - fadeThreshold) / 100),
			);
			const nextOpacity = Math.max(0, 1 - fadeProgress);
			setHeaderOpacity(nextOpacity);
			setScrolled(currentY > fadeThreshold);
		} else {
			const threshold = 300; // px until fully opaque
			const progress = Math.min(currentY / threshold, 1);
			setScrollOpacity(progress);
			setScrolled(currentY > threshold);
		}
	}, [isTestPage]);

	useEffect(() => {
		window.addEventListener("scroll", handleScroll);

		handleScroll();

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, [handleScroll]);

	useEffect(() => {
		const ua = (navigator.userAgent || "").toLowerCase();
		const browserTypes = detectBrowserTypes(ua);

		setIsSafari(browserTypes.isSafari);
		setIsChromium(browserTypes.isChromium);
		setIsStandalone(browserTypes.isStandalone);
		setIsFirefox(browserTypes.isFirefox);

		const beforeInstall = (event: Event) => {
			event.preventDefault();
			installPromptRef.current = event as BeforeInstallPromptEvent;
			setCanPromptInstall(true);
			try {
				(
					window as Window & { __deferredInstallPrompt__?: Event }
				).__deferredInstallPrompt__ = event;
			} catch {
				// Ignore errors when setting deferred install prompt
			}
		};

		const onInstalled = () => {
			installPromptRef.current = null;
			setCanPromptInstall(false);
			setShowInstallModal(false);
			try {
				(
					window as Window & { __deferredInstallPrompt__?: Event }
				).__deferredInstallPrompt__ = undefined;
			} catch {
				// Ignore errors when clearing deferred install prompt
			}
		};

		window.addEventListener("beforeinstallprompt", beforeInstall);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", beforeInstall);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);

	useEffect(() => {
		const deferred =
			typeof window !== "undefined" &&
			(window as Window & { __deferredInstallPrompt__?: Event })
				.__deferredInstallPrompt__;
		if (deferred && !installPromptRef.current) {
			installPromptRef.current = deferred as BeforeInstallPromptEvent;
			setCanPromptInstall(true);
			try {
				// Install prompt handling
			} catch {
				// Ignore errors when handling install prompt
			}
		}
	}, []);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as HTMLElement;

			const isClickOutsideDropdown = (
				ref: React.RefObject<HTMLDivElement | null>,
				evt: MouseEvent,
			): boolean => {
				return (
					ref.current !== null && !ref.current.contains(evt.target as Node)
				);
			};

			if (isClickOutsideDropdown(dropdownRef, event)) {
				if (
					!isClickOnToggleButton(
						target,
						'button[aria-label="Toggle mobile menu"]',
					)
				) {
					setMobileMenuOpen(false);
				}
			}

			if (isClickOutsideDropdown(moreDropdownRef, event)) {
				if (
					!isClickOnToggleButton(
						target,
						'button[aria-label="Toggle more menu"]',
					)
				) {
					setMoreDropdownOpen(false);
				}
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const closeMobileMenu = useCallback(() => {
		setMobileMenuOpen(false);
	}, []);

	const closeMoreDropdown = useCallback(() => {
		setMoreDropdownOpen(false);
	}, []);

	const shouldBeTransparent = isHomePage && !scrolled;

	const handleInstallPrompt = useCallback(async () => {
		if (!installPromptRef.current) {
			return;
		}
		try {
			installPromptRef.current.prompt();
			await installPromptRef.current.userChoice?.catch(() => null);
		} catch {
			// User dismissed the prompt or an error occurred
		}
		installPromptRef.current = null;
		setCanPromptInstall(false);
	}, []);

	const computedOpacity = computeHeaderOpacity(
		isTestPage,
		isHomePage,
		headerOpacity,
		scrollOpacity,
	);
	const backgroundColor = computeBackgroundColor(darkMode, computedOpacity);
	const borderColor = computeBorderColor(darkMode, computedOpacity);
	const showBlur = shouldShowBlur(isHomePage, isTestPage, computedOpacity);

	useEffect(() => {
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute(
				"data-scrollbar-context",
				isHomePage ? "home" : "nav",
			);
		}
		return () => {
			if (typeof document !== "undefined") {
				document.documentElement.removeAttribute("data-scrollbar-context");
			}
		};
	}, [isHomePage]);

	return (
		<>
			{/* Global ToastContainer handles notifications */}

			<nav
				className={`fixed left-0 right-0 z-50 ${showBlur ? "backdrop-blur-sm" : ""} border-b transition-[top] duration-300 ease-out`}
				style={{
					top: (isDashboard || isHomePage) && bannerVisible ? "32px" : "0px",
					transition:
						(isDashboard || isHomePage) && bannerVisible
							? "none"
							: "top 0.3s ease-out",
					backgroundColor,
					borderBottomColor: borderColor,
					opacity: isTestPage ? computedOpacity : 1,

					pointerEvents:
						isTestPage && computedOpacity <= 0.01 ? "none" : "auto",
				}}
			>
				<div className="w-full">
					<div
						className={`${isTeamsPage ? "flex justify-between items-center h-16 pl-5 pr-5 md:pl-28 md:pr-4" : "container mx-auto flex justify-between items-center h-16 pl-5 pr-4"}`}
					>
						<div className="flex items-center gap-2">
							<div className={logoOffsetClassName ?? ""}>
								<Logo
									darkMode={darkMode}
									shouldBeTransparent={shouldBeTransparent}
									isDashboard={isDashboard}
								/>
							</div>
							{leftAddon}
						</div>

						{/* Desktop Navigation */}
						<div className="hidden md:flex items-center space-x-1">
							<DesktopNavLinks darkMode={darkMode} pathname={pathname} />
							<MoreDropdown
								darkMode={darkMode}
								pathname={pathname}
								moreDropdownOpen={moreDropdownOpen}
								moreDropdownRef={moreDropdownRef}
								onMoreDropdownToggle={() =>
									setMoreDropdownOpen(!moreDropdownOpen)
								}
								onMoreDropdownClose={closeMoreDropdown}
							/>
							<AuthButton />
						</div>

						{/* Mobile menu button */}
						{!hideMobileNav && (
							<div className="md:hidden flex items-center space-x-2">
								{isTeamsPage && <AuthButton />}
								<ThemeToggleButton
									darkMode={darkMode}
									shouldBeTransparent={shouldBeTransparent}
									onThemeToggle={() => setDarkMode(!darkMode)}
								/>
								<InstallButton
									darkMode={darkMode}
									shouldBeTransparent={shouldBeTransparent}
									isStandalone={isStandalone}
									onInstallClick={() => setShowInstallModal(true)}
								/>
								<HamburgerButton
									darkMode={darkMode}
									shouldBeTransparent={shouldBeTransparent}
									mobileMenuOpen={mobileMenuOpen}
									onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
								/>
							</div>
						)}
					</div>

					{/* Mobile Navigation */}
					<AnimatePresence>
						{!hideMobileNav && mobileMenuOpen && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								className={`md:hidden border-t ${
									darkMode
										? "border-gray-700 bg-gray-900"
										: "border-gray-200 bg-white"
								}`}
								ref={dropdownRef}
							>
								<div className="px-2 pt-2 pb-3 space-y-1">
									<MobileNavLinks
										darkMode={darkMode}
										pathname={pathname}
										onClose={closeMobileMenu}
									/>
									<MobileMoreSection
										darkMode={darkMode}
										pathname={pathname}
										onClose={closeMobileMenu}
									/>

									<div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700 px-2">
										<AuthButton />
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</nav>

			<InstallModal
				isOpen={showInstallModal}
				darkMode={darkMode}
				isSafari={isSafari}
				isChromium={isChromium}
				isFirefox={isFirefox}
				isStandalone={isStandalone}
				canPromptInstall={canPromptInstall}
				installPromptRef={installPromptRef}
				onClose={() => setShowInstallModal(false)}
				onInstallPrompt={handleInstallPrompt}
			/>
		</>
	);
}
