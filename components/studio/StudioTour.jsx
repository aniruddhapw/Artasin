"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { STUDIO_TOUR_STEPS, hasSeenTour, markTourSeen, tourSelector } from "@/lib/tour";

const CARD_WIDTH = 340;
const GAP = 16;
const EDGE = 12;
// A step's page has to render and, on a cold navigation, compile in dev before
// its anchor exists. Long enough to cover that, short enough that a step which
// genuinely went missing does not strand the tour.
const ANCHOR_TIMEOUT_MS = 8000;

const StudioTourContext = createContext({ startTour: () => {}, isRunning: false });

export function useStudioTour() {
  return useContext(StudioTourContext);
}

/** Waits for a step's anchor to appear, since a step may have just navigated. */
function waitForAnchor(anchor, signal) {
  return new Promise((resolve) => {
    const selector = tourSelector(anchor);
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        finish(found);
      }
    });
    const timer = setTimeout(() => finish(null), ANCHOR_TIMEOUT_MS);

    function finish(element) {
      observer.disconnect();
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve(element);
    }
    function onAbort() {
      finish(null);
    }

    signal.addEventListener("abort", onAbort);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

function cardPosition(rect, placement, cardHeight) {
  const width = Math.min(CARD_WIDTH, window.innerWidth - EDGE * 2);
  const left = Math.min(
    Math.max(rect.left + rect.width / 2 - width / 2, EDGE),
    window.innerWidth - width - EDGE
  );
  // The step states a side, but an anchor can be taller than the screen — a
  // whole fieldset, say — and then the stated side has no room and the card
  // would be positioned off the bottom, invisible. Fall back to the other
  // side, and to floating over the anchor when neither side fits.
  const roomBelow = window.innerHeight - rect.bottom - GAP - EDGE;
  const roomAbove = rect.top - GAP - EDGE;
  const wantsAbove = placement === "top";
  const above = { left, width, top: Math.max(rect.top - GAP - cardHeight, EDGE) };
  const below = { left, width, top: rect.bottom + GAP };

  if (wantsAbove ? roomAbove >= cardHeight : roomBelow >= cardHeight) {
    return wantsAbove ? above : below;
  }
  if (wantsAbove ? roomBelow >= cardHeight : roomAbove >= cardHeight) {
    return wantsAbove ? below : above;
  }
  return { left, width, top: Math.max(window.innerHeight - cardHeight - EDGE, EDGE) };
}

export function StudioTourProvider({ autoStart, children }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [stepIndex, setStepIndex] = useState(-1);
  const [rect, setRect] = useState(null);
  // Measured rather than assumed: the card's height depends on how long the
  // step's copy runs, and a translation can be half again as tall.
  const [cardHeight, setCardHeight] = useState(240);
  const cardRef = useRef(null);
  const abortRef = useRef(null);

  const isRunning = stepIndex >= 0;
  const step = isRunning ? STUDIO_TOUR_STEPS[stepIndex] : null;
  const total = STUDIO_TOUR_STEPS.length;

  const startTour = useCallback(() => setStepIndex(0), []);

  const endTour = useCallback(() => {
    abortRef.current?.abort();
    setStepIndex(-1);
    setRect(null);
    markTourSeen();
  }, []);

  // Offered once per browser, and only to an artist who has not put anything
  // in their studio yet — an artist mid-work does not want a walkthrough
  // thrown over the page. `?tour=1` comes from the signup confirmation and
  // overrides both.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tour") === "1";
    if (requested) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setStepIndex(0);
      return;
    }
    if (autoStart && !hasSeenTour()) {
      setStepIndex(0);
    }
  }, [autoStart]);

  // Each step navigates to its own route if needed, waits for the anchor, then
  // scrolls it into view and measures it.
  useEffect(() => {
    if (!step) {
      return undefined;
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (pathname !== step.route) {
      router.push(step.route);
    }

    (async () => {
      const element = await waitForAnchor(step.anchor, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      if (!element) {
        // The step's anchor never turned up. Ending beats leaving a dimmed
        // screen with nothing highlighted.
        endTour();
        return;
      }
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
      // scrollIntoView is asynchronous, so measure on a timer rather than
      // immediately — otherwise the spotlight lands where the anchor was.
      const settle = setTimeout(() => {
        setRect(element.getBoundingClientRect());
        cardRef.current?.focus();
      }, 420);
      controller.signal.addEventListener("abort", () => clearTimeout(settle));
    })();

    return () => controller.abort();
  }, [endTour, pathname, router, step]);

  // Keep the spotlight on the anchor while the page moves under it.
  useEffect(() => {
    if (!step) {
      return undefined;
    }
    function remeasure() {
      const element = document.querySelector(tourSelector(step.anchor));
      if (element) {
        setRect(element.getBoundingClientRect());
      }
    }
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [step]);

  useLayoutEffect(() => {
    if (cardRef.current) {
      setCardHeight(cardRef.current.offsetHeight);
    }
  }, [rect, stepIndex]);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }
    function onKeyDown(event) {
      if (event.key === "Escape") {
        endTour();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [endTour, isRunning]);

  function goNext() {
    setRect(null);
    if (stepIndex >= total - 1) {
      endTour();
      return;
    }
    setStepIndex(stepIndex + 1);
  }

  function goBack() {
    setRect(null);
    setStepIndex(Math.max(stepIndex - 1, 0));
  }

  const value = useMemo(() => ({ startTour, isRunning }), [isRunning, startTour]);
  const cardStyle = rect ? cardPosition(rect, step.placement, cardHeight) : null;

  return (
    <StudioTourContext.Provider value={value}>
      {children}
      {isRunning ? (
        <div className="tour-layer">
          {rect ? (
            <div
              className="tour-spotlight"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12
              }}
            />
          ) : (
            <div className="tour-spotlight tour-spotlight-empty" />
          )}
          {rect ? (
            <div
              aria-labelledby="tour-step-title"
              className="tour-card"
              ref={cardRef}
              role="dialog"
              style={cardStyle}
              tabIndex={-1}
            >
              <p className="tour-progress">{t("tour.progress", { current: stepIndex + 1, total })}</p>
              <h2 id="tour-step-title">{t(`tour.${step.anchor}.title`)}</h2>
              <p className="tour-body">{t(`tour.${step.anchor}.body`)}</p>
              <div className="tour-actions">
                <button className="text-link tour-skip" onClick={endTour} type="button">
                  {t("tour.skip")}
                </button>
                <div className="tour-steps">
                  {stepIndex > 0 ? (
                    <button className="small-outline" onClick={goBack} type="button">
                      {t("tour.back")}
                    </button>
                  ) : null}
                  <button className="button button-primary tour-next" onClick={goNext} type="button">
                    {stepIndex === total - 1 ? t("tour.finish") : t("tour.next")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </StudioTourContext.Provider>
  );
}
