import { type RefObject, useEffect } from "react";

export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  handlers: (() => void)[]
): void {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      refs.forEach((ref, index) => {
        if (ref.current && !ref.current.contains(event.target as Node)) {
          handlers[index]?.();
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [refs, handlers]);
}
