"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useEffect, useState } from "react";

export default function DocsPage() {
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse border ${
                  darkMode ? "border-gray-600" : "border-gray-300"
                }`}
              >
                <thead>
                  <tr
                    className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
                  >
                    <th className="border px-4 py-3 text-left font-semibold">Command</th>
                    <th className="border px-4 py-3 text-left font-semibold">Description</th>
                    <th className="border px-4 py-3 text-left font-semibold">How to use</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className={`${
                      darkMode
                        ? "border-gray-600 hover:bg-gray-700"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <td
                      className={`border px-4 py-3 font-mono text-sm ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      /mcq [event name] [division] [difficulty] [subtopic]
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Sends a multiple choice question for you to solve
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Required: Event name
                      <br />
                      Optional: Division, Difficulty, Subtopic
                    </td>
                  </tr>
                  <tr
                    className={`${
                      darkMode
                        ? "border-gray-600 hover:bg-gray-700"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <td
                      className={`border px-4 py-3 font-mono text-sm ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      /frq [event name] [division] [difficulty] [subtopic]
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Sends a free response question for you to solve
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Required: Event name
                      <br />
                      Optional: Division, Difficulty, Subtopic
                    </td>
                  </tr>
                  <tr
                    className={`${
                      darkMode
                        ? "border-gray-600 hover:bg-gray-700"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <td
                      className={`border px-4 py-3 font-mono text-sm ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      /check [question_id] [answer]
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Check your answer to a question
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Required: Question ID, Your answer
                    </td>
                  </tr>
                  <tr
                    className={`${
                      darkMode
                        ? "border-gray-600 hover:bg-gray-700"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <td
                      className={`border px-4 py-3 font-mono text-sm ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      /explain [question_id]
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Get an AI-generated explanation for a question
                    </td>
                    <td className={`border px-4 py-3 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Required: Question ID
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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

            <div>
              <table
                className={`w-full border-collapse border text-xs ${
                  darkMode ? "border-gray-600" : "border-gray-300"
                }`}
              >
                <thead>
                  <tr
                    className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
                  >
                    <th className="border px-2 py-2 text-left font-semibold">Anatomy - Endocrine</th>
                    <th className="border px-2 py-2 text-left font-semibold">Anatomy - Nervous</th>
                    <th className="border px-2 py-2 text-left font-semibold">Anatomy - Sense Organs</th>
                    <th className="border px-2 py-2 text-left font-semibold">Astronomy</th>
                    <th className="border px-2 py-2 text-left font-semibold">Chemistry Lab</th>
                    <th className="border px-2 py-2 text-left font-semibold">Circuit Lab</th>
                    <th className="border px-2 py-2 text-left font-semibold">Designer Genes</th>
                    <th className="border px-2 py-2 text-left font-semibold">Disease Detectives</th>
                    <th className="border px-2 py-2 text-left font-semibold">
                      Dynamic Planet - Oceanography
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className={`${
                      darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
                    }`}
                  >
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                  </tr>
                  <tr
                    className={`${
                      darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
                    }`}
                  >
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                  </tr>
                  {/* Subtopic rows */}
                  {[
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
                          <summary
                            className={`font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                          >
                            + More
                          </summary>
                          <div
                            className={`absolute top-full left-0 z-10 mt-1 p-2 rounded border shadow-lg ${
                              darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
                            }`}
                          >
                            <div
                              className={`space-y-1 text-xs ${
                                darkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
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
                  ].map((row, index) => (
                    <tr
                      key={index}
                      className={`${
                        darkMode
                          ? "border-gray-600 hover:bg-gray-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
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
          </div>

          {/* Second Table */}
          <div className="mb-12">
            <div className="overflow-x-auto">
              <table
                className={`w-full border-collapse border text-xs ${
                  darkMode ? "border-gray-600" : "border-gray-300"
                }`}
              >
                <thead>
                  <tr
                    className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
                  >
                    <th className="border px-2 py-2 text-left font-semibold">Entomology</th>
                    <th className="border px-2 py-2 text-left font-semibold">Forensics</th>
                    <th className="border px-2 py-2 text-left font-semibold">Heredity</th>
                    <th className="border px-2 py-2 text-left font-semibold">Meteorology</th>
                    <th className="border px-2 py-2 text-left font-semibold">Metric Mastery</th>
                    <th className="border px-2 py-2 text-left font-semibold">Potions and Poisons</th>
                    <th className="border px-2 py-2 text-left font-semibold">Rocks and Minerals</th>
                    <th className="border px-2 py-2 text-left font-semibold">Solar System</th>
                    <th className="border px-2 py-2 text-left font-semibold">
                      Water Quality - Freshwater
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className={`${
                      darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
                    }`}
                  >
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. B
                    </td>
                  </tr>
                  <tr
                    className={`${
                      darkMode ? "border-gray-600 bg-green-900/20" : "border-gray-300 bg-green-50"
                    }`}
                  >
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      -
                    </td>
                    <td
                      className={`border px-2 py-1 text-center ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Div. C
                    </td>
                  </tr>
                  {/* Subtopic rows */}
                  {[
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
                  ].map((row, index) => (
                    <tr
                      key={index}
                      className={`${
                        darkMode
                          ? "border-gray-600 hover:bg-gray-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
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
