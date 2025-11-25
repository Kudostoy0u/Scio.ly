import { MethodologyCard } from "./MethodologyCard";
import { MethodologyCardWithIcons } from "./MethodologyCardWithIcons";

interface MethodologySectionProps {
  darkMode: boolean;
}

export function MethodologySection({ darkMode }: MethodologySectionProps) {
  return (
    <>
      <h2
        className={`text-3xl font-bold mb-6 text-center ${darkMode ? "text-white" : "text-gray-900"}`}
      >
        Our Methodology
      </h2>
      <div className="max-w-4xl mx-auto">
        <p className={`text-center text-lg mb-8 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          We sourced thousands of previous Science Olympiad tournament archives from associates in
          test trading. Then, we ran PDF and .docx files through processing and the latest Gemini
          2.5 models to extract questions and get answers, which are served through a custom API.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MethodologyCard
            darkMode={darkMode}
            icon="/about/file.svg"
            alt="PDF Files"
            width={50}
            height={50}
            title="PDF Processing"
            description="Extract questions from tournament archives"
            className="filter invert"
          />
          <MethodologyCard
            darkMode={darkMode}
            icon="/about/google-icon.png"
            alt="Google Gemini 2.5"
            width={50}
            height={50}
            title="Gemini 2.5 AI"
            description="Advanced AI processing & answer generation"
          />
          <MethodologyCardWithIcons
            darkMode={darkMode}
            icons={[
              {
                src: darkMode ? "/about/cog-white.png" : "/about/cog-black.png",
                alt: "Processing",
                width: 40,
                height: 40,
              },
              {
                src: "/about/postgresql-icon.png",
                alt: "PostgreSQL",
                width: 40,
                height: 40,
              },
            ]}
            title="Processing & Storage"
            description="Filter, validate & store in PostgreSQL"
          />
          <MethodologyCardWithIcons
            darkMode={darkMode}
            icons={[
              {
                src: darkMode ? "/about/vercel-white.png" : "/about/vercel-icon.svg",
                alt: "Vercel",
                width: 35,
                height: 35,
              },
              {
                src: darkMode ? "/about/nextjs-white.png" : "/about/nextjs-black.png",
                alt: "Next.js Frontend",
                width: 35,
                height: 35,
              },
            ]}
            title="Deployment & Frontend"
            description="Vercel serves Next.js frontend"
          />
        </div>
      </div>
    </>
  );
}
