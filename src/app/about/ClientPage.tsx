"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Lightbulb, Rocket } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AboutClientPage() {
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

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
      <div className={`fixed inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`} />
      <Header />
      <main className="relative z-10 pt-36 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1
            className={`text-4xl sm:text-5xl font-bold mb-6 ${darkMode ? "text-white" : "text-black"}`}
          >
            About <span className="text-blue-500">Scio.ly</span>
          </h1>
          <p className={`text-xl max-w-3xl mx-auto ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            We&apos;re on a mission to make Science Olympiad practice accessible, engaging, and
            effective for students everywhere.
          </p>
        </div>

        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto ${darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"}`}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h2 className={`text-3xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Our Story
              </h2>
              <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} space-y-4`}>
                <p>
                  Hey! We&apos;re Aiden and Kundan. We experienced firsthand the challenge of
                  finding high-quality, centralized practice materials for Science Olympiad. After
                  spent countless hours searching for past tests, we decided to build the platform
                  we wished we had: a comprehensive, accessible, and user-friendly test-taking
                  platform that would empower students to excel.
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
        </section>

        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto ${darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"}`}
        >
          <h2
            className={`text-3xl font-bold mb-6 text-center ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            Our Methodology
          </h2>
          <div className="max-w-4xl mx-auto">
            <p className={`text-center text-lg mb-8 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              We sourced thousands of previous Science Olympiad tournament archives from associates
              in test trading. Then, we ran PDF and .docx files through processing and the latest
              Gemini 2.5 models to extract questions and get answers, which are served through a
              custom API.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div
                className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/50"} p-4 rounded-lg text-center`}
              >
                <div className="flex justify-center mb-3">
                  <Image
                    src="/about/file.svg"
                    alt="PDF Files"
                    width={50}
                    height={50}
                    className="filter invert"
                  />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  PDF Processing
                </h3>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-sm`}>
                  Extract questions from tournament archives
                </p>
              </div>
              <div
                className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/50"} p-4 rounded-lg text-center`}
              >
                <div className="flex justify-center mb-3">
                  <Image
                    src="/about/google-icon.png"
                    alt="Google Gemini 2.5"
                    width={50}
                    height={50}
                  />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Gemini 2.5 AI
                </h3>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-sm`}>
                  Advanced AI processing & answer generation
                </p>
              </div>
              <div
                className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/50"} p-4 rounded-lg text-center`}
              >
                <div className="flex justify-center mb-3 space-x-2">
                  <Image
                    src={darkMode ? "/about/cog-white.png" : "/about/cog-black.png"}
                    alt="Processing"
                    width={40}
                    height={40}
                  />
                  <Image src="/about/postgresql-icon.png" alt="PostgreSQL" width={40} height={40} />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Processing & Storage
                </h3>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-sm`}>
                  Filter, validate & store in PostgreSQL
                </p>
              </div>
              <div
                className={`${darkMode ? "bg-gray-700/50" : "bg-gray-100/50"} p-4 rounded-lg text-center`}
              >
                <div className="flex justify-center mb-3 space-x-2">
                  <Image
                    src={darkMode ? "/about/vercel-white.png" : "/about/vercel-icon.svg"}
                    alt="Vercel"
                    width={35}
                    height={35}
                  />
                  <Image
                    src={darkMode ? "/about/nextjs-white.png" : "/about/nextjs-black.png"}
                    alt="Next.js Frontend"
                    width={35}
                    height={35}
                  />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Deployment & Frontend
                </h3>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"} text-sm`}>
                  Vercel serves Next.js frontend
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto ${darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"}`}
        >
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
                platform is designed to provide students with thousands of real test questions,
                allowing them to actively engage with the material and develop a deep understanding
                of the concepts.
              </p>
            </div>
            <div>
              <h3 className={`text-xl font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Accessibility for All
              </h3>
              <p className={`${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                We are committed to making Science Olympiad preparation accessible to everyone.
                Scio.ly is a free platform, ensuring that all students, regardless of their
                background or school&apos;s resources, have the opportunity to succeed.
              </p>
            </div>
          </div>
        </section>

        <section
          className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto ${darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"}`}
        >
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
        </section>

        <section
          className={`mb-16 p-6 rounded-xl text-center max-w-4xl mx-auto ${darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"}`}
        >
          <h2 className={`text-2xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Want to get in touch?
          </h2>
          <p className={`${darkMode ? "text-gray-300" : "text-gray-700"} mb-6 max-w-2xl mx-auto`}>
            We&apos;d love to hear from you! Whether you have questions, feedback, or just want to
            say hello, our team is here to help.
          </p>
          <button
            type="button"
            className={`px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${darkMode ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700" : "bg-blue-500 text-white shadow-lg hover:bg-blue-600"}`}
            onClick={() => router.push("/contact")}
          >
            Contact Us
          </button>
        </section>
      </main>

      <style jsx={true}>{""}</style>
    </div>
  );
}
