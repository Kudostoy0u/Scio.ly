"use client";
import Image from "next/image";
import Link from "next/link";

interface LogoProps {
	darkMode: boolean;
	shouldBeTransparent: boolean;
	isDashboard: boolean;
}

export function Logo({
	darkMode,
	shouldBeTransparent,
	isDashboard,
}: LogoProps) {
	return (
		<div className="flex items-center space-x-2">
			<Link
				href={isDashboard ? "/" : "/dashboard"}
				className="flex items-center"
			>
				<Image
					src="https://res.cloudinary.com/djilwi4nh/image/upload/v1760504427/site-logo_lzc8t0.png"
					alt="Scio.ly Logo"
					width={32}
					height={32}
					className="rounded-md"
				/>
				<span
					className={`ml-2 text-xl font-bold hidden md:block ${
						shouldBeTransparent
							? darkMode
								? "text-white"
								: "text-gray-900"
							: darkMode
								? "text-white"
								: "text-gray-900"
					}`}
				>
					Scio.ly
				</span>
			</Link>
		</div>
	);
}
