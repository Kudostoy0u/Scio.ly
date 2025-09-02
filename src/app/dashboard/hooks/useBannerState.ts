import { useState, useEffect } from 'react';

export function useBannerState() {
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

  return { bannerVisible, closeBanner };
}
