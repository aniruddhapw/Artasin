/**
 * The floor plan of the 3D gallery (components/gallery3d): a grid of solid
 * wall blocks ("islands") with corridors running between and around them, so
 * visitors can turn at every crossing and loop back. Paintings hang on both
 * sides of every corridor; the far corridor opens into a reception area with
 * the custom-orders desk against the far wall.
 *
 * Plain geometry with no Three.js, so it can be unit-tested. Coordinates are
 * metres on the floor: x runs across, z runs from the entrance (z > 0) into
 * the building (towards -z).
 */

export interface Point {
  x: number;
  z: number;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** A place on a wall for one painting: its centre on the wall surface and the
 * wall's normal, which points out into the corridor. */
export interface WallSlot {
  x: number;
  z: number;
  nx: number;
  nz: number;
}

export interface GalleryLayout {
  cols: number;
  rows: number;
  /** Centre lines of the corridors running along z, left to right. */
  xs: number[];
  /** Centre lines of the corridors running along x, entrance first. */
  zs: number[];
  /** The inside faces of the outer walls. */
  bounds: Rect;
  islands: Rect[];
  /** Every free wall slot, in the order a tour visits them. */
  slots: WallSlot[];
  desk: { x: number; z: number };
  /** Where the visitor starts, just inside the entrance, looking in (-z). */
  start: Point;
}

export const CORRIDOR_WIDTH = 6;
export const ISLAND_SIZE = 9;
/** Depth of the reception area beyond the far corridor. */
export const RECEPTION_DEPTH = 5;
export const DESK_WIDTH = 2.8;
export const DESK_DEPTH = 0.75;
export const DESK_FROM_FAR_WALL = 2.2;

const PITCH = CORRIDOR_WIDTH + ISLAND_SIZE;
const HALF = CORRIDOR_WIDTH / 2;
// Two paintings per wall face, a quarter of the face in from each end.
const SLOT_OFFSETS = [-ISLAND_SIZE / 4, ISLAND_SIZE / 4] as const;

/** The smallest grid with a wall slot for every painting. */
export function planGallery(paintingCount: number): GalleryLayout {
  // Two columns of blocks keeps a corridor down the middle, straight from the
  // entrance to the desk; very large collections get four.
  const cols = paintingCount > 90 ? 4 : 2;
  let rows = 1;
  let layout = buildLayout(cols, rows);
  while (layout.slots.length < paintingCount) {
    rows += 1;
    layout = buildLayout(cols, rows);
  }
  return layout;
}

export function buildLayout(cols: number, rows: number): GalleryLayout {
  const xs = Array.from({ length: cols + 1 }, (_, i) => (i - cols / 2) * PITCH);
  const zs = Array.from({ length: rows + 1 }, (_, j) => -j * PITCH);
  const x = (i: number) => xs[i] ?? 0;
  const z = (j: number) => zs[j] ?? 0;

  const bounds: Rect = {
    minX: x(0) - HALF,
    maxX: x(cols) + HALF,
    minZ: z(rows) - HALF - RECEPTION_DEPTH,
    maxZ: z(0) + HALF
  };

  const islands: Rect[] = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      islands.push({ minX: x(i) + HALF, maxX: x(i + 1) - HALF, minZ: z(j + 1) + HALF, maxZ: z(j) - HALF });
    }
  }

  // Walk the corridors in tour order: each cross corridor left to right, then
  // the stretches leading further in, right to left, nearest end first. Each
  // stretch contributes the slots on both of its walls, in walking order.
  const slots: WallSlot[] = [];
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const mid = (x(i) + x(i + 1)) / 2;
      const stretch: WallSlot[] = [];
      for (const offset of SLOT_OFFSETS) {
        // The wall on the entrance side: the entrance wall itself, or the
        // far face of the block row before.
        stretch.push({ x: mid + offset, z: j === 0 ? bounds.maxZ : z(j) + HALF, nx: 0, nz: -1 });
        // The far side, unless this is the reception, whose wall is the desk's.
        if (j < rows) {
          stretch.push({ x: mid + offset, z: z(j) - HALF, nx: 0, nz: 1 });
        }
      }
      slots.push(...stretch);
    }
    if (j === rows) {
      break;
    }
    const mid = (z(j) + z(j + 1)) / 2;
    for (let i = cols; i >= 0; i -= 1) {
      // Nearest the entrance first.
      for (const offset of [...SLOT_OFFSETS].reverse()) {
        slots.push({ x: i === 0 ? bounds.minX : x(i) - HALF, z: mid + offset, nx: 1, nz: 0 });
        slots.push({ x: i === cols ? bounds.maxX : x(i) + HALF, z: mid + offset, nx: -1, nz: 0 });
      }
    }
  }

  return {
    cols,
    rows,
    xs,
    zs,
    bounds,
    islands,
    slots,
    desk: { x: 0, z: bounds.minZ + DESK_FROM_FAR_WALL },
    start: { x: 0, z: z(0) + 1.6 }
  };
}

/** The floor the desk and the space behind it take up, which nobody walks into. */
export function deskArea(layout: GalleryLayout): Rect {
  return {
    minX: layout.desk.x - DESK_WIDTH / 2 - 0.5,
    maxX: layout.desk.x + DESK_WIDTH / 2 + 0.5,
    // Reaching through the far wall, so nothing is ever pushed out behind it.
    minZ: layout.bounds.minZ - 10,
    maxZ: layout.desk.z + DESK_DEPTH / 2 + 0.9
  };
}

/** A bench: centre, size (length along x unless turned) and whether it is turned a quarter. */
export interface Bench {
  x: number;
  z: number;
  /** Radians about the vertical: 0 seats face +z (towards the entrance). */
  rotation: number;
}

export const BENCH_LENGTH = 1.8;
export const BENCH_DEPTH = 0.5;
/** The floor a potted plant takes, as the half-width of a square. */
export const PLANT_RADIUS = 0.38;
/** How far a plant stands out from the block corner it marks, along each axis. */
const PLANT_OUT = 0.45;

export interface GalleryProps {
  benches: Bench[];
  plants: Point[];
}

/**
 * Where the furniture goes, kept off every walking line: benches in the
 * reception either side of the desk, facing back into the gallery; plants
 * on alternate corners of each block (where corridors cross), in the four
 * corners of the building, and either side of the desk.
 */
export function placeProps(layout: GalleryLayout): GalleryProps {
  const { bounds, desk } = layout;
  const benchZ = bounds.minZ + 1.6;
  const benchX = DESK_WIDTH / 2 + 5.5;
  const benches: Bench[] = [
    { x: desk.x - benchX, z: benchZ, rotation: 0 },
    { x: desk.x + benchX, z: benchZ, rotation: 0 }
  ];

  const plants: Point[] = [];
  layout.islands.forEach((island, index) => {
    const corners: [Point, Point] =
      index % 2 === 0
        ? [{ x: island.minX - PLANT_OUT, z: island.maxZ + PLANT_OUT }, { x: island.maxX + PLANT_OUT, z: island.minZ - PLANT_OUT }]
        : [{ x: island.maxX + PLANT_OUT, z: island.maxZ + PLANT_OUT }, { x: island.minX - PLANT_OUT, z: island.minZ - PLANT_OUT }];
    plants.push(...corners);
  });
  const inset = PLANT_RADIUS + 0.25;
  plants.push(
    { x: bounds.minX + inset, z: bounds.maxZ - inset },
    { x: bounds.maxX - inset, z: bounds.maxZ - inset },
    { x: bounds.minX + inset, z: bounds.minZ + inset },
    { x: bounds.maxX - inset, z: bounds.minZ + inset },
    { x: desk.x - DESK_WIDTH / 2 - 1.2, z: bounds.minZ + 0.8 },
    { x: desk.x + DESK_WIDTH / 2 + 1.2, z: bounds.minZ + 0.8 }
  );
  return { benches, plants };
}

/** The floor each bench and plant takes up, for collide(). */
export function propAreas(props: GalleryProps): Rect[] {
  const benchAreas = props.benches.map((bench) => {
    const turned = Math.abs(Math.sin(bench.rotation)) > 0.5;
    const halfX = (turned ? BENCH_DEPTH : BENCH_LENGTH) / 2;
    const halfZ = (turned ? BENCH_LENGTH : BENCH_DEPTH) / 2;
    return { minX: bench.x - halfX, maxX: bench.x + halfX, minZ: bench.z - halfZ, maxZ: bench.z + halfZ };
  });
  const plantAreas = props.plants.map((plant) => ({
    minX: plant.x - PLANT_RADIUS,
    maxX: plant.x + PLANT_RADIUS,
    minZ: plant.z - PLANT_RADIUS,
    maxZ: plant.z + PLANT_RADIUS
  }));
  return [...benchAreas, ...plantAreas];
}

// collide() runs every frame for every figure, so a layout's solids are
// worked out once.
const solidsCache = new WeakMap<GalleryLayout, Rect[]>();

function solidsOf(layout: GalleryLayout): Rect[] {
  let solids = solidsCache.get(layout);
  if (!solids) {
    solids = [...layout.islands, deskArea(layout), ...propAreas(placeProps(layout))];
    solidsCache.set(layout, solids);
  }
  return solids;
}

/**
 * Moves a point the least distance that puts it at least `radius` clear of
 * every wall, block, the desk and the furniture. Returns a new point.
 */
export function collide(layout: GalleryLayout, point: Point, radius: number): Point {
  let { x, z } = point;
  const solids = solidsOf(layout);
  // Twice, so a push out of one block into a neighbour's corner is resolved.
  for (let pass = 0; pass < 2; pass += 1) {
    x = Math.min(Math.max(x, layout.bounds.minX + radius), layout.bounds.maxX - radius);
    z = Math.min(Math.max(z, layout.bounds.minZ + radius), layout.bounds.maxZ - radius);
    for (const solid of solids) {
      const left = x - (solid.minX - radius);
      const right = solid.maxX + radius - x;
      const back = z - (solid.minZ - radius);
      const front = solid.maxZ + radius - z;
      if (left <= 0 || right <= 0 || back <= 0 || front <= 0) {
        continue;
      }
      // The shortest way out that stays inside the building: a plant in a
      // corner of the building can only be left towards the room.
      const { bounds } = layout;
      const ways = [
        { distance: left, x: solid.minX - radius, z },
        { distance: right, x: solid.maxX + radius, z },
        { distance: front, x, z: solid.maxZ + radius },
        { distance: back, x, z: solid.minZ - radius }
      ].filter(
        (way) =>
          way.x >= bounds.minX + radius - 1e-9 &&
          way.x <= bounds.maxX - radius + 1e-9 &&
          way.z >= bounds.minZ + radius - 1e-9 &&
          way.z <= bounds.maxZ - radius + 1e-9
      );
      const best = ways.reduce<(typeof ways)[number] | null>((a, b) => (a && a.distance <= b.distance ? a : b), null);
      if (best) {
        x = best.x;
        z = best.z;
      }
    }
  }
  return { x, z };
}

type Corridor = { kind: "cross"; j: number } | { kind: "along"; i: number };

/** The corridor a point stands in, preferring the cross corridors at crossings. */
function corridorAt(layout: GalleryLayout, point: Point): Corridor | null {
  for (let j = 0; j < layout.zs.length; j += 1) {
    const line = layout.zs[j] ?? 0;
    const inReception = j === layout.rows && point.z < line;
    if (Math.abs(point.z - line) <= HALF + 1e-6 || inReception) {
      return { kind: "cross", j };
    }
  }
  for (let i = 0; i < layout.xs.length; i += 1) {
    if (Math.abs(point.x - (layout.xs[i] ?? 0)) <= HALF + 1e-6) {
      return { kind: "along", i };
    }
  }
  return null;
}

interface Node {
  i: number;
  j: number;
}

/** The corridor crossings either side of a point along its corridor. */
function nodesBeside(layout: GalleryLayout, point: Point, corridor: Corridor): Node[] {
  if (corridor.kind === "cross") {
    const i = layout.xs.findIndex((x, index) => point.x <= x || index === layout.xs.length - 1);
    return i <= 0 || point.x > (layout.xs[i] ?? 0) ? [{ i: Math.max(i, 0), j: corridor.j }] : [{ i: i - 1, j: corridor.j }, { i, j: corridor.j }];
  }
  const j = layout.zs.findIndex((z, index) => point.z >= z || index === layout.zs.length - 1);
  return j <= 0 || point.z < (layout.zs[j] ?? 0) ? [{ i: corridor.i, j: Math.max(j, 0) }] : [{ i: corridor.i, j: j - 1 }, { i: corridor.i, j }];
}

/**
 * A walkable path from one point to another along the corridors, as the
 * points to pass through after `from`, ending at `to`. Each leg stays inside
 * a single corridor, so it never crosses a wall.
 */
export function route(layout: GalleryLayout, from: Point, to: Point): Point[] {
  const start = corridorAt(layout, from);
  const end = corridorAt(layout, to);
  if (!start || !end) {
    return [to];
  }
  // Within one corridor the straight line is clear.
  if (
    (start.kind === "cross" && end.kind === "cross" && start.j === end.j) ||
    (start.kind === "along" && end.kind === "along" && start.i === end.i)
  ) {
    return [to];
  }
  const at = (node: Node): Point => ({ x: layout.xs[node.i] ?? 0, z: layout.zs[node.j] ?? 0 });
  let best: Point[] = [to];
  let bestLength = Infinity;
  for (const a of nodesBeside(layout, from, start)) {
    for (const b of nodesBeside(layout, to, end)) {
      // Between crossings, turn once: along a's cross corridor then down b's
      // corridor, or the other way round. Both legs follow corridor lines.
      for (const corner of [{ i: b.i, j: a.j }, { i: a.i, j: b.j }]) {
        const path = dedupe([at(a), at(corner), at(b), to]);
        const length = pathLength(from, path);
        if (length < bestLength) {
          best = path;
          bestLength = length;
        }
      }
    }
  }
  return best;
}

export function pathLength(from: Point, path: readonly Point[]): number {
  let length = 0;
  let previous = from;
  for (const point of path) {
    length += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
  }
  return length;
}

function dedupe(points: Point[]): Point[] {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || Math.hypot(point.x - previous.x, point.z - previous.z) > 0.01;
  });
}
