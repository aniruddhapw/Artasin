"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/i18n/LocaleProvider";

/**
 * A password field with an eye button that shows what was typed, so people
 * can check a long password before they submit it. Takes the same props as
 * an <input>; the type is managed here.
 */
export function PasswordInput(props) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        aria-pressed={visible}
        className="password-toggle"
        // Keeps the cursor in the field when the eye is clicked with a mouse.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((current) => !current)}
        title={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        type="button"
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={20} />
      </button>
    </div>
  );
}
