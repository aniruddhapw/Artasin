"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/i18n/LocaleProvider";

/**
 * Confirms the account exists before the redirect takes the screen away.
 *
 * The session cookie is already set by the time this renders, so nothing here
 * is a step in signing up — it is the one moment a new artist is guaranteed to
 * be looking, which is why the studio tour is offered from it rather than
 * ambushing them later.
 */
export function SignupSuccessModal({ firstName, isArtist, onDismiss, onPrimary }) {
  const t = useT();
  const primaryRef = useRef(null);

  useEffect(() => {
    primaryRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss]);

  return (
    <div
      aria-labelledby="signup-success-title"
      aria-modal="true"
      className="app-modal"
      role="dialog"
    >
      <div className="app-modal-backdrop" />
      <div className="app-modal-card signup-success-card">
        <span aria-hidden="true" className="signup-success-mark">
          &#10003;
        </span>
        <h2 id="signup-success-title">{t("signup.success.title")}</h2>
        <p>
          {isArtist
            ? t("signup.success.artistBody", { name: firstName })
            : t("signup.success.buyerBody", { name: firstName })}
        </p>
        <div className="signup-success-actions">
          <button className="button button-primary" onClick={onPrimary} ref={primaryRef} type="button">
            {isArtist ? t("signup.success.artistCta") : t("signup.success.buyerCta")}
          </button>
          <button className="text-link signup-success-skip" onClick={onDismiss} type="button">
            {isArtist ? t("signup.success.artistSkip") : t("signup.success.buyerSkip")}
          </button>
        </div>
      </div>
    </div>
  );
}
