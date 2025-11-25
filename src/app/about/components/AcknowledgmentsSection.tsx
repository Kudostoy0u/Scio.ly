import { Lightbulb, Rocket } from "lucide-react";

interface AcknowledgmentsSectionProps {
  darkMode: boolean;
}

export function AcknowledgmentsSection({ darkMode }: AcknowledgmentsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      <div
        className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/60"} p-5 rounded-lg flex items-start gap-4`}
      >
        <div
          className={`${darkMode ? "bg-yellow-500/10" : "bg-yellow-100"} rounded-full p-3 flex items-center justify-center`}
        >
          <Lightbulb className="w-7 h-7 text-yellow-500" aria-hidden="true" />
        </div>
        <p className={`${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          <span className="font-semibold">Thanks to Steven</span> for coming up with the idea for
          Scio.ly and helping us start it!
        </p>
      </div>
      <div
        className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/60"} p-5 rounded-lg flex items-start gap-4`}
      >
        <div
          className={`${darkMode ? "bg-blue-500/10" : "bg-blue-100"} rounded-full p-3 flex items-center justify-center`}
        >
          <Rocket className="w-7 h-7 text-blue-500" aria-hidden="true" />
        </div>
        <p className={`${darkMode ? "text-gray-200" : "text-gray-800"}`}>
          <span className="font-semibold">Thanks to Alan</span> for providing{" "}
          <span className="font-semibold">1.1K tournaments</span> for our questions database!
        </p>
      </div>
    </div>
  );
}
