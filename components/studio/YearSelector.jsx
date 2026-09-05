"use client";

import { useRouter } from "next/navigation";

export function YearSelector({ year, currentYear }) {
  const router = useRouter();

  return (
    <select
      defaultValue={year}
      onChange={(event) => {
        const selected = event.target.value;
        router.push(selected === String(currentYear) ? "/studio" : `/studio?year=${selected}`);
      }}
    >
      <option value={currentYear}>This Year</option>
      <option value={currentYear - 1}>Last Year</option>
    </select>
  );
}
