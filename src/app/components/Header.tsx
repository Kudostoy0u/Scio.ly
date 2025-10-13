"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import AuthButton from '@/app/components/AuthButton';

import { usePathname } from 'next/navigation';
import { Upload, SquarePlus, Chrome as ChromeIcon, Smartphone, MonitorSmartphone, CheckCircle2, AlertTriangle, X as CloseIcon, Compass, Download, ChevronDown } from 'lucide-react';
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
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const [scrollOpacity, setScrollOpacity] = useState(0);

  const [headerOpacity, setHeaderOpacity] = useState(1);


  const isHomePage = pathname === '/';
  const isDashboard = pathname?.startsWith('/dashboard');
  const isTestPage = pathname?.startsWith('/test') || pathname?.startsWith('/codebusters') || pathname?.startsWith('/unlimited');
  

  const [bannerVisible, setBannerVisible] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (isDashboard || isHomePage) {
      const checkBannerVisibility = () => {
        const bannerClosed = localStorage.getItem('hylas-banner-closed') === 'true';
        setBannerVisible(!bannerClosed);
      };
      
      checkBannerVisibility();
      

      window.addEventListener('storage', checkBannerVisibility);
      window.addEventListener('banner-closed', checkBannerVisibility);
      return () => {
        window.removeEventListener('storage', checkBannerVisibility);
        window.removeEventListener('banner-closed', checkBannerVisibility);
      };
    }
  }, [isDashboard, isHomePage]);
  

  

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY || 0;
    
    if (isTestPage) {

      const fadeThreshold = 100; // px until header starts fading
      const fadeProgress = Math.max(0, Math.min(1, (currentY - fadeThreshold) / 100));
      const nextOpacity = Math.max(0, 1 - fadeProgress);
      setHeaderOpacity(nextOpacity);
      setScrolled(currentY > fadeThreshold);
    } else {

      const threshold = 300; // px until fully opaque
      const progress = Math.min(currentY / threshold, 1);
      setScrollOpacity(progress);
      setScrolled(currentY > threshold);
    }
  }, [isTestPage]);
  
  useEffect(() => {

    window.addEventListener('scroll', handleScroll);
    

    handleScroll();
    

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isFirefox, isTestPage, handleScroll]);


  useEffect(() => {
    const ua = (navigator.userAgent || '').toLowerCase();
    const uaData = (navigator as any).userAgentData;

    // ios (including ipados masquerading as mac)
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (((navigator as any).platform === 'MacIntel') && (navigator as any).maxTouchPoints > 1);


    const isChromiumBrand = !!uaData?.brands?.some((b: any) => /Chromium|Google Chrome|Microsoft Edge|Opera|OPR|Brave|Vivaldi|YaBrowser|Samsung Internet/i.test(b.brand));


    const isEdge = /edg\//.test(ua);
    const isOpera = /opr\//.test(ua);
    const isFirefoxUA = /firefox|fxios/.test(ua);
    const isSamsung = /samsungbrowser/.test(ua);
    const isChromeLikeUA = /chrome|crios|crmo/.test(ua) && !isEdge && !isOpera && !isFirefoxUA;
    const chromiumDetected = isChromiumBrand || isChromeLikeUA || isEdge || isOpera || isSamsung;


    const isSafariEngine = /safari/.test(ua) && !/chrome|crios|crmo|edg|opr|firefox|fxios|brave|electron/.test(ua);


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
    
      } catch {}
    };
    const onInstalled = () => {
      installPromptRef.current = null;
      setCanPromptInstall(false);
      setShowInstallModal(false);
      try {
        delete (window as any).__deferredInstallPrompt__;
    
      } catch {}
    };
    // silently handle pwa without noisy logs
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);


  useEffect(() => {
    const deferred = (typeof window !== 'undefined') && (window as any).__deferredInstallPrompt__;
    if (deferred && !installPromptRef.current) {
      installPromptRef.current = deferred;
      setCanPromptInstall(true);
      try {
      
      } catch {}
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {

        const target = event.target as HTMLElement;
        const hamburgerButton = target.closest('button[aria-label="Toggle mobile menu"]');
        if (!hamburgerButton) {
          setMobileMenuOpen(false);
        }
      }
      
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {

        const target = event.target as HTMLElement;
        const moreButton = target.closest('button[aria-label="Toggle more menu"]');
        if (!moreButton) {
          setMoreDropdownOpen(false);
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

  const closeMoreDropdown = () => {
    setMoreDropdownOpen(false);
  };

  const shouldBeTransparent = isHomePage && !scrolled;

  const targetOpacity = 0.95;

  const computedOpacity = isTestPage
    ? headerOpacity
    : (isHomePage ? Math.min(scrollOpacity * targetOpacity, targetOpacity) : targetOpacity);
  const backgroundColor = darkMode
    ? `rgba(17, 24, 39, ${computedOpacity})` // gray-900
    : `rgba(255, 255, 255, ${computedOpacity})`;
  const borderColor = computedOpacity === 0
    ? 'transparent'
    : darkMode
      ? `rgba(31, 41, 55, ${computedOpacity})` // gray-800
      : `rgba(229, 231, 235, ${computedOpacity})`; // gray-200
  const showBlur = (!isHomePage && !isTestPage) || (computedOpacity > 0.02 && !isTestPage);


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
        className={`fixed left-0 right-0 z-50 ${showBlur ? 'backdrop-blur-sm' : ''} border-b transition-[top] duration-300 ease-out`}
        style={{ 
          top: ((isDashboard || isHomePage) && bannerVisible) ? '32px' : '0px',
          transition: ((isDashboard || isHomePage) && bannerVisible) ? 'none' : 'top 0.3s ease-out',
          backgroundColor, 
          borderBottomColor: borderColor,
          opacity: isTestPage ? computedOpacity : 1,

          pointerEvents: isTestPage && computedOpacity <= 0.01 ? 'none' : 'auto'
        }}
      >
        <div className="w-full">
          <div className="container mx-auto flex justify-between items-center h-16 px-4">
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
              <Link href="/teams" className={getLinkStyles('/teams')}>
                Teams
              </Link>
              <Link href="/analytics" className={getLinkStyles('/analytics')}>
                Analytics
              </Link>
              
              {/* More Dropdown */}
              <div className="relative" ref={moreDropdownRef}>
                <button
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1 ${
                    (pathname === '/about' || pathname === '/contact' || pathname === '/join')
                      ? darkMode
                        ? 'text-white font-semibold'
                        : 'text-gray-900 font-semibold'
                      : darkMode
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-700 hover:text-gray-900'
                  }`}
                  aria-label="Toggle more menu"
                >
                  More
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {moreDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                      }`}
                    >
                      <Link
                        href="/join"
                        className={`block px-4 py-2 text-sm transition-colors duration-200 ${
                          pathname === '/join'
                            ? darkMode
                              ? 'text-white bg-gray-700'
                              : 'text-gray-900 bg-gray-100'
                            : darkMode
                              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        onClick={closeMoreDropdown}
                      >
                        Join Us
                      </Link>
                      <Link
                        href="/contact"
                        className={`block px-4 py-2 text-sm transition-colors duration-200 ${
                          pathname === '/contact'
                            ? darkMode
                              ? 'text-white bg-gray-700'
                              : 'text-gray-900 bg-gray-100'
                            : darkMode
                              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        onClick={closeMoreDropdown}
                      >
                        Contact Us
                      </Link>
                      <Link
                        href="/about"
                        className={`block px-4 py-2 text-sm transition-colors duration-200 ${
                          pathname === '/about'
                            ? darkMode
                              ? 'text-white bg-gray-700'
                              : 'text-gray-900 bg-gray-100'
                            : darkMode
                              ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        onClick={closeMoreDropdown}
                      >
                        About Us
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
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
              {isStandalone ? (
                <Link
                  href="/offline"
                  className={`p-2 rounded-md transition-colors duration-200 ${
                    shouldBeTransparent
                      ? 'hover:text-gray-700 text-gray-300 backdrop-blur-sm'
                      : '' } ${darkMode
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-700 hover:text-gray-900'
                  }`}
                  aria-label="Offline downloads"
                >
                  <Download className="w-5 h-5" />
                </Link>
              ) : (
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
                  <Upload className="w-5 h-5" />
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
                  <Link href="/teams" className={mobileLinkStyles('/teams')} onClick={closeMobileMenu}>
                    Teams
                  </Link>
                  <Link href="/analytics" className={mobileLinkStyles('/analytics')} onClick={closeMobileMenu}>
                    Analytics
                  </Link>
                  
                  {/* More Section */}
                  <div className="pt-2 pb-1">
                    <div className={`px-4 py-1 text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      MORE
                    </div>
                    <Link href="/join" className={mobileLinkStyles('/join')} onClick={closeMobileMenu}>
                      Join Us
                    </Link>
                    <Link href="/contact" className={mobileLinkStyles('/contact')} onClick={closeMobileMenu}>
                      Contact Us
                    </Link>
                    <Link href="/about" className={mobileLinkStyles('/about')} onClick={closeMobileMenu}>
                      About Us
                    </Link>
                  </div>
                  
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setShowInstallModal(false)}>
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
                                await installPromptRef.current.userChoice?.catch(() => null);
                                
                              } catch {
                                
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
