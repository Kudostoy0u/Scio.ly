"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { FaPen } from "react-icons/fa";
import { FaBook } from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";

interface HeroSectionProps {
	darkMode: boolean;
	bannerVisible: boolean;
	buttonRef: React.RefObject<HTMLButtonElement>;
}

export function HeroSection({
	darkMode,
	// bannerVisible,
	buttonRef,
}: HeroSectionProps) {
	// const bannerVisible = false;
	return (
		<section
			className={`relative ${/* bannerVisible ? "pt-28" : */ "pt-24"} md:min-h-screen`}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-start lg:items-center">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full lg:-mt-10">
					<motion.div
						initial={{ opacity: 0, x: -50 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.8 }}
					>
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className={`text-5xl lg:text-6xl font-bold mb-6 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
						>
							Learn by <span className="text-blue-500">doing</span>
						</motion.h1>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className={`text-xl lg:text-2xl mb-8 leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Study for Science Olympiad with{" "}
							<span className="font-semibold text-blue-500">thousands</span> of
							practice questions from real competitions.
						</motion.p>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
							className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
						>
							<Link href="/dashboard">
								<motion.button
									ref={buttonRef}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="group flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all border-2 bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
								>
									<FaPen className="w-5 h-5" />
									Practice Now
									<FiArrowRight className="transition-transform group-hover:translate-x-1" />
								</motion.button>
							</Link>
							<Link href="/about">
								<motion.button
									whileHover={{ scale: 1.08 }}
									whileTap={{ scale: 0.95 }}
									initial={{ scale: 1.04 }}
									className={`group flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all border-2 ${
										darkMode
											? "border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white"
											: "border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900"
									}`}
								>
									<FaBook className="w-5 h-5" />
									Learn More
								</motion.button>
							</Link>
						</motion.div>
					</motion.div>
					<motion.div
						initial={{ opacity: 0, x: 50, scale: 0.8 }}
						animate={{ opacity: 1, x: 0, scale: 0.8 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="relative"
					>
						<div className="relative">
							<Image
								src="/frontpage.jpg"
								alt="Students taking Science Olympiad test"
								width={600}
								height={1000}
								className="rounded-2xl shadow-2xl"
								priority={true}
							/>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
