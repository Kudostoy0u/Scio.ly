import { useTheme } from "@/app/contexts/themeContext";

interface ParamProps {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

export default function Param({ name, type, required, description }: ParamProps) {
  const { darkMode } = useTheme();

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <code
            className={`${darkMode ? "text-gray-100" : "text-gray-900"} font-mono text-sm font-semibold`}
          >
            {name}
          </code>
          <span className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-sm italic`}>
            {type}
          </span>
          {required ? (
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-md font-semibold">
              required
            </span>
          ) : (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-md font-semibold">
              optional
            </span>
          )}
        </div>
        <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} text-sm mt-1`}>
          {description}
        </p>
      </div>
    </div>
  );
}
