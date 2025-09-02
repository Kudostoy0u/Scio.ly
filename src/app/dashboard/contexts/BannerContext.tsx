'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface BannerContextType {
  bannerVisible: boolean | null;
  closeBanner: () => void;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

export function BannerProvider({ children }: { children: ReactNode }) {
  const [bannerVisible, setBannerVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBannerVisibility = () => {
      const bannerClosed = localStorage.getItem('hylas-banner-closed') === 'true';
      setBannerVisible(!bannerClosed);
    };
    
    checkBannerVisibility();
    

    window.addEventListener('storage', checkBannerVisibility);
    return () => window.removeEventListener('storage', checkBannerVisibility);
  }, []);

  const closeBanner = () => {
    localStorage.setItem('hylas-banner-closed', 'true');
    setBannerVisible(false);
  };

  return (
    <BannerContext.Provider value={{ bannerVisible, closeBanner }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBannerContext() {
  const context = useContext(BannerContext);
  if (context === undefined) {
    throw new Error('useBannerContext must be used within a BannerProvider');
  }
  return context;
}
