"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * App Router navigations are async — a click can sit for a second or more while
 * the server renders, with nothing on screen changing. Without this the site
 * feels broken: people click, see nothing, and click again.
 *
 * The bar starts on an internal link click and finishes when the route actually
 * changes, with a safety timeout so a cancelled or same-page navigation cannot
 * leave it stuck on screen.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams}`;

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const creepRef = useRef(null);
  const settleRef = useRef(null);
  const safetyRef = useRef(null);
  const lastRouteRef = useRef(routeKey);

  const clearTimers = useCallback(() => {
    clearInterval(creepRef.current);
    clearTimeout(settleRef.current);
    clearTimeout(safetyRef.current);
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    setProgress(100);
    settleRef.current = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 260);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    setIsVisible(true);
    setProgress(12);
    // Creep toward 90% so there is always motion, but never complete on its own —
    // only an actual route change finishes the bar.
    creepRef.current = setInterval(() => {
      setProgress((current) => (current >= 90 ? current : current + Math.max(0.6, (90 - current) * 0.08)));
    }, 180);
    // If the navigation is cancelled or goes nowhere, do not leave the bar up.
    safetyRef.current = setTimeout(finish, 10000);
  }, [clearTimers, finish]);

  // A completed navigation is the signal to finish.
  useEffect(() => {
    if (lastRouteRef.current !== routeKey) {
      lastRouteRef.current = routeKey;
      finish();
    }
  }, [routeKey, finish]);

  useEffect(() => {
    function onClick(event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) {
        return;
      }
      // Same page, or only a hash change — nothing will load.
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) {
        return;
      }
      start();
    }

    // Capture phase: next/link calls preventDefault() on the anchor to take over
    // the navigation, and a bubbling listener would see defaultPrevented and skip
    // every internal link — which is every link that actually needs the bar.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, [start, clearTimers]);

  if (!isVisible) {
    return null;
  }

  return (
    <div aria-hidden="true" className="route-progress">
      <div className="route-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
