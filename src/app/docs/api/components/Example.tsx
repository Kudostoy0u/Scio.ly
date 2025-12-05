import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";

interface ExampleProps {
	title: string;
	children: React.ReactNode;
	variant?: "request" | "response";
}

export default function Example({
	title,
	children,
	variant = "response",
}: ExampleProps) {
	const { darkMode } = useTheme();

	const getVariantStyles = () => {
		if (variant === "request") {
			return darkMode
				? "bg-yellow-900/20 border-yellow-800"
				: "bg-yellow-50 border-yellow-200";
		}
		return darkMode
			? "bg-green-900/20 border-green-800"
			: "bg-green-50 border-green-200";
	};

	return (
		<div className={`p-4 rounded-lg border ${getVariantStyles()}`}>
			<h4
				className={`font-semibold mb-2 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
			>
				{title}
			</h4>
			<pre className="text-sm overflow-x-auto">
				<code className={`${darkMode ? "text-gray-200" : "text-gray-800"}`}>
					{children}
				</code>
			</pre>
		</div>
	);
}
