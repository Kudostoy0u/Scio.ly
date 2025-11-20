import { useTheme } from "@/app/contexts/ThemeContext";

interface InfoBoxProps {
  children: React.ReactNode;
}

export function InfoBox({ children }: InfoBoxProps) {
  const { darkMode } = useTheme();

  return (
    <div
      className={`border-l-4 border-blue-500 p-4 rounded-r-lg ${
        darkMode ? "bg-blue-900/20" : "bg-blue-50"
      }`}
    >
      <div className={`text-sm ${darkMode ? "text-blue-200" : "text-blue-800"}`}>{children}</div>
    </div>
  );
}

export function WarningBox({ children }: InfoBoxProps) {
  const { darkMode } = useTheme();

  return (
    <div
      className={`border-l-4 border-yellow-500 p-4 rounded-r-lg ${
        darkMode ? "bg-yellow-900/20" : "bg-yellow-50"
      }`}
    >
      <div className={`text-sm ${darkMode ? "text-yellow-200" : "text-yellow-800"}`}>{children}</div>
    </div>
  );
}
