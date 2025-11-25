import Image from "next/image";

interface MethodologyCardProps {
  darkMode: boolean;
  icon: string;
  alt: string;
  width: number;
  height: number;
  title: string;
  description: string;
  className?: string;
}

export function MethodologyCard({
  darkMode,
  icon,
  alt,
  width,
  height,
  title,
  description,
  className = "",
}: MethodologyCardProps) {
  return (
    <div
      className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/50"} p-4 rounded-lg text-center ${className}`}
    >
      <div className="flex justify-center mb-3">
        <Image src={icon} alt={alt} width={width} height={height} />
      </div>
      <h3 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{title}</h3>
      <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-sm`}>{description}</p>
    </div>
  );
}
