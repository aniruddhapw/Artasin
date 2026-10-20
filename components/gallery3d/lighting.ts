/**
 * Lightmaps for the 3D gallery's walls and floor: the light from every
 * painting's spotlight (lib/galleryLighting.ts), worked out pixel by pixel
 * once as the room is built and kept in small textures. Drawing them then
 * costs a phone nothing, unlike real lights, which would cost every frame.
 *
 * Values are linear light in [0, LIGHT_RANGE], stored as 8-bit and read back
 * with lightMapIntensity = LIGHT_RANGE.
 */

import type * as THREE_NS from "three";
import type { GalleryLayout, Rect } from "@/lib/galleryLayout";
import { HALL_HEIGHT, ambientAt, spotLight, type Spot, type WallFace } from "@/lib/galleryLighting";

type Three = typeof THREE_NS;

/** Brightest value a lightmap can hold. */
export const LIGHT_RANGE = 2;
/**
 * The material's lightMapIntensity. three.js treats a lightmap as irradiance
 * and divides by π (Lambert), so a stored 1 would show a surface at a third
 * of its colour; this undoes that, so 1 shows it at its own colour.
 */
export const LIGHT_MAP_INTENSITY = LIGHT_RANGE * Math.PI;
/** Resolution: the light changes slowly, so a few pixels a metre is plenty. */
const WALL_PX_PER_M = 16;
const FLOOR_PX_PER_M = 8;
/** The spots' light is warm; the general light a little less so. */
const SPOT_TINT = [1, 0.9, 0.74] as const;
const AMBIENT_TINT = [1, 0.95, 0.86] as const;

/** Where a wall face's plane goes and which way its texture runs. */
export interface WallPlane {
  centre: { x: number; z: number };
  width: number;
  /** Rotation about y that turns the plane (which faces +z) to face into the room. */
  rotation: number;
}

export function wallPlane(face: WallFace): WallPlane {
  return {
    centre: { x: (face.a.x + face.b.x) / 2, z: (face.a.z + face.b.z) / 2 },
    width: Math.hypot(face.b.x - face.a.x, face.b.z - face.a.z),
    rotation: Math.atan2(face.n.x, face.n.z)
  };
}

/**
 * The light on one wall face, laid out as the plane's texture: left to right
 * along the plane, top row at the ceiling.
 */
export function wallLightmap(THREE: Three, face: WallFace, spots: readonly Spot[]): THREE_NS.DataTexture {
  const plane = wallPlane(face);
  // The plane's own +x, along which its texture runs.
  const along = { x: Math.cos(plane.rotation), z: -Math.sin(plane.rotation) };
  const normal = { x: face.n.x, y: 0, z: face.n.z };
  const width = Math.max(4, Math.ceil(plane.width * WALL_PX_PER_M));
  const height = Math.ceil(HALL_HEIGHT * WALL_PX_PER_M);
  const data = new Uint8Array(width * height * 4);
  // Each spot only reaches a few metres along the wall; skip it elsewhere.
  const reach = spots.map((spot) => (spot.lamp.x - plane.centre.x) * along.x + (spot.lamp.z - plane.centre.z) * along.z);
  for (let column = 0; column < width; column += 1) {
    const offset = ((column + 0.5) / width - 0.5) * plane.width;
    const x = plane.centre.x + along.x * offset;
    const z = plane.centre.z + along.z * offset;
    const near = spots.filter((_, index) => Math.abs((reach[index] ?? 0) - offset) < 4);
    for (let row = 0; row < height; row += 1) {
      const y = HALL_HEIGHT * (1 - (row + 0.5) / height);
      let lit = 0;
      for (const spot of near) {
        lit += spotLight(spot, { x, y, z }, normal);
      }
      // DataTexture rows run bottom-up (no flip), so the top row is last.
      write(data, (height - 1 - row) * width + column, ambientAt(y), lit);
    }
  }
  return lightTexture(THREE, data, width, height);
}

/**
 * The light on the floor, laid out as the floor plane's texture (x across,
 * the far end at the top): pools at the foot of each lit wall, a soft pool
 * under each crossing's ceiling panel, and darker where the floor meets a
 * wall.
 */
export function floorLightmap(THREE: Three, layout: GalleryLayout, spots: readonly Spot[]): THREE_NS.DataTexture {
  const { bounds } = layout;
  const floorWidth = bounds.maxX - bounds.minX;
  const floorDepth = bounds.maxZ - bounds.minZ;
  const width = Math.ceil(floorWidth * FLOOR_PX_PER_M);
  const height = Math.ceil(floorDepth * FLOOR_PX_PER_M);
  const data = new Uint8Array(width * height * 4);
  const up = { x: 0, y: 1, z: 0 };
  const crossings = layout.xs.flatMap((x) => layout.zs.map((z) => ({ x, z })));
  for (let row = 0; row < height; row += 1) {
    // Row 0 of the texture is the near end (+z): DataTextures aren't flipped.
    const z = bounds.maxZ - ((row + 0.5) / height) * floorDepth;
    for (let column = 0; column < width; column += 1) {
      const x = bounds.minX + ((column + 0.5) / width) * floorWidth;
      const index = row * width + column;
      if (layout.islands.some((island) => inside(island, x, z))) {
        write(data, index, 0, 0);
        continue;
      }
      // Darker within a metre of any wall, as light falls off into corners.
      const toWall = Math.min(wallDistance(bounds, x, z), ...layout.islands.map((island) => rectDistance(island, x, z)));
      let ambient = 0.22 * (0.65 + 0.35 * smoothstep(0, 1, toWall));
      for (const crossing of crossings) {
        const distance = Math.hypot(x - crossing.x, z - crossing.z);
        ambient += 0.22 * (1 - smoothstep(0, 3.4, distance));
      }
      let lit = 0;
      for (const spot of spots) {
        if (Math.abs(spot.lamp.x - x) < 5 && Math.abs(spot.lamp.z - z) < 5) {
          lit += spotLight(spot, { x, y: 0, z }, up);
        }
      }
      write(data, index, ambient, lit);
    }
  }
  return lightTexture(THREE, data, width, height);
}

function write(data: Uint8Array, index: number, ambient: number, lit: number): void {
  for (let channel = 0; channel < 3; channel += 1) {
    const value = ambient * (AMBIENT_TINT[channel] ?? 1) + lit * (SPOT_TINT[channel] ?? 1);
    data[index * 4 + channel] = Math.round(Math.min(value / LIGHT_RANGE, 1) * 255);
  }
  data[index * 4 + 3] = 255;
}

function lightTexture(THREE: Three, data: Uint8Array, width: number, height: number): THREE_NS.DataTexture {
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function inside(rect: Rect, x: number, z: number): boolean {
  return x > rect.minX && x < rect.maxX && z > rect.minZ && z < rect.maxZ;
}

/** Distance from a point inside the building to its nearest outer wall. */
function wallDistance(bounds: Rect, x: number, z: number): number {
  return Math.min(x - bounds.minX, bounds.maxX - x, z - bounds.minZ, bounds.maxZ - z);
}

/** Distance from a point outside a block to the block. */
function rectDistance(rect: Rect, x: number, z: number): number {
  const dx = Math.max(rect.minX - x, 0, x - rect.maxX);
  const dz = Math.max(rect.minZ - z, 0, z - rect.maxZ);
  return Math.hypot(dx, dz);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}
