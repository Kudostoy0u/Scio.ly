"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import AuthButton from '@/app/components/AuthButton';
// ToastContainer is globally provided in Providers
import { usePathname } from 'next/navigation';
import { Upload, SquarePlus, Chrome as ChromeIcon, Smartphone, MonitorSmartphone, CheckCircle2, AlertTriangle, X as CloseIcon, Compass } from 'lucide-react';
import { FaFirefoxBrowser } from 'react-icons/fa';

export default function Header() {
  const { darkMode, setDarkMode } = useTheme();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isChromium, setIsChromium] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const installPromptRef = useRef<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [scrollOpacity, setScrollOpacity] = useState(0);

  // Determine if we're on the homepage
  const isHomePage = pathname === '/';
  const isDashboard = pathname?.startsWith('/dashboard');
  
  // Handle scroll events to change header appearance
  const handleScroll = () => {
    const threshold = 300; // px until fully opaque
    const currentY = window.scrollY || 0;
    const progress = Math.min(currentY / threshold, 1);
    setScrollOpacity(progress);
    setScrolled(currentY > threshold);
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
  }, [isFirefox]);

  // Detect environment for PWA instructions
  useEffect(() => {
    const ua = (navigator.userAgent || '').toLowerCase();
    const uaData = (navigator as any).userAgentData;

    // iOS (including iPadOS masquerading as Mac)
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (((navigator as any).platform === 'MacIntel') && (navigator as any).maxTouchPoints > 1);

    // Brand-based detection when available (Chromium browsers expose userAgentData)
    const isChromiumBrand = !!uaData?.brands?.some((b: any) => /Chromium|Google Chrome|Microsoft Edge|Opera|OPR|Brave|Vivaldi|YaBrowser|Samsung Internet/i.test(b.brand));

    // UA fallbacks
    const isEdge = /edg\//.test(ua);
    const isOpera = /opr\//.test(ua);
    const isFirefoxUA = /firefox|fxios/.test(ua);
    const isSamsung = /samsungbrowser/.test(ua);
    const isChromeLikeUA = /chrome|crios|crmo/.test(ua) && !isEdge && !isOpera && !isFirefoxUA;
    const chromiumDetected = isChromiumBrand || isChromeLikeUA || isEdge || isOpera || isSamsung;

    // Safari engine (on macOS/iOS only; avoid misclassifying Chromium as Safari)
    const isSafariEngine = /safari/.test(ua) && !/chrome|crios|crmo|edg|opr|firefox|fxios|brave|electron/.test(ua);

    // On iOS, all browsers use the Safari share-sheet flow for Add to Home Screen
    setIsSafari(isSafariEngine || isIOSDevice);
    setIsChromium(chromiumDetected && !isIOSDevice);
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone;
    setIsStandalone(Boolean(standalone));
    setIsFirefox(isFirefoxUA);

    const beforeInstall = (event: any) => {
      event.preventDefault();
      installPromptRef.current = event;
      setCanPromptInstall(true);
      try {
        (window as any).__deferredInstallPrompt__ = event;
        console.log('[PWA] beforeinstallprompt fired and deferred');
      } catch {}
    };
    const onInstalled = () => {
      installPromptRef.current = null;
      setCanPromptInstall(false);
      setShowInstallModal(false);
      try {
        delete (window as any).__deferredInstallPrompt__;
        console.log('[PWA] appinstalled');
      } catch {}
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Recover any deferred prompt saved earlier (in case the event fired before this component mounted)
  useEffect(() => {
    const deferred = (typeof window !== 'undefined') && (window as any).__deferredInstallPrompt__;
    if (deferred && !installPromptRef.current) {
      installPromptRef.current = deferred;
      setCanPromptInstall(true);
      try {
        console.log('[PWA] recovered deferred beforeinstallprompt from window');
      } catch {}
    }
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
  // Compute dynamic background/border opacity for smooth fade on homepage
  const targetOpacity = 0.95;
  const computedOpacity = isHomePage ? Math.min(scrollOpacity * targetOpacity, targetOpacity) : targetOpacity;
  const backgroundColor = darkMode
    ? `rgba(17, 24, 39, ${computedOpacity})` // gray-900
    : `rgba(255, 255, 255, ${computedOpacity})`;
  const borderColor = computedOpacity === 0
    ? 'transparent'
    : darkMode
      ? `rgba(31, 41, 55, ${computedOpacity})` // gray-800
      : `rgba(229, 231, 235, ${computedOpacity})`; // gray-200
  const showBlur = !isHomePage || computedOpacity > 0.02;

  // Set a static scrollbar context for CSS to style the track consistently
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-scrollbar-context', isHomePage ? 'home' : 'nav');
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute('data-scrollbar-context');
      }
    };
  }, [isHomePage]);

  return (
    <>
      {/* Global ToastContainer handles notifications */}

      <nav
        className={`fixed top-0 left-0 right-0 z-50 ${showBlur ? 'backdrop-blur-sm' : ''} border-b`}
        style={{ backgroundColor, borderBottomColor: borderColor }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-2">
              <Link href={isDashboard ? '/' : '/dashboard'} className="flex items-center">
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
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  shouldBeTransparent
                    ? 'hover:text-gray-700 text-gray-300 backdrop-blur-sm'
                    : '' } ${darkMode
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-700 hover:text-gray-900'
                }`}
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              {!isStandalone && (
              <button
                onClick={() => setShowInstallModal(true)}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  shouldBeTransparent
                    ? 'hover:text-gray-700 text-gray-300 backdrop-blur-sm'
                    : '' } ${darkMode
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-700 hover:text-gray-900'
                }`}
                aria-label="Install app"
              >
                {/* lucide upload icon path */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </button>
              )}
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

      {/* Install / PWA Instructions Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowInstallModal(false)}>
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-xl shadow-xl w-full max-w-md overflow-hidden`} onClick={(e) => e.stopPropagation()}>
            <div className={`px-5 py-4 flex items-center justify-between ${darkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Install Scio.ly App</h2>
              </div>
              <button onClick={() => setShowInstallModal(false)} className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`} aria-label="Close">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              {isStandalone && (
                <div className={`flex items-center gap-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  App is already installed.
                </div>
              )}
              {isSafari ? (
                <div>
                  <div className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <Compass className="w-4 h-7" />
                    <span>Safari (iOS/macOS)</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li className="flex items-center gap-2">
                      <Upload className="w-5 h-7" />
                      Tap the Share button below.
                    </li>
                    <li className="flex items-center gap-2">
                      <SquarePlus className="w-5 h-7" />
                      Scroll and tap Add to Home Screen.
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-7" />
                      Scio.ly app is ready for wherever you go!
                    </li>
                  </ol>
                </div>
              ) : isChromium ? (
                <div>
                  <div className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <ChromeIcon className="w-4 h-4" />
                    <span>Chromium (Chrome/Brave/Edge)</span>
                  </div>
                  {canPromptInstall ? (
                    <ol className="list-decimal pl-5 space-y-1">
                      <li className="flex items-start gap-2">
                        <SquarePlus className="w-5 h-7" />
                        <span>
                          Click{' '}
                          <a
                            href="#"
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!installPromptRef.current) return;
                              try {
                                installPromptRef.current.prompt();
                                const choice = await installPromptRef.current.userChoice?.catch(() => null);
                                console.log('[PWA] userChoice:', choice);
                              } catch (err) {
                                console.log('[PWA] prompt error:', err);
                              }
                              installPromptRef.current = null;
                              setCanPromptInstall(false);
                            }}
                            className="underline font-medium text-blue-500 hover:text-blue-600"
                          >
                            this link
                          </a>
                          {' '}to open the install prompt.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-8 h-8" />
                        <span>Then choose &quot;Install&quot; in the browser dialog to add Scio.ly to your home screen.</span>
                      </li>
                    </ol>
                  ) : (
                    <ol className="list-decimal pl-5 space-y-2 pb-3">
                      <li className="flex items-start gap-3 pb-3">
                        <AlertTriangle className="w-8 h-8" />
                        <span>Install prompt not available. Your browser may not support in-app prompts or the app is already installed.</span>
                      </li>
                    </ol>
                  )}
                </div>
              ) : isFirefox ? (
                <div>
                  <div className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <FaFirefoxBrowser className="w-5 h-5" />
                    <span>Firefox</span>
                  </div>
                  <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Firefox does not support installing this PWA. Please use Safari (iOS/macOS) or a Chromium browser (Chrome/Brave/Edge) to install the app.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Your browser</span>
                  </div>
                  <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Your browser may not support in-app install prompts. Try your browser’s menu and look for “Install app” or “Add to Home screen.”
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
