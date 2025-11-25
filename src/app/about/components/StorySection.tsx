import Image from "next/image";

interface StorySectionProps {
  darkMode: boolean;
}

export function StorySection({ darkMode }: StorySectionProps) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="md:w-1/2">
        <h2 className={`text-3xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Our Story
        </h2>
        <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} space-y-4`}>
          <p>
            Hey! We&apos;re Aiden and Kundan. We experienced firsthand the challenge of finding
            high-quality, centralized practice materials for Science Olympiad. After spent countless
            hours searching for past tests, we decided to build the platform we wished we had: a
            comprehensive, accessible, and user-friendly test-taking platform that would empower
            students to excel.
          </p>
        </div>
      </div>
      <div className="md:w-1/2 flex justify-center items-center">
        <div className="relative group cursor-pointer overflow-hidden rounded-2xl">
          <Image
            src="/about/hylas.png"
            alt="Hylas the Cat - Our mascot"
            width={320}
            height={320}
            className="w-80 h-80 object-cover transition-transform duration-300 group-hover:scale-110"
            style={{ objectPosition: "center 80%" }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          >
            <div className="text-white text-center p-4">
              <p className="font-bold text-lg">Hylas the Cat</p>
              <p>Our coolest mascot!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
