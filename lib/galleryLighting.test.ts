import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLayout } from "./galleryLayout";
import { HANG_HEIGHT, ambientAt, slotsOnFace, spotFor, spotLight, wallFaces } from "./galleryLighting";

// A painting on a wall facing +z, at the origin.
const slot = { x: 0, z: 0, nx: 0, nz: 1 };
const spot = spotFor(slot);
const wallNormal = { x: 0, y: 0, z: 1 };
const onWall = (x: number, y: number) => spotLight(spot, { x, y, z: 0 }, wallNormal);

describe("spotLight on a painting's wall", () => {
  it("lights the painting's centre at about the planned brightness", () => {
    const centre = onWall(0, HANG_HEIGHT + 0.15);
    assert.ok(centre > 0.8 && centre < 1.5, `centre is ${centre}`);
  });

  it("fades out to the sides, and is dark well beyond the painting", () => {
    assert.ok(onWall(0, HANG_HEIGHT) > onWall(1.2, HANG_HEIGHT));
    assert.ok(onWall(1.2, HANG_HEIGHT) > onWall(2, HANG_HEIGHT));
    assert.equal(onWall(4, HANG_HEIGHT), 0);
  });

  it("is cut off above, as a scallop is", () => {
    assert.equal(onWall(0, 5), 0);
  });

  it("never lights the back of a surface", () => {
    assert.equal(spotLight(spot, { x: 0, y: HANG_HEIGHT, z: 0 }, { x: 0, y: 0, z: -1 }), 0);
  });

  it("spills onto the floor at the foot of the wall", () => {
    assert.ok(spotLight(spot, { x: 0, y: 0, z: 0.3 }, { x: 0, y: 1, z: 0 }) > 0.2);
  });
});

describe("ambientAt", () => {
  it("is darker where the wall meets the floor and the ceiling", () => {
    assert.ok(ambientAt(0) < ambientAt(2));
    assert.ok(ambientAt(5.2) < ambientAt(2));
  });
});

describe("slotsOnFace", () => {
  it("gives every painting slot to exactly one wall face", () => {
    const layout = buildLayout(2, 3);
    const faces = wallFaces(layout);
    for (const each of layout.slots) {
      const owners = faces.filter((face) => slotsOnFace(face, [each]).length);
      assert.equal(owners.length, 1, `slot ${JSON.stringify(each)} is on ${owners.length} faces`);
    }
  });
});
