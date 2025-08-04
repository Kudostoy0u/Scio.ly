"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import AuthButton from '@/app/components/AuthButton';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { darkMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine if we're on the homepage
  const isHomePage = pathname === '/';
  
  // Handle scroll events to change header appearance
  const handleScroll = () => {
    if (window.scrollY > 300) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };
  
  useEffect(() => {
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check for scroll position
    handleScroll();
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close if the click is not on the hamburger button itself
        const target = event.target as HTMLElement;
        const hamburgerButton = target.closest('button[aria-label="Toggle mobile menu"]');
        if (!hamburgerButton) {
          setMobileMenuOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getLinkStyles = (path: string) => {
    const isActive = pathname === path;
    const baseStyles = 'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200';
    const activeStyles = isActive
      ? darkMode
        ? 'text-white font-semibold'
        : 'text-gray-900 font-semibold'
      : darkMode
        ? 'text-gray-300 hover:text-white'
        : 'text-gray-700 hover:text-gray-900';
    return `${baseStyles} ${activeStyles}`;
  };

  const mobileLinkStyles = (path: string) => {
    const isActive = pathname === path;
    const baseMobile = 'block px-4 py-2 text-sm ';
    const activeStyles = isActive
      ? darkMode
        ? 'text-white font-semibold'
        : 'text-gray-900 font-semibold'
      : darkMode
        ? 'text-gray-300 hover:text-white'
        : 'text-gray-700 hover:text-gray-900';
    return `${baseMobile} ${activeStyles}`;
  };



  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const shouldBeTransparent = isHomePage && !scrolled;
  const navBgClass = shouldBeTransparent
    ? 'bg-transparent'
    : darkMode
      ? 'bg-gray-900/95 backdrop-blur-sm border-b border-gray-800'
      : 'bg-white/95 backdrop-blur-sm border-b border-gray-200';

  return (
    <>
      <ToastContainer theme={darkMode || shouldBeTransparent ? "dark" : "light"} />

      <nav className={`fixed top-0 w-screen z-50  ${navBgClass}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center">
                <Image
                  src="/site-logo.png"
                  alt="Scio.ly Logo"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                <span className={`ml-2 text-xl font-bold hidden md:block ${
                  shouldBeTransparent ? darkMode ? 'text-white' : 'text-gray-900' : darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Scio.ly
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <Link href="/practice" className={getLinkStyles('/practice')}>
                Practice
              </Link>
              <Link href="/dashboard" className={getLinkStyles('/dashboard')}>
                Dashboard
              </Link>
              <Link href="/leaderboard" className={getLinkStyles('/leaderboard')}>
                Leaderboards
              </Link>
              <Link href="/about" className={getLinkStyles('/about')}>
                About
              </Link>
              <Link href="/contact" className={getLinkStyles('/contact')}>
                Contact
              </Link>
              <AuthButton />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              <Link
                href="/contact"
                className={`p-2 rounded-md transition-colors duration-200 ${
                  shouldBeTransparent
                    ? 'hover:text-gray-700 text-gray-300 backdrop-blur-sm'
                    : '' } ${darkMode
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  shouldBeTransparent
                    ? 'hover:text-gray-700 text-gray-300 backdrop-blur-sm'
                    : ''} ${darkMode
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-700 hover:text-gray-900'
                }`}
                aria-label="Toggle mobile menu"
              >
                <div className="w-5 h-5 relative flex items-center justify-center">
                  <span className={`absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    mobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
                  }`}></span>
                  <span className={`absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    mobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                  }`}></span>
                  <span className={`absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out ${
                    mobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
                  }`}></span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`md:hidden border-t ${
                  darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
                }`}
                ref={dropdownRef}
              >
                <div className="px-2 pt-2 pb-3 space-y-1">
                  <Link href="/practice" className={mobileLinkStyles('/practice')} onClick={closeMobileMenu}>
                    Practice
                  </Link>
                  <Link href="/dashboard" className={mobileLinkStyles('/dashboard')} onClick={closeMobileMenu}>
                    Dashboard
                  </Link>
                  <Link href="/leaderboard" className={mobileLinkStyles('/leaderboard')} onClick={closeMobileMenu}>
                    Leaderboards
                  </Link>
                  <Link href="/about" className={mobileLinkStyles('/about')} onClick={closeMobileMenu}>
                    About
                  </Link>
                  <Link href="/contact" className={mobileLinkStyles('/contact')} onClick={closeMobileMenu}>
                    Contact
                  </Link>
                  <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700 px-2">
                    <AuthButton />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
}
