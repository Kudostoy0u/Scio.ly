"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";

type Props = {
	icon: React.ReactNode;
	title: string;
	id: string;
};

export default function SectionHeader({ icon, title, id }: Props) {
	const { darkMode } = useTheme();
	return (
		<h2
			id={id}
			className={`flex items-center gap-3 text-2xl font-bold mt-8 mb-6 pb-2 border-b ${
				darkMode
					? "text-gray-100 border-gray-700"
					: "text-gray-900 border-gray-200"
			}`}
		>
			{icon}
			{title}
		</h2>
	);
}
