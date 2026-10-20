import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GRAND_HALL, arrangeWings, wingOf } from "./galleryWings";

describe("wingOf", () => {
  it("goes by the style the artist set", () => {
    assert.equal(wingOf({ title: "Untitled", style: "Madhubani" }), "Folk & Tribal Wing");
    assert.equal(wingOf({ title: "Mountain", style: "Abstract" }), "Abstract & Modern Wing");
  });

  it("reads the title, then the medium and description, when there is no style", () => {
    assert.equal(wingOf({ title: "Blue gradation - Warli Tradition" }), "Folk & Tribal Wing");
    assert.equal(wingOf({ title: "Divine Ganesha" }), "Sacred Art Wing");
    assert.equal(wingOf({ title: "Misty Waterfall" }), "Landscape Wing");
    assert.equal(wingOf({ title: "Marriage", description: "A tribal wedding scene" }), "Folk & Tribal Wing");
  });

  it("prefers the title to a passing mention in the description", () => {
    assert.equal(wingOf({ title: "Ganesh", description: "with mountains behind" }), "Sacred Art Wing");
  });

  it("matches whole words only", () => {
    assert.equal(wingOf({ title: "Seashell" }), GRAND_HALL);
    assert.equal(wingOf({ title: "Germany" }), GRAND_HALL);
  });
});

describe("arrangeWings", () => {
  const paintings = [
    { title: "Nostalgia" },
    { title: "Mountain" },
    { title: "Ganesh" },
    { title: "Waterfall" },
    { title: "Blue Birds" },
    { title: "Garud" },
    { title: "Valley" }
  ];

  it("hangs each wing's paintings together, the Grand Hall first and then the largest wings", () => {
    const { paintings: hung, wings } = arrangeWings(paintings);
    assert.deepEqual(
      wings.map((wing) => [wing.name, wing.end - wing.start]),
      [
        [GRAND_HALL, 2],
        ["Landscape Wing", 3],
        ["Sacred Art Wing", 2]
      ]
    );
    assert.deepEqual(
      hung.map((painting) => painting.title),
      ["Nostalgia", "Blue Birds", "Mountain", "Waterfall", "Valley", "Ganesh", "Garud"]
    );
  });

  it("covers every painting exactly once, in back-to-back ranges", () => {
    const { paintings: hung, wings } = arrangeWings(paintings);
    assert.equal(hung.length, paintings.length);
    assert.deepEqual(new Set(hung), new Set(paintings));
    wings.forEach((wing, index) => assert.equal(wing.start, wings[index - 1]?.end ?? 0));
    assert.equal(wings.at(-1)?.end, paintings.length);
  });

  it("has no Grand Hall when every painting has a wing", () => {
    const { wings } = arrangeWings([{ title: "Mountain" }, { title: "Lake" }]);
    assert.deepEqual(wings, [{ name: "Landscape Wing", start: 0, end: 2 }]);
  });
});
