import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    try {
      mq.addEventListener("change", apply);
    } catch {
      mq.addListener(apply);
    }
    apply();
    return () => {
      try {
        mq.removeEventListener("change", apply);
      } catch {
        mq.removeListener(apply);
      }
    };
  }, [query]);

  return matches;
}
