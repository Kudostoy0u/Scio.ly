"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface PartnershipSectionProps {
	darkMode: boolean;
}

export function PartnershipSection({ darkMode }: PartnershipSectionProps) {
	return (
		<motion.section
			initial={{ opacity: 0 }}
			whileInView={{ opacity: 1 }}
			viewport={{ once: true, amount: 0.1 }}
			transition={{ duration: 0.5 }}
			className={`pt-8 pb-12 px-4 ${darkMode ? "bg-[#020617]" : "bg-white"}`}
		>
			<div className="max-w-7xl mx-auto text-center">
				<h1 className={`text-4xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
					Partnered with
				</h1>
				<div className="flex justify-center">
					<div className="relative overflow-hidden rounded-2xl group cursor-pointer">
						<Image
							src="https://images.squarespace-cdn.com/content/v1/687b232899978b71f862fcc8/8cc56171-779a-457b-bbf5-31f8635109fc/Screenshot+2025-09-02+at+10.25.25%E2%80%AFPM.png?format=1500w"
							alt="SoCal Science Olympiad"
							width={600}
							height={200}
							className="max-w-full h-auto transition-transform duration-300 group-hover:scale-110"
							unoptimized
						/>
						<div
							className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl"
						/>
					</div>
				</div>
			</div>
		</motion.section>
	);
}

