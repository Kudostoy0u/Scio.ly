import Image from "next/image";

interface MethodologyCardWithIconsProps {
	darkMode: boolean;
	icons: Array<{ src: string; alt: string; width: number; height: number }>;
	title: string;
	description: string;
}

export function MethodologyCardWithIcons({
	darkMode,
	icons,
	title,
	description,
}: MethodologyCardWithIconsProps) {
	return (
		<div
			className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/50"} p-4 rounded-lg text-center`}
		>
			<div className="flex justify-center mb-3 space-x-2">
				{icons.map((icon) => (
					<Image
						key={`${icon.src}-${icon.alt}`}
						src={icon.src}
						alt={icon.alt}
						width={icon.width}
						height={icon.height}
					/>
				))}
			</div>
			<h3
				className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}
			>
				{title}
			</h3>
			<p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-sm`}>
				{description}
			</p>
		</div>
	);
}
