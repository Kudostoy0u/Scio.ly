import { useRouter } from "next/navigation";

interface ContactSectionProps {
  darkMode: boolean;
}

export function ContactSection({ darkMode }: ContactSectionProps) {
  const router = useRouter();

  return (
    <>
      <h2 className={`text-2xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
        Want to get in touch?
      </h2>
      <p className={`${darkMode ? "text-gray-300" : "text-gray-700"} mb-6 max-w-2xl mx-auto`}>
        We&apos;d love to hear from you! Whether you have questions, feedback, or just want to say
        hello, our team is here to help.
      </p>
      <button
        type="button"
        className={`px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${darkMode ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700" : "bg-blue-500 text-white shadow-lg hover:bg-blue-600"}`}
        onClick={() => router.push("/contact")}
      >
        Contact Us
      </button>
    </>
  );
}
