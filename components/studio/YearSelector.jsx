"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";

export function YearSelector({ year, currentYear }) {
  const t = useT();
  const router = useRouter();

  return (
    <select
      defaultValue={year}
      onChange={(event) => {
        const selected = event.target.value;
        router.push(selected === String(currentYear) ? "/studio" : `/studio?year=${selected}`);
      }}
    >
      <option value={currentYear}>{t("studio.thisYear")}</option>
      <option value={currentYear - 1}>{t("studio.lastYear")}</option>
    </select>
  );
}
