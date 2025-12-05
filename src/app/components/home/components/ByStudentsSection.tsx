"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface ByStudentsSectionProps {
	darkMode: boolean;
}

export function ByStudentsSection({ darkMode }: ByStudentsSectionProps) {
	return (
		<section className={`py-20 px-4 sm:px-6 lg:px-8 ${darkMode ? "bg-[#020617]" : "bg-white"}`}>
			<div className="max-w-7xl mx-auto">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
					<motion.div
						initial={{ opacity: 0, x: -50 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true, amount: 0.3 }}
						transition={{ duration: 0.8 }}
						className="space-y-6"
					>
						<h2
							className={`text-4xl lg:text-5xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
						>
							By students, for students
						</h2>
						<p
							className={`text-lg lg:text-xl leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}
						>
							Brought to you by a team of Science Olympiad competitors and alumni across the USA. We understand the challenges of finding quality
							practice materials because we&apos;ve been there. Our platform is
							built from the student perspective, designed to help you succeed
							in competition.
						</p>
						<p
							className={`text-base lg:text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}
						>
							From students who know what it takes to excel in Science Olympiad,
							to students ready to achieve their goals.
						</p>
					</motion.div>
					<motion.div
						initial={{ opacity: 0, x: 50 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true, amount: 0.3 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="relative h-[400px] lg:h-[500px]"
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
							whileInView={{ opacity: 1, scale: 1, rotate: -9 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{ duration: 0.6, delay: 0.4 }}
							className="absolute top-0 left-0 w-48 h-48 lg:w-64 lg:h-64 z-30"
						>
							<Image
								src="/scrapbook/scrapbook-1.png"
								alt="Naperville North Science Olympiad team"
								fill={true}
								sizes="(min-width: 1024px) 16rem, 12rem"
								className="rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4),0_10px_20px_-5px_rgba(0,0,0,0.3)] object-cover transform hover:scale-105 transition-transform duration-300"
							/>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, scale: 0.8, rotate: 2 }}
							whileInView={{ opacity: 1, scale: 1, rotate: 6 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{ duration: 0.6, delay: 0.6 }}
							className="absolute top-16 right-0 w-48 h-48 lg:w-64 lg:h-64 z-20"
						>
							<Image
								src="/scrapbook/scrapbook-2.png"
								alt="Neuqua Valley Science Olympiad team"
								fill={true}
								sizes="(min-width: 1024px) 16rem, 12rem"
								className="rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.35),0_8px_16px_-4px_rgba(0,0,0,0.25)] object-cover transform hover:scale-105 transition-transform duration-300"
							/>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, scale: 0.8, rotate: -1 }}
							whileInView={{ opacity: 1, scale: 1, rotate: -5 }}
							viewport={{ once: true, amount: 0.3 }}
							transition={{ duration: 0.6, delay: 0.8 }}
							className="absolute bottom-[-50px] left-16 w-48 h-48 lg:w-64 lg:h-64 z-10"
						>
							<Image
								src="/scrapbook/scrapbook-3.jpg"
								alt="Neuqua Valley Science Olympiad competition"
								fill={true}
								sizes="(min-width: 1024px) 16rem, 12rem"
								className="rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.45),0_15px_30px_-8px_rgba(0,0,0,0.35)] object-cover transform hover:scale-105 transition-transform duration-300"
							/>
						</motion.div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
