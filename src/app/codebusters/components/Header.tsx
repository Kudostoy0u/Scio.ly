import { formatTime } from "@/app/codebusters/cipher-utils";
import type React from "react";

interface HeaderProps {
	darkMode: boolean;
	timeLeft: number | null;
	isTestSubmitted?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
	darkMode,
	timeLeft,
	isTestSubmitted = false,
}) => {
	return (
		<>
			<header className="w-full max-w-[90vw] md:max-w-6xl flex justify-between items-center pt-3 pb-0">
				<div className="flex items-center flex-1 min-w-0">
					<h1
						className={`text-lg md:text-xl lg:text-3xl font-extrabold break-words ${darkMode ? "text-blue-400" : "text-blue-600"}`}
					>
						Codebusters
					</h1>
				</div>
				<div className="flex items-center gap-4 flex-shrink-0">
					{timeLeft !== null && (
						<div
							className={`text-lg md:text-xl font-semibold ${
								isTestSubmitted
									? "text-gray-500"
									: timeLeft <= 300
										? "text-red-600"
										: darkMode
											? "text-white"
											: "text-blue-600"
							}`}
						>
							{formatTime(timeLeft)}
						</div>
					)}
				</div>
			</header>
		</>
	);
};
