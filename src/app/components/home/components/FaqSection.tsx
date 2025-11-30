"use client";
import { motion } from "framer-motion";
import Link from "next/link";

interface FaqSectionProps {
  darkMode: boolean;
  titleColor: string;
}

const faqs = [
  {
    id: "faq-questions-source",
    question: "Where do the questions come from?",
    answer: (
      <>
        Our questions are sourced from real Science Olympiad tests and resources, ensuring a
        comprehensive and diverse question bank. We only use{" "}
        <Link
          href="/certified"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 underline"
        >
          approved tests
        </Link>{" "}
        for use on our platform.
      </>
    ),
  },
  {
    id: "faq-ai-usage",
    question: "How is AI being used?",
    answer:
      "AI is primarily used for grading free response, providing explanations, and processing reports. With exceptions*, all questions are from real Science Olympiad tests - AI isn't being used to generate them.",
  },
  {
    id: "faq-official",
    question: "Is this an official practice platform?",
    answer:
      "No, Scio.ly is not endorsed by Science Olympiad Inc. We have a partnership with the Southern California Science Olympiad and take pride in being a community-driven platform",
  },
  {
    id: "faq-contribute",
    question: "How can I contribute?",
    answer:
      "We welcome contributions! Check out our GitHub repository to see how you can help improve the platform, suggest features, or report issues. You can also help by sending feedback through our contact form.",
  },
];

export function FaqSection({ darkMode, titleColor }: FaqSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5 }}
      className={`py-20 px-4 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <div className="max-w-7xl mx-auto">
        <h2 className={`text-5xl font-bold mb-16 text-center ${titleColor}`}>
          Frequently Asked Questions
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className={`rounded-xl p-6 border ${
                darkMode ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200 shadow-sm"
              }`}
            >
              <h3
                className={`text-xl font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                {faq.question}
              </h3>
              <p className={darkMode ? "text-gray-300" : "text-gray-600"}>{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
