import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { ageOn, dateOfBirthSchema, parseDateOfBirth, toDateInputValue } = await import("./dateOfBirth.js");

describe("parseDateOfBirth", () => {
  it("reads what an <input type=date> submits", () => {
    assert.equal(parseDateOfBirth("1990-05-15").toISOString(), "1990-05-15T00:00:00.000Z");
  });

  /**
   * `new Date(Date.UTC(2025, 1, 30))` silently becomes 2 March. Storing a
   * birthday the person never had is worse than refusing it, and nothing
   * downstream would ever notice.
   */
  it("rejects a date that does not exist", () => {
    assert.equal(parseDateOfBirth("2025-02-30"), null);
    assert.equal(parseDateOfBirth("1990-13-01"), null);
    assert.equal(parseDateOfBirth("1990-04-31"), null);
  });

  it("accepts a real leap day and rejects a false one", () => {
    assert.ok(parseDateOfBirth("2000-02-29"));
    assert.equal(parseDateOfBirth("1900-02-29"), null);
  });

  it("refuses anything that is not an ISO date", () => {
    for (const value of ["15/05/1990", "1990-5-15", "", "   ", null, undefined, 19900515]) {
      assert.equal(parseDateOfBirth(value), null, String(value));
    }
  });
});

describe("ageOn", () => {
  const birth = parseDateOfBirth("2008-09-25");

  it("counts the birthday itself as the day the age changes", () => {
    assert.equal(ageOn(birth, new Date("2026-09-24T00:00:00Z")), 17);
    assert.equal(ageOn(birth, new Date("2026-09-25T00:00:00Z")), 18);
    assert.equal(ageOn(birth, new Date("2026-09-26T00:00:00Z")), 18);
  });

  it("handles the month boundary either side", () => {
    assert.equal(ageOn(birth, new Date("2026-08-31T00:00:00Z")), 17);
    assert.equal(ageOn(birth, new Date("2026-10-01T00:00:00Z")), 18);
  });
});

/**
 * The terms say "You must be at least 18 years old to create an account", so
 * the boundary is pinned here rather than left to whatever the schema happens
 * to do.
 */
describe("dateOfBirthSchema", () => {
  function message(value) {
    const result = dateOfBirthSchema.safeParse(value);
    return result.success ? null : result.error.issues[0].message;
  }

  it("accepts an adult", () => {
    assert.equal(message("1990-05-15"), null);
  });

  it("refuses someone under 18", () => {
    assert.match(message("2020-01-01"), /at least 18 years ago/);
  });

  it("refuses a date in the future", () => {
    assert.match(message("2099-01-01"), /at least 18 years ago/);
  });

  it("refuses a year that cannot be right", () => {
    assert.match(message("1800-01-01"), /does not look like a real date of birth/);
  });

  // An unparseable value must report only that, not also fail an age check
  // that has no date to measure.
  it("reports one problem for an unparseable date, not three", () => {
    const result = dateOfBirthSchema.safeParse("not-a-date");
    assert.equal(result.success, false);
    assert.equal(result.error.issues.length, 1);
    assert.match(result.error.issues[0].message, /must be a date like/);
  });
});

describe("toDateInputValue", () => {
  it("round-trips a stored date back into the input", () => {
    assert.equal(toDateInputValue(parseDateOfBirth("1990-05-15")), "1990-05-15");
  });

  it("gives an empty field when nothing is stored", () => {
    assert.equal(toDateInputValue(null), "");
    assert.equal(toDateInputValue(undefined), "");
  });
});
