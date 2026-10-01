import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { resolveStyle, stylesFor } = await import("./artisan.js");
const { en, mr } = await import("../lib/i18n/dictionaries.js");

describe("resolveStyle", () => {
  it("keeps a style that belongs to the category", () => {
    assert.deepEqual(resolveStyle("Painting", "Warli"), { style: "Warli" });
    assert.deepEqual(resolveStyle("Sculpture", "Relief"), { style: "Relief" });
  });

  it("asks for a style when the category has them", () => {
    assert.deepEqual(resolveStyle("Painting", undefined), { error: "is required" });
    assert.deepEqual(resolveStyle("Painting", ""), { error: "is required" });
  });

  it("refuses a style from another category", () => {
    assert.deepEqual(resolveStyle("Sculpture", "Madhubani"), { error: "Choose one from the list" });
  });

  it("stores no style for categories without them", () => {
    assert.deepEqual(resolveStyle("Textile", "Landscape"), { style: null });
    assert.deepEqual(resolveStyle("Textile", undefined), { style: null });
  });
});

describe("style labels", () => {
  it("has an English and Marathi label for every style", () => {
    for (const category of ["Painting", "Sculpture"]) {
      for (const style of stylesFor(category)) {
        assert.ok(en[`style.${style}`], `en style.${style}`);
        assert.ok(mr[`style.${style}`], `mr style.${style}`);
      }
    }
  });
});
