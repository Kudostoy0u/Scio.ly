"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { motion } from "framer-motion";
import { Hammer, Settings } from "lucide-react";

interface NotImplementedProps {
	title: string;
	description: string;
}

export default function NotImplemented({
	title,
	description,
}: NotImplementedProps) {
	const { darkMode } = useTheme();

	return (
		<div className="flex flex-col items-center justify-center py-20 px-4 text-center">
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5 }}
				className="relative mb-8"
			>
				{/* Background Glow */}
				<div
					className={`absolute inset-0 blur-3xl rounded-full ${
						darkMode ? "bg-blue-900/20" : "bg-blue-100/50"
					}`}
				/>

				{/* Animated Graphic */}
				<div className="relative">
					<div
						className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center ${
							darkMode ? "bg-gray-800" : "bg-white"
						} shadow-xl border ${darkMode ? "border-gray-700" : "border-gray-100"}`}
					>
						<motion.div
							animate={{
								rotate: [0, 360],
							}}
							transition={{
								duration: 8,
								repeat: Number.POSITIVE_INFINITY,
								ease: "linear",
							}}
						>
							<Settings
								className={`w-16 h-16 ${darkMode ? "text-blue-400" : "text-blue-500"}`}
							/>
						</motion.div>

						<motion.div
							className="absolute -bottom-2 -right-2"
							animate={{
								y: [0, -5, 0],
								rotate: [0, -10, 0],
							}}
							transition={{
								duration: 2,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}}
						>
							<div
								className={`p-3 rounded-2xl ${
									darkMode ? "bg-gray-700" : "bg-gray-50"
								} shadow-lg border ${darkMode ? "border-gray-600" : "border-gray-200"}`}
							>
								<Hammer
									className={`w-8 h-8 ${darkMode ? "text-yellow-400" : "text-yellow-500"}`}
								/>
							</div>
						</motion.div>
					</div>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.2 }}
			>
				<h2
					className={`text-3xl font-bold mb-4 ${
						darkMode ? "text-white" : "text-gray-900"
					}`}
				>
					{title}
				</h2>
				<p
					className={`text-lg max-w-md mx-auto leading-relaxed ${
						darkMode ? "text-gray-400" : "text-gray-600"
					}`}
				>
					{description}
				</p>

				<motion.div
					className="mt-8 flex justify-center gap-2"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
				>
					{[0, 1, 2].map((i) => (
						<motion.div
							key={i}
							className={`w-2 h-2 rounded-full ${
								darkMode ? "bg-blue-500" : "bg-blue-600"
							}`}
							animate={{
								opacity: [0.3, 1, 0.3],
								scale: [0.8, 1.2, 0.8],
							}}
							transition={{
								duration: 1.5,
								repeat: Number.POSITIVE_INFINITY,
								delay: i * 0.2,
							}}
						/>
					))}
				</motion.div>
			</motion.div>
		</div>
	);
}
