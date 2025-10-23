import { useState, useEffect } from 'react';
import SyncLocalStorage from '@/lib/database/localStorage-replacement';

export function useBannerState() {
  const [bannerVisible, setBannerVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBannerVisibility = () => {
      const bannerClosed = SyncLocalStorage.getItem('hylas-banner-closed') === 'true';
      setBannerVisible(!bannerClosed);
    };
    
    checkBannerVisibility();
    

    window.addEventListener('storage', checkBannerVisibility);
    return () => window.removeEventListener('storage', checkBannerVisibility);
  }, []);

  const closeBanner = () => {
    SyncLocalStorage.setItem('hylas-banner-closed', 'true');
    setBannerVisible(false);
  };

  return { bannerVisible, closeBanner };
}
