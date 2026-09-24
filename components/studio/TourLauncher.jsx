"use client";

import { useT } from "@/components/i18n/LocaleProvider";
import { useStudioTour } from "@/components/studio/StudioTour";

/** Replays the walkthrough on demand, for an artist who skipped it or forgot it. */
export function TourLauncher() {
  const t = useT();
  const { startTour, isRunning } = useStudioTour();

  return (
    <button className="button button-secondary" disabled={isRunning} onClick={startTour} type="button">
      {t("tour.launch")}
    </button>
  );
}
