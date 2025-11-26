"use client";

import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FaBook,
  FaBrain,
  FaDiscord,
  FaEnvelope,
  FaFlask,
  FaGithub,
  FaInstagram,
  FaLaptopCode,
  FaPen,
  FaShareAlt,
  FaUsers,
} from "react-icons/fa";
import { FiArrowRight } from "react-icons/fi";

import testimonialsData from "@/../public/testimonials.json";
import { useTheme } from "@/app/contexts/themeContext";

interface Testimonial {
  quote: string;
  student: string;
  school: string;
}
import HylasBanner from "@/app/dashboard/components/HylasBanner";
import Header from "@components/Header";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";

export default function HomeClient() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pwaChecked, setPwaChecked] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [bannerVisible, setBannerVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) {
      setIsPwa(true);
      router.replace("/dashboard");
    }
    setPwaChecked(true);
  }, [router]);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [emblaRef] = useEmblaCarousel({ loop: true, direction: "rtl" }, [
    Autoplay({ playOnInit: true, delay: 3000, stopOnInteraction: false }),
  ]);
  const [emblaRefTestimonials] = useEmblaCarousel({ loop: true }, [Autoplay()]);

  useEffect(() => {
    if (!darkMode && buttonRef.current) {
      const button = buttonRef.current;
      button.style.boxShadow = "";
      button.style.border = "";
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-scrollbar", darkMode);
    document.documentElement.classList.toggle("light-scrollbar", !darkMode);
  }, [darkMode]);

  // Sync banner visibility with localStorage and events (same as dashboard/header)
  useEffect(() => {
    const checkBannerVisibility = () => {
      const bannerClosed = SyncLocalStorage.getItem("hylas-banner-closed") === "true";
      setBannerVisible(!bannerClosed);
    };
    checkBannerVisibility();
    window.addEventListener("storage", checkBannerVisibility);
    window.addEventListener("banner-closed", checkBannerVisibility);
    return () => {
      window.removeEventListener("storage", checkBannerVisibility);
      window.removeEventListener("banner-closed", checkBannerVisibility);
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }
    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const titleColor = darkMode ? "text-blue-400" : "text-blue-600";

  // Helper function to render hero text content
  const renderHeroTextContent = () => (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`text-5xl lg:text-6xl font-bold mb-6 ${darkMode ? "text-gray-100" : "text-gray-900"}`}
      >
        Learn by <span className="text-blue-500">doing</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`text-xl lg:text-2xl mb-8 leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}
      >
        Study for Science Olympiad with{" "}
        <span className="font-semibold text-blue-500">thousands</span> of practice questions from
        real competitions.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
      >
        <Link href="/dashboard">
          <motion.button
            ref={buttonRef}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all border-2 bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
          >
            <FaPen className="w-5 h-5" />
            Practice Now
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </motion.button>
        </Link>
        <Link href="/about">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 1.04 }}
            className={`group flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all border-2 ${
              darkMode
                ? "border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white"
                : "border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900"
            }`}
          >
            <FaBook className="w-5 h-5" />
            Learn More
          </motion.button>
        </Link>
      </motion.div>
    </motion.div>
  );

  // Helper function to render hero stat badge
  const renderHeroStatBadge = (
    value: string,
    label: string,
    colorClass: string,
    position: "top-left" | "bottom-right",
    delay: number
  ) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={`absolute ${position === "top-left" ? "-top-4 -left-4" : "-bottom-4 -right-4"} p-4 rounded-2xl shadow-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}
    >
      <div className="text-center">
        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
        <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{label}</div>
      </div>
    </motion.div>
  );

  // Helper function to render hero image section
  const renderHeroImageSection = () => (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 0.8 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative"
    >
      <div className="relative">
        <Image
          src="/frontpage.jpg"
          alt="Students taking Science Olympiad test"
          width={600}
          height={1000}
          className="rounded-2xl shadow-2xl"
          priority={true}
        />
        {renderHeroStatBadge(
          "450k",
          "Practice Questions",
          darkMode ? "text-blue-400" : "text-blue-600",
          "top-left",
          1
        )}
        {renderHeroStatBadge(
          "1.1k",
          "tournaments covered",
          darkMode ? "text-green-400" : "text-green-600",
          "bottom-right",
          1.2
        )}
      </div>
    </motion.div>
  );

  // Helper function to render hero section
  const renderHeroSection = () => (
    <section className={`relative ${bannerVisible ? "pt-28" : "pt-24"} md:min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-start lg:items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full lg:-mt-10">
          {renderHeroTextContent()}
          {renderHeroImageSection()}
        </div>
      </div>
    </section>
  );

  // Helper function to render features carousel
  const renderFeaturesCarousel = () => (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto relative">
        <div className="embla" ref={emblaRef} dir="rtl">
          <div className="embla__container">
            {[
              {
                icon: FaFlask,
                title: "Full Coverage",
                description:
                  "We've acquired over a thousand tournaments worth of questions for use on this platform - much more than is publicly available",
              },
              {
                icon: FaBrain,
                title: "Smart Explanations",
                description:
                  "Get instant, detailed explanations for every question using Google's Gemini 2.5 models",
              },
              {
                icon: FaUsers,
                title: "Analytics",
                description:
                  "Track your progress - weekly, daily, or all-time. See how you've improved, and bookmark questions to come back to",
              },
              {
                icon: FaLaptopCode,
                title: "Study Modes",
                description:
                  "Choose how you want to practice. Take a timed test similar to game day, or choose unlimited practice for an addictive experience",
              },
              {
                icon: FaShareAlt,
                title: "Share a test",
                description:
                  "Share tests with teammates using unique codes. Collaborate and study together, just like in a real competition",
              },
            ].map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.title} className="embla__slide p-4">
                  <div
                    className={`p-8 rounded-2xl border h-[300px] flex flex-col items-center text-center ${darkMode ? "bg-gray-800/50 border-gray-700/50" : "bg-white border-gray-200 shadow-lg"}`}
                  >
                    <IconComponent className={`text-4xl mb-4 ${titleColor}`} />
                    <h3
                      className={`text-2xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {feature.title}
                    </h3>
                    <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} flex-grow`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );

  // Helper function to render "By Students For Students" section
  const renderByStudentsSection = () => (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h2
              className={`text-4xl lg:text-5xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              By students, for students
            </h2>
            <p
              className={`text-lg lg:text-xl leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}
            >
              Brought to you by the Neuqua Valley and Naperville North Science Olympiad teams. We
              understand the challenges of finding quality practice materials because we&apos;ve
              been there. Our platform is built from the student perspective, designed to help you
              succeed in competition.
            </p>
            <p className={`text-base lg:text-lg ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              From students who know what it takes to excel in Science Olympiad, to students ready
              to achieve their goals.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[400px] lg:h-[500px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -9 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute top-0 left-0 w-48 h-48 lg:w-64 lg:h-64 z-30"
            >
              <Image
                src="/scrapbook/scrapbook-1.png"
                alt="Naperville North Science Olympiad team"
                fill={true}
                sizes="(min-width: 1024px) 16rem, 12rem"
                className="rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4),0_10px_20px_-5px_rgba(0,0,0,0.3)] object-cover transform hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 2 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 6 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute top-16 right-0 w-48 h-48 lg:w-64 lg:h-64 z-20"
            >
              <Image
                src="/scrapbook/scrapbook-2.png"
                alt="Neuqua Valley Science Olympiad team"
                fill={true}
                sizes="(min-width: 1024px) 16rem, 12rem"
                className="rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.35),0_8px_16px_-4px_rgba(0,0,0,0.25)] object-cover transform hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -1 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -5 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute bottom-[-50px] left-16 w-48 h-48 lg:w-64 lg:h-64 z-10"
            >
              <Image
                src="/scrapbook/scrapbook-3.jpg"
                alt="Neuqua Valley Science Olympiad competition"
                fill={true}
                sizes="(min-width: 1024px) 16rem, 12rem"
                className="rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.45),0_15px_30px_-8px_rgba(0,0,0,0.35)] object-cover transform hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );

  // Helper function to render testimonials section
  const renderTestimonialsSection = () => (
    <section className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className={`text-4xl font-bold mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Testimonials
        </h2>
        <div className="embla" ref={emblaRefTestimonials}>
          <div className="embla__container">
            {(testimonialsData as Testimonial[]).map((testimonial, index) => (
              <div
                className="embla__slide p-4"
                key={`testimonial-${index}-${testimonial.student || index}`}
              >
                <div
                  className={`p-6 md:p-8 rounded-2xl border h-[280px] flex flex-col justify-between ${darkMode ? "bg-gray-800/50 border-gray-700/50" : "bg-white border-gray-200"}`}
                >
                  <p
                    className={`${darkMode ? "text-gray-300" : "text-gray-700"} italic text-sm md:text-base`}
                  >
                    &quot;{testimonial.quote}&quot;
                  </p>
                  <div className="mt-4">
                    <h4 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                      {testimonial.student}
                    </h4>
                    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      {testimonial.school}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  // Helper function to render FAQ section
  const renderFaqSection = () => {
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
              className={`${darkMode ? "text-blue-300 hover:text-blue-200" : "text-blue-600 hover:text-blue-700"} underline`}
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
          "AI is primarily used for grading free response, providing explanations, and processing reports. Excluding MatSci, all questions are from real Science Olympiad tests - AI isn't being used to generate them.",
      },
      {
        id: "faq-official",
        question: "Is this an official practice platform?",
        answer:
          "No, Scio.ly is not endorsed by Science Olympiad Inc. Our platform provides practice materials based on past exams but we do not make any guarantees about content on future exams.",
      },
      {
        id: "faq-contribute",
        question: "How can I contribute?",
        answer:
          "We welcome contributions! Check out our GitHub repository to see how you can help improve the platform, suggest features, or report issues. You can also help by sending feedback through our contact form.",
      },
    ];

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
  };

  // Helper function to get footer link classes
  const getFooterLinkClasses = (): string => {
    return darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900";
  };

  // Helper function to render footer logo section
  const renderFooterLogo = () => (
    <div>
      <Link href="/" className="flex items-center">
        <Image
          src="https://res.cloudinary.com/djilwi4nh/image/upload/v1760504427/site-logo_lzc8t0.png"
          alt="Scio.ly Logo"
          width={32}
          height={32}
          className="mr-2"
        />
        <span className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
          Scio.ly
        </span>
      </Link>
      <p className={`mt-4 text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        Making Science Olympiad practice accessible to everyone.
      </p>
    </div>
  );

  // Helper function to render footer link list
  const renderFooterLinkList = (links: Array<{ href: string; label: string }>) => (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className={`${getFooterLinkClasses()} `}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  // Helper function to render footer section
  const renderFooterSection = (title: string, links: Array<{ href: string; label: string }>) => (
    <div>
      <h3 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>{title}</h3>
      {renderFooterLinkList(links)}
    </div>
  );

  // Helper function to render footer social links
  const renderFooterSocialLinks = () => (
    <div className="flex space-x-4">
      {[
        { href: "https://discord.gg/hXSkrD33gu", icon: FaDiscord, label: "Discord" },
        { href: "https://www.instagram.com/Scio.ly", icon: FaInstagram, label: "Instagram" },
        {
          href: "https://github.com/NapervilleASK/Scio.ly-Help",
          icon: FaGithub,
          label: "GitHub",
        },
        { href: "mailto:team.scio.ly@gmail.com", icon: FaEnvelope, label: "Email" },
      ].map((social) => {
        const IconComponent = social.icon;
        return (
          <a
            key={social.label}
            href={social.href}
            target={social.href.startsWith("mailto:") ? undefined : "_blank"}
            rel={social.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
            className={`${getFooterLinkClasses()} `}
            aria-label={social.label}
          >
            <IconComponent className="w-6 h-6" />
          </a>
        );
      })}
    </div>
  );

  // Helper function to render footer
  const renderFooter = () => (
    <footer
      className={`${darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200"} border-t`}
    >
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {renderFooterLogo()}
          {renderFooterSection("Quick Links", [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/practice", label: "Practice" },
            { href: "/about", label: "About" },
          ])}
          {renderFooterSection("Other Tools", [
            { href: "/bookmarks", label: "Bookmarks" },
            { href: "/docs", label: "Documentation" },
            { href: "/reports", label: "Reports" },
          ])}
          {renderFooterSection("Legal", [
            { href: "/legal/privacy", label: "Privacy Policy" },
            { href: "/legal/terms", label: "Terms of Service" },
            { href: "/contact", label: "Contact" },
          ])}
          <div>
            <h3 className={`font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Connect
            </h3>
            {renderFooterSocialLinks()}
          </div>
        </div>
        <div
          className={`mt-8 pt-8 border-t text-sm ${darkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-600"} flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0`}
        >
          <p>© {new Date().getFullYear()} Scio.ly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );

  if (!pwaChecked || isPwa) {
    return null;
  }

  return (
    <div
      className={`relative font-Poppins w-full max-w-full overflow-x-hidden ${darkMode ? "bg-[#020617]" : "bg-white"}  cursor-default`}
    >
      {bannerVisible && (
        <HylasBanner
          onClose={() => {
            try {
              SyncLocalStorage.setItem("hylas-banner-closed", "true");
              window.dispatchEvent(new CustomEvent("banner-closed"));
            } catch (error) {
              logger.error("Failed to close banner:", error);
            }
            setBannerVisible(false);
          }}
        />
      )}
      <div
        className={bannerVisible ? "relative" : ""}
        style={bannerVisible ? { marginTop: "32px" } : {}}
      >
        <Header />
      </div>
      {renderHeroSection()}
      {renderFeaturesCarousel()}
      {renderByStudentsSection()}
      {renderTestimonialsSection()}
      {renderFaqSection()}
      {renderFooter()}

      <style>{`
        .embla { overflow: hidden; }
        .embla__container { display: flex; gap: 1rem; }
        .embla__slide { flex: 0 0 30%; min-width: 0; }
        @media (max-width: 1024px) { .embla__slide { flex: 0 0 45%; } }
        @media (max-width: 768px) { .embla__slide { flex: 0 0 80%; } }
      `}</style>
    </div>
  );
}
