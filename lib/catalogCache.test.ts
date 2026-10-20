import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reviveDates } from "./catalogCache";

describe("reviveDates", () => {
  it("turns cached timestamps back into dates, deep inside results", () => {
    const cached = JSON.parse(
      JSON.stringify([{ title: "Mountain", createdAt: new Date("2026-10-01T09:30:00.000Z"), media: [{ addedAt: new Date(0) }] }])
    );
    const [artwork] = reviveDates(cached) as { title: string; createdAt: Date; media: { addedAt: Date }[] }[];
    assert.ok(artwork?.createdAt instanceof Date);
    assert.equal(artwork.createdAt.toISOString(), "2026-10-01T09:30:00.000Z");
    assert.ok(artwork.media[0]?.addedAt instanceof Date);
    assert.equal(artwork.title, "Mountain");
  });

  it("leaves other strings, numbers and nulls alone", () => {
    assert.deepEqual(reviveDates({ year: "2026", price: 12500, style: null, note: "2026-10-01" }), {
      year: "2026",
      price: 12500,
      style: null,
      note: "2026-10-01"
    });
  });
});
