interface PhilosophySectionProps {
  darkMode: boolean;
}

export function PhilosophySection({ darkMode }: PhilosophySectionProps) {
  return (
    <>
      <h2
        className={`text-3xl font-bold mb-6 text-center ${darkMode ? "text-white" : "text-gray-900"}`}
      >
        Our Philosophy
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Learn by Doing
          </h3>
          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            We believe that the most effective way to learn is through hands-on practice. Our
            platform is designed to provide students with thousands of real test questions, allowing
            them to actively engage with the material and develop a deep understanding of the
            concepts.
          </p>
        </div>
        <div>
          <h3 className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Accessibility for All
          </h3>
          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            We are committed to making Science Olympiad preparation accessible to everyone. Scio.ly
            is a free platform, ensuring that all students, regardless of their background or
            school&apos;s resources, have the opportunity to succeed.
          </p>
        </div>
      </div>
    </>
  );
}
