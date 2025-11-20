import { listDownloadedEventSlugs, subscribeToDownloads } from "@/app/utils/storage";
import { useEffect, useState } from "react";

export function useOfflineDownloads(): { isOffline: boolean; downloadedSet: Set<string> } {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    const loadDownloadedSlugs = async () => {
      try {
        const keys = await listDownloadedEventSlugs();
        setDownloadedSet(new Set(keys));
      } catch {}
    };
    loadDownloadedSlugs();
    const unsubscribe = subscribeToDownloads(loadDownloadedSlugs);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      try {
        unsubscribe();
      } catch {}
    };
  }, []);

  return { isOffline, downloadedSet };
}
