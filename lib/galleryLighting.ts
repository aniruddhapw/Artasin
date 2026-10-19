/**
 * The light in the 3D gallery, worked out once when the room is built and
 * kept in lightmaps (components/gallery3d/lighting.ts) rather than computed
 * every frame, so it costs a phone nothing to draw.
 *
 * Each painting has a ceiling spotlight a little out from its wall, aimed at
 * the painting. Its light on a wall makes the soft "scallop" galleries have:
 * bright on the painting, fading out to the sides and down to the floor,
 * with a cut-off above. Plain geometry with no Three.js, so it can be
 * unit-tested; coordinates are metres, y up, as in lib/galleryLayout.ts.
 */

import type { GalleryLayout, Point, WallSlot } from "@/lib/galleryLayout";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const HALL_HEIGHT = 5.2;
export const HANG_HEIGHT = 1.9;
/** How far out from its wall each painting's spotlight hangs. */
export const SPOT_OUT = 1.5;
/** Height of a spotlight's lamp, below its ceiling track. */
export const LAMP_HEIGHT = HALL_HEIGHT - 0.34;

/** The cone: full light inside INNER, none beyond OUTER, a soft edge between. */
const INNER_ANGLE = (14 * Math.PI) / 180;
const OUTER_ANGLE = (34 * Math.PI) / 180;
/** Brightness at 1 m, along the beam. Tuned so a painting's centre reads about 1.1. */
const SPOT_POWER = 30;

export interface Spot {
  lamp: Vec3;
  /** Unit vector along the beam. */
  axis: Vec3;
}

/** The spotlight for a wall slot: hanging SPOT_OUT out from the wall, aimed at the painting. */
export function spotFor(slot: WallSlot): Spot {
  const lamp = { x: slot.x + slot.nx * SPOT_OUT, y: LAMP_HEIGHT, z: slot.z + slot.nz * SPOT_OUT };
  const aim = { x: slot.x + slot.nx * 0.06, y: HANG_HEIGHT + 0.15, z: slot.z + slot.nz * 0.06 };
  return { lamp, axis: normalise({ x: aim.x - lamp.x, y: aim.y - lamp.y, z: aim.z - lamp.z }) };
}

/**
 * How much of a spot's light falls on a point of a surface facing `normal`:
 * the cone's edge, the inverse square of the distance, and the angle the
 * light arrives at. Zero behind the surface or outside the cone.
 */
export function spotLight(spot: Spot, point: Vec3, normal: Vec3): number {
  const dx = point.x - spot.lamp.x;
  const dy = point.y - spot.lamp.y;
  const dz = point.z - spot.lamp.z;
  const distanceSq = dx * dx + dy * dy + dz * dz;
  if (distanceSq < 1e-6) {
    return 0;
  }
  const distance = Math.sqrt(distanceSq);
  const along = (dx * spot.axis.x + dy * spot.axis.y + dz * spot.axis.z) / distance;
  const cone = smoothstep(Math.cos(OUTER_ANGLE), Math.cos(INNER_ANGLE), along);
  if (cone <= 0) {
    return 0;
  }
  // Light arriving head-on is brightest; grazing light spreads thin.
  const incidence = -(dx * normal.x + dy * normal.y + dz * normal.z) / distance;
  if (incidence <= 0) {
    return 0;
  }
  return (SPOT_POWER * cone * incidence) / distanceSq;
}

/**
 * The general light everywhere, before the spots: a little darker where a
 * wall meets the floor and the ceiling, as light falls off into corners.
 */
export function ambientAt(height: number): number {
  const nearFloor = smoothstep(0, 0.9, height);
  const nearCeiling = smoothstep(0, 1.1, HALL_HEIGHT - height);
  return 0.64 * (0.72 + 0.28 * nearFloor) * (0.8 + 0.2 * nearCeiling);
}

/** A wall face: from `a` to `b` along the floor, with `n` pointing into the room. */
export interface WallFace {
  a: Point;
  b: Point;
  n: Point;
}

/** Every wall face of the plan: the outer walls facing in, the blocks facing out. */
export function wallFaces(layout: GalleryLayout): WallFace[] {
  const box = (r: GalleryLayout["bounds"], sign: 1 | -1): WallFace[] => [
    { a: { x: r.minX, z: r.minZ }, b: { x: r.minX, z: r.maxZ }, n: { x: sign, z: 0 } },
    { a: { x: r.maxX, z: r.minZ }, b: { x: r.maxX, z: r.maxZ }, n: { x: -sign, z: 0 } },
    { a: { x: r.minX, z: r.minZ }, b: { x: r.maxX, z: r.minZ }, n: { x: 0, z: sign } },
    { a: { x: r.minX, z: r.maxZ }, b: { x: r.maxX, z: r.maxZ }, n: { x: 0, z: -sign } }
  ];
  return [...box(layout.bounds, 1), ...layout.islands.flatMap((island) => box(island, -1))];
}

/** The slots on a face: on its line, facing the same way, within its ends. */
export function slotsOnFace(face: WallFace, slots: readonly WallSlot[]): WallSlot[] {
  const minX = Math.min(face.a.x, face.b.x) - 0.01;
  const maxX = Math.max(face.a.x, face.b.x) + 0.01;
  const minZ = Math.min(face.a.z, face.b.z) - 0.01;
  const maxZ = Math.max(face.a.z, face.b.z) + 0.01;
  return slots.filter(
    (slot) =>
      Math.abs(slot.nx - face.n.x) < 1e-6 &&
      Math.abs(slot.nz - face.n.z) < 1e-6 &&
      slot.x >= minX &&
      slot.x <= maxX &&
      slot.z >= minZ &&
      slot.z <= maxZ
  );
}

function normalise(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}
