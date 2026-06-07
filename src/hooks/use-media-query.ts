"use client";

import { useEffect, useState } from "react";
import { BREAKPOINTS } from "@/utils/constants";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);

    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
}

export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
  );
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);
}