import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aboutPainting,
  budgetChoices,
  clip,
  findPaintings,
  similarTo,
  styleChoices,
  type HelperPainting
} from "./galleryHelper";

function painting(overrides: Partial<HelperPainting>): HelperPainting {
  return {
    title: "Untitled",
    artistName: "Asha Rao",
    artistSlug: "asha-rao",
    style: "Landscape",
    priceCents: 1_500_000,
    price: "₹15,000",
    description: "Morning mist over the hills.",
    medium: "Oil on canvas",
    dimensions: "60 × 90 cm",
    year: 2024,
    artistBio: null,
    artistLocation: null,
    artistDiscipline: null,
    ...overrides
  };
}

const paintings = [
  painting({ title: "Hills", style: "Landscape", priceCents: 800_000 }),
  painting({ title: "Coast", style: "Landscape", priceCents: 2_000_000 }),
  painting({ title: "Faces", style: "Portrait", priceCents: 3_000_000, artistSlug: "ravi", artistName: "Ravi" }),
  painting({ title: "Shapes", style: "Abstract", priceCents: 12_000_000, artistSlug: "ravi", artistName: "Ravi" }),
  painting({ title: "Valley", style: "Landscape", priceCents: 4_000_000 })
];

describe("styleChoices", () => {
  it("offers only the styles on the walls, most paintings first", () => {
    assert.deepEqual(
      styleChoices(paintings).map(({ id, count }) => [id, count]),
      [["Landscape", 3], ["Abstract", 1], ["Portrait", 1]]
    );
  });

  it("leaves out paintings with no style", () => {
    assert.deepEqual(styleChoices([painting({ style: null })]), []);
  });
});

describe("budgetChoices", () => {
  it("offers only bands that have something in them, within the chosen style", () => {
    assert.deepEqual(
      budgetChoices(paintings, "Landscape").map(({ id, count }) => [id, count]),
      [["under-10k", 1], ["10k-25k", 1], ["25k-50k", 1]]
    );
    assert.deepEqual(budgetChoices(paintings, null).map(({ id }) => id), ["under-10k", "10k-25k", "25k-50k", "over-1l"]);
  });
});

describe("findPaintings", () => {
  it("returns the paintings that fit every answer", () => {
    assert.deepEqual(findPaintings(paintings, { style: "Landscape", budget: "10k-25k" }), {
      indices: [1],
      exact: true,
      relaxed: []
    });
  });

  it("relaxes the budget before the style, nearest price first", () => {
    const result = findPaintings(paintings, { style: "Portrait", budget: "under-10k" });
    assert.equal(result.exact, false);
    assert.deepEqual(result.relaxed, ["budget"]);
    assert.deepEqual(result.indices, [2]);
  });

  it("relaxes the style when nothing of that style exists in the budget or at all", () => {
    const result = findPaintings(paintings, { style: "Floral", budget: "over-1l" });
    assert.deepEqual(result.relaxed, ["style"]);
    assert.deepEqual(result.indices, [3]);
  });

  it("finds an artist's other work, leaving out the one asked about", () => {
    assert.deepEqual(findPaintings(paintings, { artistSlug: "ravi", exclude: 2 }).indices, [3]);
  });

  it("always has something to show when the collection isn't empty", () => {
    const result = findPaintings(paintings, { style: "Floral" });
    assert.ok(result.indices.length > 0);
    assert.equal(result.exact, false);
  });
});

describe("similarTo", () => {
  it("prefers the same style, then the same artist", () => {
    assert.deepEqual(similarTo(paintings, 0).indices.sort(), [1, 4]);
    assert.deepEqual(similarTo(paintings, 2).indices, [3]);
  });
});

describe("aboutPainting", () => {
  it("describes the work from its listing", () => {
    const story = aboutPainting(painting({}));
    assert.equal(story.details, "A landscape painting in Oil on canvas (60 × 90 cm) from 2024, offered at ₹15,000.");
    assert.equal(story.description, "Morning mist over the hills.");
    assert.equal(story.artist, null);
  });

  it("introduces the artist when their profile says something", () => {
    const story = aboutPainting(
      painting({ artistBio: "Paints the Western Ghats.", artistLocation: "Pune", artistDiscipline: "Painter" })
    );
    assert.equal(story.artist, "Asha Rao (Painter, based in Pune): Paints the Western Ghats.");
  });
});

describe("clip", () => {
  it("cuts long text at a word boundary", () => {
    assert.equal(clip("one two three four five", 12), "one two…");
    assert.equal(clip("short", 12), "short");
  });
});
