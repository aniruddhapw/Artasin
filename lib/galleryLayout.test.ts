import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CORRIDOR_WIDTH,
  buildLayout,
  collide,
  deskArea,
  planGallery,
  route,
  type GalleryLayout,
  type Point,
  type Rect
} from "./galleryLayout";

const inside = (rect: Rect, point: Point, margin = 0) =>
  point.x > rect.minX - margin && point.x < rect.maxX + margin && point.z > rect.minZ - margin && point.z < rect.maxZ + margin;

/** True when a point is on the open floor: in the building, off every block and the desk. */
function isFree(layout: GalleryLayout, point: Point, margin = 0) {
  return (
    inside(layout.bounds, point, -margin) &&
    !layout.islands.some((island) => inside(island, point, margin)) &&
    !inside(deskArea(layout), point, margin)
  );
}

/** Samples a straight leg and checks every point of it is open floor. */
function legIsClear(layout: GalleryLayout, from: Point, to: Point) {
  for (let step = 0; step <= 50; step += 1) {
    const t = step / 50;
    if (!isFree(layout, { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t })) {
      return false;
    }
  }
  return true;
}

describe("planGallery", () => {
  it("makes room for every painting, adding rows of blocks as the collection grows", () => {
    for (const count of [1, 12, 24, 25, 44, 45, 90, 91, 200]) {
      const layout = planGallery(count);
      assert.ok(layout.slots.length >= count, `${count} paintings fit`);
    }
    assert.equal(planGallery(10).rows, 1);
    assert.equal(planGallery(30).rows, 2);
    assert.equal(planGallery(91).cols, 4);
  });

  it("keeps a corridor down the middle, from the entrance straight to the desk", () => {
    const layout = planGallery(36);
    assert.ok(legIsClear(layout, layout.start, { x: 0, z: layout.desk.z + 2 }));
  });
});

describe("wall slots", () => {
  const layout = buildLayout(2, 2);

  it("sit on a wall, facing open corridor", () => {
    for (const slot of layout.slots) {
      // Just out from the wall is open floor, just behind it is not.
      assert.ok(isFree(layout, { x: slot.x + slot.nx * 0.5, z: slot.z + slot.nz * 0.5 }), `in front of ${JSON.stringify(slot)}`);
      assert.ok(!isFree(layout, { x: slot.x - slot.nx * 0.5, z: slot.z - slot.nz * 0.5 }), `behind ${JSON.stringify(slot)}`);
    }
  });

  it("leave room either side for the painting and its label before the wall ends", () => {
    for (const slot of layout.slots) {
      // Along the wall: 1.5 m of painting one way, painting plus label the other.
      const along = { x: -slot.nz, z: slot.nx };
      for (const reach of [-1.6, 2.2]) {
        const point = { x: slot.x + along.x * reach + slot.nx * 0.05, z: slot.z + along.z * reach + slot.nz * 0.05 };
        const behind = { x: point.x - slot.nx * 0.2, z: point.z - slot.nz * 0.2 };
        assert.ok(!isFree(layout, behind), `wall continues ${reach} m along ${JSON.stringify(slot)}`);
      }
    }
  });

  it("are all different", () => {
    const keys = new Set(layout.slots.map((slot) => `${slot.x},${slot.z},${slot.nx},${slot.nz}`));
    assert.equal(keys.size, layout.slots.length);
  });

  it("go in a walkable tour, never more than a short walk from one to the next", () => {
    for (let index = 1; index < layout.slots.length; index += 1) {
      const a = layout.slots[index - 1];
      const b = layout.slots[index];
      assert.ok(a && b);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 32, `slot ${index - 1} to ${index}`);
    }
  });
});

describe("collide", () => {
  const layout = buildLayout(2, 2);
  const island = layout.islands[0];

  it("leaves open floor alone", () => {
    assert.deepEqual(collide(layout, layout.start, 0.5), layout.start);
  });

  it("pushes a point out of a block by the shortest way", () => {
    assert.ok(island);
    const nearLeftEdge = { x: island.minX + 0.2, z: (island.minZ + island.maxZ) / 2 };
    const pushed = collide(layout, nearLeftEdge, 0.5);
    assert.equal(pushed.x, island.minX - 0.5);
    assert.equal(pushed.z, nearLeftEdge.z);
  });

  it("keeps points inside the building and out from behind the desk", () => {
    const outside = collide(layout, { x: 1000, z: 1000 }, 0.5);
    assert.ok(isFree(layout, outside, 0.49));
    const behindDesk = collide(layout, { x: layout.desk.x, z: layout.desk.z - 0.5 }, 0.5);
    assert.ok(isFree(layout, behindDesk, 0.49));
  });
});

describe("route", () => {
  const layout = buildLayout(2, 3);

  it("goes straight when both ends are in the same corridor", () => {
    const to = { x: 10, z: layout.start.z };
    assert.deepEqual(route(layout, layout.start, to), [to]);
  });

  it("follows the corridors between any two wall slots without crossing a wall", () => {
    const spots = layout.slots.map((slot) => ({ x: slot.x + slot.nx * 2, z: slot.z + slot.nz * 2 }));
    for (const from of spots) {
      for (const to of spots) {
        const path = route(layout, from, to);
        assert.deepEqual(path.at(-1), to);
        let previous = from;
        for (const point of path) {
          assert.ok(legIsClear(layout, previous, point), `${JSON.stringify(from)} → ${JSON.stringify(to)}`);
          previous = point;
        }
      }
    }
  });

  it("reaches the reception in front of the desk", () => {
    const toDesk = { x: layout.desk.x, z: layout.desk.z + 4 };
    let previous = layout.slots[5] ?? layout.start;
    previous = { x: previous.x + 2 * (layout.slots[5]?.nx ?? 0), z: previous.z + 2 * (layout.slots[5]?.nz ?? 0) };
    for (const point of route(layout, previous, toDesk)) {
      assert.ok(legIsClear(layout, previous, point));
      previous = point;
    }
  });

  it("corridors are as wide as planned", () => {
    const [first, second] = layout.islands;
    assert.ok(first && second);
    assert.equal(second.minX - first.maxX, CORRIDOR_WIDTH);
  });
});
