    'use client';

import { motion } from "framer-motion";
import Link from "next/link";
import { FaBook, FaPen, FaDiscord, FaInstagram, FaGithub, FaFlask, FaBrain, FaUsers, FaLaptopCode, FaShareAlt, FaEnvelope } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useRouter } from 'next/navigation';
import { FiArrowRight } from "react-icons/fi";
// Toast styles are injected globally by Providers
import Header from '../../components/Header';
import Image from 'next/image';
import { useTheme } from '../../contexts/ThemeContext';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import testimonialsData from '../../../../public/testimonials.json';

export default function HomeClient() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pwaChecked, setPwaChecked] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  // Detect PWA very early and redirect before painting content
  useEffect(() => {
    const standalone = (typeof window !== 'undefined') && (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as any).standalone
    );
    if (standalone) {
      setIsPwa(true);
      router.replace('/dashboard');
    }
    setPwaChecked(true);
  }, [router]);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [emblaRef] = useEmblaCarousel({ loop: true, direction: 'rtl' }, [Autoplay({ playOnInit: true, delay: 3000, stopOnInteraction: false })]);
  const [emblaRefTestimonials] = useEmblaCarousel({ loop: true }, [Autoplay()]);

  useEffect(() => {
    if (!darkMode && buttonRef.current) {
      const button = buttonRef.current;
      button.style.boxShadow = '';
      button.style.border = '';
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark-scrollbar', darkMode);
    document.documentElement.classList.toggle('light-scrollbar', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const titleColor = darkMode ? 'text-blue-400' : 'text-blue-600';

  // While checking or redirecting in PWA mode, render nothing to avoid flicker
  if (!pwaChecked || isPwa) {
    return null;
  }

  return (
    <div className={`relative font-Poppins w-full max-w-full overflow-x-hidden ${darkMode ? 'bg-[#020617]' : 'bg-white'}  cursor-default`}>
      <Header />
      <section className="relative pt-24 md:pt-16 md:min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-start lg:items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full lg:-mt-10">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-5xl lg:text-6xl font-bold mb-6 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}
              >
                Learn by <span className="text-blue-500">doing</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`text-xl lg:text-2xl mb-8 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Study for Science Olympiad with <span className="font-semibold text-blue-500">thousands</span> of practice questions from real competitions.
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
                    className={`group flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all border-2 ${
                      darkMode
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                        : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                    }`}
                  >
                    <FaPen className="w-5 h-5" />
                    Start Practicing
                    <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                  </motion.button>
                </Link>
                <Link href="/about">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ scale: 1.04}}
                    className={`group flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-lg transition-all border-2 ${
                      darkMode
                        ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <FaBook className="w-5 h-5" />
                    Learn More
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50, scale:0.8 }}
              animate={{ opacity: 1, x: 0, scale:0.8 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                <Image
                  src="/frontpage1.jpg"
                  alt="Students taking Science Olympiad test"
                  width={600}
                  height={1000}
                  className="rounded-2xl shadow-2xl"
                  priority
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className={`absolute -top-4 -left-4 p-4 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
                >
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>450k</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Practice Questions</div>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  className={`absolute -bottom-4 -right-4 p-4 rounded-2xl shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
                >
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>1.1k</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>tournaments covered</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Carousel Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto relative">
          <div className="embla" ref={emblaRef} dir="rtl">
            <div className="embla__container">
              {/* Feature 1 */}
              <div className="embla__slide p-4">
                <div className={`p-8 rounded-2xl border h-[300px] flex flex-col items-center text-center ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-lg'}`}>
                  <FaFlask className={`text-4xl mb-4 ${titleColor}`} />
                  <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Full Coverage</h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex-grow`}>We&apos;ve acquired over a thousand tournaments worth of questions for use on this platform - much more than is publicly available</p>
                </div>
              </div>
              {/* Feature 2 */}
              <div className="embla__slide p-4">
                <div className={`p-8 rounded-2xl border h-[300px] flex flex-col items-center text-center ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-lg'}`}>
                  <FaBrain className={`text-4xl mb-4 ${titleColor}`} />
                  <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Smart Explanations</h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex-grow`}>Get instant, detailed explanations for every question using Google&apos;s Gemini 2.5 models</p>
                </div>
              </div>
              {/* Feature 3 */}
              <div className="embla__slide p-4">
                <div className={`p-8 rounded-2xl border h-[300px] flex flex-col items-center text-center ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-lg'}`}>
                  <FaUsers className={`text-4xl mb-4 ${titleColor}`} />
                  <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Analytics</h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex-grow`}>Track your progress - weekly, daily, or all-time. See how you&apos;ve improved, and bookmark questions to come back to</p>
                </div>
              </div>
              {/* Feature 4 */}
              <div className="embla__slide p-4">
                <div className={`p-8 rounded-2xl border h-[300px] flex flex-col items-center text-center ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-lg'}`}>
                  <FaLaptopCode className={`text-4xl mb-4 ${titleColor}`} />
                  <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Study Modes</h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex-grow`}>Choose how you want to practice. Take a timed test similar to game day, or choose unlimited practice for an addictive experience</p>
                </div>
              </div>
              {/* Feature 5 */}
              <div className="embla__slide p-4">
                <div className={`p-8 rounded-2xl border h-[300px] flex flex-col items-center text-center ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200 shadow-lg'}`}>
                  <FaShareAlt className={`text-4xl mb-4 ${titleColor}`} />
                  <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Share a test</h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex-grow`}>Share tests with teammates using unique codes. Collaborate and study together, just like in a real competition</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* By Students For Students Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h2 className={`text-4xl lg:text-5xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                By students, for students
              </h2>
              <p className={`text-lg lg:text-xl leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Brought to you by the Neuqua Valley and Naperville North Science Olympiad teams. 
                We understand the challenges of finding quality practice materials because we&apos;ve been there. 
                Our platform is built from the student perspective, designed to help you succeed in competition.
              </p>
              <p className={`text-base lg:text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                From students who know what it takes to excel in Science Olympiad, to students ready to achieve their goals.
              </p>
            </motion.div>

            {/* Right side - Staggered images */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative h-[400px] lg:h-[500px]"
            >
                             {/* First image - Naperville North (left) */}
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
                   fill
                   className="rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4),0_10px_20px_-5px_rgba(0,0,0,0.3)] object-cover transform hover:scale-105 transition-transform duration-300"
                 />
               </motion.div>

               {/* Second image - Neuqua (right) */}
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
                   fill
                   className="rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.35),0_8px_16px_-4px_rgba(0,0,0,0.25)] object-cover transform hover:scale-105 transition-transform duration-300"
                 />
               </motion.div>
               {/* Third image - Neuqua 3 (left, lower) */}
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
                   fill
                   className="rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.45),0_15px_30px_-8px_rgba(0,0,0,0.35)] object-cover transform hover:scale-105 transition-transform duration-300"
                 />
               </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      {/* Testimonials Carousel Section */}
      <section className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-4xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Testimonials</h2>
          <div className="embla" ref={emblaRefTestimonials}>
            <div className="embla__container">
              {testimonialsData.map((testimonial, index) => (
                <div className="embla__slide p-4" key={index}>
                  <div className={`p-6 md:p-8 rounded-2xl border h-[280px] flex flex-col justify-between ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-gray-200'}`}>
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} italic text-sm md:text-base`}>&quot;{testimonial.quote}&quot;</p>
                    <div className="mt-4">
                      <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{testimonial.student}</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{testimonial.school}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5 }}
        className={`py-20 px-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
      >
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-5xl font-bold mb-16 text-center ${titleColor}`}>Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03, boxShadow: darkMode ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`rounded-xl p-6 border ${
                darkMode
                  ? 'bg-gray-800/50 border-gray-700'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <h3 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {index === 0 ? 'Where do the questions come from?' :
                   index === 1 ? 'How is AI being used?' :
                   index === 2 ? 'Is this an official practice platform?' :
                   'How can I contribute?'}
                </h3>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  {index === 0 ? 'Our questions are sourced from real Science Olympiad tests and resources, ensuring a comprehensive and diverse question bank.' :
                   index === 1 ? 'AI is primarily used for grading free response, providing explanations, and processing reports. Excluding MatSci, all questions are from real Science Olympiad tests - AI isn\'t being used to generate them.' :
                   index === 2 ? 'No, Scio.ly is not endorsed by Science Olympiad Inc. Our platform provides practice materials based on past exams but we do not make any guarantees about content on future exams.' :
                   'We welcome contributions! Check out our GitHub repository to see how you can help improve the platform, suggest features, or report issues. You can also help by sending feedback through our contact form.'}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'} border-t`}>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div>
              <Link href="/" className="flex items-center">
                <Image
                  src="/site-logo.png"
                  alt="Scio.ly Logo"
                  width={32}
                  height={32}
                  className="mr-2"
                />
                <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Scio.ly</span>
              </Link>
              <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Making Science Olympiad practice accessible to everyone. 
              </p>
            </div>
            <div>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/practice" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Practice
                  </Link>
                </li>
                <li>
                  <Link href="/about" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Other Tools</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/bookmarks" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Bookmarks
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Reports
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/legal/privacy" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/legal/terms" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}>
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Connect</h3>
              <div className="flex space-x-4">
                <a 
                  href="https://discord.gg/hXSkrD33gu" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}
                  aria-label="Discord"
                >
                  <FaDiscord className="w-6 h-6" />
                </a>
                <a 
                  href="https://www.instagram.com/Scio.ly" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}
                  aria-label="Instagram"
                >
                  <FaInstagram className="w-6 h-6" />
                </a>
                <a 
                  href="https://github.com/NapervilleASK/Scio.ly-Help" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}
                  aria-label="GitHub"
                >
                  <FaGithub className="w-6 h-6" />
                </a>
                <a 
                  href="mailto:team.scio.ly@gmail.com" 
                  className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} `}
                  aria-label="Email"
                >
                  <FaEnvelope className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
          <div className={`mt-8 pt-8 border-t text-sm ${darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'} flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0`}>
            <p>© {new Date().getFullYear()} Scio.ly. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .embla { overflow: hidden; }
        .embla__container { display: flex; gap: 1rem; }
        .embla__slide { flex: 0 0 30%; min-width: 0; }
        @media (max-width: 1024px) { .embla__slide { flex: 0 0 45%; } }
        @media (max-width: 768px) { .embla__slide { flex: 0 0 80%; } }
      `}</style>
    </div>
  );
}


