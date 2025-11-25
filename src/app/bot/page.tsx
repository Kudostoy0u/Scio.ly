"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/themeContext";
import { useEffect, useState } from "react";

interface CommandsTableProps {
  darkMode: boolean;
}

const CommandsTable = ({ darkMode }: CommandsTableProps) => {
  const commands = [
    {
      command: "/mcq [event name] [division] [difficulty] [subtopic]",
      description: "Sends a multiple choice question for you to solve",
      usage: "Required: Event name\nOptional: Division, Difficulty, Subtopic",
    },
    {
      command: "/frq [event name] [division] [difficulty] [subtopic]",
      description: "Sends a free response question for you to solve",
      usage: "Required: Event name\nOptional: Division, Difficulty, Subtopic",
    },
    {
      command: "/check [question_id] [answer]",
      description: "Check your answer to a question",
      usage: "Required: Question ID, Your answer",
    },
    {
      command: "/explain [question_id]",
      description: "Get an AI-generated explanation for a question",
      usage: "Required: Question ID",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full border-collapse border ${
          darkMode ? "border-gray-600" : "border-gray-300"
        }`}
      >
        <thead>
          <tr className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}>
            <th className="border px-4 py-3 text-left font-semibold">Command</th>
            <th className="border px-4 py-3 text-left font-semibold">Description</th>
            <th className="border px-4 py-3 text-left font-semibold">How to use</th>
          </tr>
        </thead>
        <tbody>
          {commands.map((cmd) => (
            <tr
              key={cmd.command}
              className={`${
                darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <td
                className={`border px-4 py-3 font-mono text-sm ${
                  darkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {cmd.command}
              </td>
              <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {cmd.description}
              </td>
              <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                {cmd.usage.split("\n").map((line, idx) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: Static usage text lines, index is stable
                    key={idx}
                  >
                    {line}
                    {idx < cmd.usage.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface DivisionSubtopicTableProps {
  darkMode: boolean;
}

const DivisionSubtopicTable = ({ darkMode }: DivisionSubtopicTableProps) => {
  const firstTableHeaders = [
    "Anatomy - Endocrine",
    "Anatomy - Nervous",
    "Anatomy - Sense Organs",
    "Astronomy",
    "Chemistry Lab",
    "Circuit Lab",
    "Designer Genes",
    "Disease Detectives",
    "Dynamic Planet - Oceanography",
  ];

  const firstTableRows = [
    [
      "Hormones",
      "Brain",
      "Eyes",
      "Solar System",
      "Stoichiometry",
      "Circuits",
      "Genetics",
      "Epidemiology",
      "Ocean Circulation",
    ],
    [
      "Glands",
      "Spinal Cord",
      "Ears",
      "Stars",
      "Periodicity",
      "Sensors",
      "DNA",
      "Pathogens",
      "Marine Life",
    ],
    [
      "Regulation",
      "Nerves",
      "Nose",
      "Galaxies",
      "Equilibrium",
      "Calibration",
      "Proteins",
      "Prevention",
      "Chemistry",
    ],
    [
      "Feedback",
      "Reflexes",
      "Tongue",
      "Cosmology",
      "Redox Reactions",
      "Design",
      "Evolution",
      "Outbreak Investigation",
      "Geology",
    ],
    [
      "Development",
      "Neurotransmitters",
      "Skin",
      "Instruments",
      <div key="chemistry-dropdown" className="relative">
        <details className="cursor-pointer">
          <summary className={`font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
            + More
          </summary>
          <div
            className={`absolute top-full left-0 z-10 mt-1 p-2 rounded border shadow-lg ${
              darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
            }`}
          >
            <div className={`space-y-1 text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <div>• Aqueous Solutions</div>
              <div>• Acids and Bases</div>
              <div>• Physical Properties</div>
              <div>• Thermodynamics</div>
              <div>• Gas Laws</div>
              <div>• Kinetics</div>
              <div>• Electrochemistry</div>
            </div>
          </div>
        </details>
      </div>,
      "Troubleshooting",
      "Population Genetics",
      "Statistics",
      "Climate",
    ],
  ];

  return (
    <div>
      <table
        className={`w-full border-collapse border text-xs ${
          darkMode ? "border-gray-600" : "border-gray-300"
        }`}
      >
        <thead>
          <tr className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}>
            {firstTableHeaders.map((header) => (
              <th key={header} className="border px-2 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr
            className={`${
              darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
            }`}
          >
            {["Div. B", "Div. B", "Div. B", "-", "-", "Div. B", "-", "Div. B", "Div. B"].map(
              (div, idx) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static table data, index is stable
                  key={idx}
                  className={`border px-2 py-1 text-center ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {div}
                </td>
              )
            )}
          </tr>
          <tr
            className={`${
              darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
            }`}
          >
            {[
              "Div. C",
              "Div. C",
              "Div. C",
              "Div. C",
              "Div. C",
              "Div. C",
              "Div. C",
              "Div. C",
              "Div. C",
            ].map((div, idx) => (
              <td
                // biome-ignore lint/suspicious/noArrayIndexKey: Static table data, index is stable
                key={idx}
                className={`border px-2 py-1 text-center ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {div}
              </td>
            ))}
          </tr>
          {firstTableRows.map((row, index) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: Static table rows, index is stable
              key={index}
              className={`${
                darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static table cells, index is stable
                  key={cellIndex}
                  className={`border px-2 py-1 text-center ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SecondDivisionSubtopicTable = ({ darkMode }: DivisionSubtopicTableProps) => {
  const secondTableHeaders = [
    "Entomology",
    "Forensics",
    "Heredity",
    "Meteorology",
    "Metric Mastery",
    "Potions and Poisons",
    "Rocks and Minerals",
    "Solar System",
    "Water Quality - Freshwater",
  ];

  const secondTableRows = [
    [
      "Insect Anatomy",
      "Evidence Analysis",
      "Genetics",
      "Weather Systems",
      "Estimation",
      "Toxicology",
      "Igneous",
      "Planets",
      "PH",
    ],
    [
      "Life Cycles",
      "Fingerprints",
      "DNA",
      "Clouds",
      "Orders of Magnitude",
      "Pharmacology",
      "Sedimentary",
      "Moons",
      "Dissolved Oxygen",
    ],
    [
      "Behavior",
      "DNA",
      "Proteins",
      "Percipitation",
      "Problem Solving",
      "Dosage",
      "Metamorphic",
      "Asteroids",
      "Nutrients",
    ],
    [
      "Classification",
      "Toxicology",
      "Evolution",
      "Temperature",
      "Scientific Reasoning",
      "Symptoms",
      "Mineral Properties",
      "Comets",
      "Pollutants",
    ],
    [
      "Ecology",
      "Crime Scene",
      "Population Genetics",
      "Pressure",
      "Calculations",
      "Antidotes",
      "Crystal Systems",
      "Galaxies",
      "Testing",
    ],
  ];

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full border-collapse border text-xs ${
          darkMode ? "border-gray-600" : "border-gray-300"
        }`}
      >
        <thead>
          <tr className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}>
            {secondTableHeaders.map((header) => (
              <th key={header} className="border px-2 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr
            className={`${
              darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
            }`}
          >
            {[
              "Div. B",
              "-",
              "Div. B",
              "Div. B",
              "Div. B",
              "Div. B",
              "Div. B",
              "Div. B",
              "Div. B",
            ].map((div, idx) => (
              <td
                // biome-ignore lint/suspicious/noArrayIndexKey: Static table data, index is stable
                key={idx}
                className={`border px-2 py-1 text-center ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {div}
              </td>
            ))}
          </tr>
          <tr
            className={`${
              darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
            }`}
          >
            {["Div. C", "Div. C", "-", "-", "-", "-", "Div. C", "-", "Div. C"].map((div, idx) => (
              <td
                // biome-ignore lint/suspicious/noArrayIndexKey: Static table data, index is stable
                key={idx}
                className={`border px-2 py-1 text-center ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {div}
              </td>
            ))}
          </tr>
          {secondTableRows.map((row, index) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: Static table rows, index is stable
              key={index}
              className={`${
                darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {row.map((cell, cellIndex) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static table cells, index is stable
                  key={cellIndex}
                  className={`border px-2 py-1 text-center ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function DocsPage() {
  const { darkMode } = useTheme();
  const [mounted] = useState(() => {
    if (typeof window !== "undefined") {
      return true;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark-scrollbar", darkMode);
    document.documentElement.classList.toggle("light-scrollbar", !darkMode);
  }, [darkMode]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background */}
      <div className={`fixed inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`} />

      <Header />

      {/* Main Content */}
      <main className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 w-full">
        <div
          className={`p-8 rounded-xl ${
            darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"
          }`}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className={`text-4xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Scio.ly Bot (Hylas, the Cat) Documentation
            </h1>
            <a
              href="https://discord.com/oauth2/authorize?client_id=1400979720614711327&permissions=8&integration_type=0&scope=bot+applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors ${
                darkMode ? "hover:bg-blue-500" : "hover:bg-blue-700"
              }`}
            >
              Click here to add to server
            </a>
          </div>

          {/* Commands Section */}
          <div className="mb-12">
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
              List of commands:
            </h2>
            <CommandsTable darkMode={darkMode} />
          </div>

          {/* Division & Subtopic Table */}
          <div className="mb-12">
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Division & Subtopic Table:
            </h2>
            <p className={`mb-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              For{" "}
              <code
                className={`px-2 py-1 rounded ${
                  darkMode ? "bg-gray-700 text-blue-400" : "bg-gray-100 text-blue-600"
                }`}
              >
                /mcq
              </code>{" "}
              or{" "}
              <code
                className={`px-2 py-1 rounded ${
                  darkMode ? "bg-gray-700 text-blue-400" : "bg-gray-100 text-blue-600"
                }`}
              >
                /frq
              </code>
              , only choose divisions or subtopics that have green cells (or else the bot will
              choose randomly for you).
            </p>
            <DivisionSubtopicTable darkMode={darkMode} />
          </div>

          {/* Second Table */}
          <div className="mb-12">
            <SecondDivisionSubtopicTable darkMode={darkMode} />
          </div>

          {/* Credits */}
          <div className={`border-t pt-8 ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
            <h2 className={`text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Credits:
            </h2>
            <div className={`space-y-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              <p>
                <strong>Bot developer:</strong> Matthew (Discord: mat_thew0812)
              </p>
              <p>
                <strong>Bot API and questions from:</strong> Scio.ly
              </p>
              <p>Special thanks to Alan (Discord: alaninnovates) for helping to set up the bot.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
