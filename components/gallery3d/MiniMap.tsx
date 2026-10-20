"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import type { Point } from "@/lib/galleryLayout";
import type { GalleryLive, GalleryMap } from "./types";

/**
 * The 3D gallery's mini-map: the floor plan from above, with each wing's
 * paintings in its own colour, the desk, the other visitors, the helper and
 * the viewer with the way they are facing. Tap a painting to go to it, or
 * anywhere on the floor to walk there. It reads where everyone is straight
 * from the scene a few times a second and draws on a canvas, so it costs
 * React nothing while people move.
 *
 * Compact, it sits in a corner and zooms in on the viewer; expanded, it
 * fills the view with a list of the wings to jump to.
 */

/** One colour a wing; the Grand Hall (always first when there is one) gets the neutral. */
const WING_COLOURS = ["#8a7d6c", "#b0643f", "#5f8068", "#6a6aa3", "#b0883a", "#8a5a80", "#4d7f91", "#a0523f"];
const ZOOMS = [1, 1.8, 3] as const;
/** How often the map redraws, in ms: people walk slowly at this scale. */
const FRAME_MS = 80;
/** How near (in CSS pixels) a tap must be to a painting to pick it. */
const PICK_RADIUS = 14;

export function wingColour(index: number): string {
  return WING_COLOURS[index % WING_COLOURS.length] ?? "#8a7d6c";
}

interface View {
  scale: number;
  /** The world point at the canvas's centre. */
  centre: Point;
  width: number;
  height: number;
}

export function MiniMap({
  map,
  live,
  selected,
  deskIndex,
  expanded,
  onExpand,
  onPick,
  onWalk
}: {
  map: GalleryMap;
  live: () => GalleryLive | null;
  selected: number | null;
  deskIndex: number;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  /** A painting (or the desk) was tapped. */
  onPick: (index: number) => void;
  /** The floor was tapped. */
  onWalk: (point: Point) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(0);
  const [wingName, setWingName] = useState<string | null>(null);
  const viewRef = useRef<View | null>(null);
  // The draw loop reads these without restarting.
  const stateRef = useRef({ selected, zoom: expanded ? 0 : zoom, expanded });
  useEffect(() => {
    stateRef.current = { selected, zoom: expanded ? 0 : zoom, expanded };
  });

  const { bounds } = map;
  const worldWidth = bounds.maxX - bounds.minX + 2;
  const worldHeight = bounds.maxZ - bounds.minZ + 2;

  useEffect(() => {
    let frame = 0;
    let last = 0;
    let lastWing: string | null = null;

    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      // Looked up every time: expanding the map swaps the canvas element.
      const canvas = canvasRef.current;
      if (!canvas || now - last < FRAME_MS) {
        return;
      }
      last = now;
      const state = live();
      if (!state) {
        return;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) {
        return;
      }
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      const { selected: current, zoom: zoomStep, expanded: big } = stateRef.current;
      const view = viewFor(map, state.viewer, width, height, ZOOMS[zoomStep] ?? 1);
      viewRef.current = view;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawPlan(ctx, map, view, current, deskIndex, big || zoomStep > 0);
      drawPeople(ctx, view, state);

      const wing = wingAt(map, state.viewer, current);
      if (wing !== lastWing) {
        lastWing = wing;
        setWingName(wing);
      }
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [map, live, deskIndex]);

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const view = viewRef.current;
    const canvas = canvasRef.current;
    if (!view || !canvas) {
      return;
    }
    const box = canvas.getBoundingClientRect();
    const sx = event.clientX - box.left;
    const sy = event.clientY - box.top;
    const world = toWorld(view, sx, sy);
    // Going somewhere from the large map closes it, to watch the walk.
    if (expanded) {
      onExpand(false);
    }
    // The nearest painting within reach of the tap.
    let best = -1;
    let bestDistance = PICK_RADIUS;
    map.paintings.forEach((painting, index) => {
      const [px, py] = toScreen(view, painting.x + painting.nx * 0.4, painting.z + painting.nz * 0.4);
      const distance = Math.hypot(px - sx, py - sy);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    if (best >= 0) {
      onPick(best);
      return;
    }
    const { desk } = map;
    if (Math.abs(world.x - desk.x) < desk.width / 2 + 0.6 && Math.abs(world.z - desk.z) < desk.depth / 2 + 0.6) {
      onPick(deskIndex);
      return;
    }
    const inside = world.x > bounds.minX && world.x < bounds.maxX && world.z > bounds.minZ && world.z < bounds.maxZ;
    const inBlock = map.islands.some(
      (island) => world.x > island.minX && world.x < island.maxX && world.z > island.minZ && world.z < island.maxZ
    );
    if (inside && !inBlock) {
      onWalk(world);
    }
  }

  const canvas = (
    <canvas
      aria-label="Map of the gallery. Tap a painting to go to it, or the floor to walk there."
      className="walk-minimap-canvas"
      onPointerUp={onPointerUp}
      ref={canvasRef}
      role="img"
      style={expanded ? undefined : { aspectRatio: `${worldWidth} / ${worldHeight}` }}
    />
  );

  if (expanded) {
    return (
      <div className="walk-map-expanded" role="dialog" aria-label="Gallery map">
        <div className="walk-map-expanded-head">
          <div>
            <p className="walk-eyebrow">Gallery map</p>
            <h2>{wingName ?? "The gallery"}</h2>
          </div>
          <button aria-label="Close the large map" className="walk-map-button" onClick={() => onExpand(false)} type="button">
            <Icon name="shrink" size={18} />
          </button>
        </div>
        <div className="walk-map-expanded-body">
          <div className="walk-map-expanded-canvas">{canvas}</div>
          {map.wings.length ? (
            <ul className="walk-map-legend">
              {map.wings.map((wing, index) => (
                <li key={wing.name}>
                  <button
                    onClick={() => {
                      onExpand(false);
                      onPick(wing.start);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true" className="walk-map-swatch" style={{ background: wingColour(index) }} />
                    <span>{wing.name}</span>
                    <small>{wing.end - wing.start}</small>
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => {
                    onExpand(false);
                    onPick(deskIndex);
                  }}
                  type="button"
                >
                  <span aria-hidden="true" className="walk-map-swatch walk-map-swatch-desk" />
                  <span>Custom orders desk</span>
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="walk-minimap">
      {canvas}
      <div className="walk-minimap-foot">
        <span className="walk-minimap-wing">{wingName ?? "The gallery"}</span>
        <div className="walk-minimap-tools">
          <button
            aria-label="Zoom out"
            className="walk-map-button"
            disabled={zoom === 0}
            onClick={() => setZoom((step) => Math.max(step - 1, 0))}
            type="button"
          >
            <Icon name="minus" size={14} />
          </button>
          <button
            aria-label="Zoom in"
            className="walk-map-button"
            disabled={zoom === ZOOMS.length - 1}
            onClick={() => setZoom((step) => Math.min(step + 1, ZOOMS.length - 1))}
            type="button"
          >
            <Icon name="plus" size={14} />
          </button>
          <button aria-label="Open the large map" className="walk-map-button" onClick={() => onExpand(true)} type="button">
            <Icon name="expand" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** The scale and centre that fit the plan (zoom 1) or follow the viewer (closer). */
function viewFor(map: GalleryMap, viewer: Point, width: number, height: number, zoom: number): View {
  const { bounds } = map;
  const fit = Math.min(width / (bounds.maxX - bounds.minX + 2), height / (bounds.maxZ - bounds.minZ + 2));
  const scale = fit * zoom;
  const middle = { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  // Follow the viewer, but never past the building's edge.
  const halfX = Math.max((bounds.maxX - bounds.minX + 2) / 2 - width / scale / 2, 0);
  const halfZ = Math.max((bounds.maxZ - bounds.minZ + 2) / 2 - height / scale / 2, 0);
  const centre = {
    x: Math.min(Math.max(viewer.x, middle.x - halfX), middle.x + halfX),
    z: Math.min(Math.max(viewer.z, middle.z - halfZ), middle.z + halfZ)
  };
  return { scale, centre, width, height };
}

function toScreen(view: View, x: number, z: number): [number, number] {
  return [view.width / 2 + (x - view.centre.x) * view.scale, view.height / 2 + (z - view.centre.z) * view.scale];
}

function toWorld(view: View, sx: number, sy: number): Point {
  return { x: view.centre.x + (sx - view.width / 2) / view.scale, z: view.centre.z + (sy - view.height / 2) / view.scale };
}

function drawPlan(
  ctx: CanvasRenderingContext2D,
  map: GalleryMap,
  view: View,
  selected: number | null,
  deskIndex: number,
  labels: boolean
): void {
  const rect = (minX: number, minZ: number, maxX: number, maxZ: number) => {
    const [x0, y0] = toScreen(view, minX, minZ);
    const [x1, y1] = toScreen(view, maxX, maxZ);
    return [x0, y0, x1 - x0, y1 - y0] as const;
  };
  const { bounds, desk } = map;

  // The floor, then the walls round it and the blocks.
  ctx.fillStyle = "#f6f0e5";
  ctx.fillRect(...rect(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ));
  ctx.fillStyle = "#dcd2c2";
  for (const island of map.islands) {
    ctx.fillRect(...rect(island.minX, island.minZ, island.maxX, island.maxZ));
  }
  ctx.strokeStyle = "#5c5249";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(...rect(bounds.minX, bounds.minZ, bounds.maxX, bounds.maxZ));

  // The way in: a gap in the near wall.
  const [ex, ey] = toScreen(view, map.entrance.x, map.entrance.z);
  const gap = Math.max(1.6 * view.scale, 8);
  ctx.fillStyle = "#f6f0e5";
  ctx.fillRect(ex - gap / 2, ey - 2, gap, 4);

  // The desk.
  ctx.fillStyle = selected === deskIndex ? "#241f1a" : "#5c5249";
  ctx.fillRect(...rect(desk.x - desk.width / 2, desk.z - desk.depth / 2, desk.x + desk.width / 2, desk.z + desk.depth / 2));

  // Each painting as a short bar on its wall, in its wing's colour.
  const half = 0.85;
  map.paintings.forEach((painting, index) => {
    const along = { x: -painting.nz, z: painting.nx };
    const inset = 0.35;
    const [x0, y0] = toScreen(view, painting.x + along.x * half + painting.nx * inset, painting.z + along.z * half + painting.nz * inset);
    const [x1, y1] = toScreen(view, painting.x - along.x * half + painting.nx * inset, painting.z - along.z * half + painting.nz * inset);
    ctx.strokeStyle = wingColour(painting.wing);
    ctx.lineWidth = index === selected ? 5 : 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (index === selected) {
      ctx.strokeStyle = "#241f1a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  if (!labels) {
    return;
  }
  // The wings' names, with a pale halo so they read over the plan.
  ctx.font = '600 11px Inter, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  // Skipping any name that would sit on one already written.
  const written: { x0: number; y0: number; x1: number; y1: number }[] = [];
  map.wings.forEach((wing, index) => {
    const [x, y] = toScreen(view, wing.label.x, wing.label.z);
    const half = ctx.measureText(wing.name).width / 2 + 3;
    const box = { x0: x - half, y0: y - 8, x1: x + half, y1: y + 8 };
    if (written.some((other) => box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0)) {
      return;
    }
    written.push(box);
    ctx.strokeStyle = "rgba(246, 240, 229, 0.92)";
    ctx.lineWidth = 4;
    ctx.strokeText(wing.name, x, y);
    ctx.fillStyle = wingColour(index);
    ctx.fillText(wing.name, x, y);
  });
  const [dx, dy] = toScreen(view, desk.x, desk.z + desk.depth / 2 + 1.1);
  ctx.strokeStyle = "rgba(246, 240, 229, 0.92)";
  ctx.lineWidth = 4;
  ctx.strokeText("Custom orders desk", dx, dy);
  ctx.fillStyle = "#3b332c";
  ctx.fillText("Custom orders desk", dx, dy);
}

function drawPeople(ctx: CanvasRenderingContext2D, view: View, state: GalleryLive): void {
  const dot = (point: Point, radius: number, fill: string, ring?: string) => {
    const [x, y] = toScreen(view, point.x, point.z);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (ring) {
      ctx.strokeStyle = ring;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };
  for (const visitor of state.visitors) {
    dot(visitor, 2.6, "rgba(92, 82, 73, 0.55)");
  }
  if (state.helper) {
    dot(state.helper, 3.6, "#a65a3f", "#fff8ee");
  }

  // The viewer: a soft cone the way they face, and a dot with a white ring.
  const [x, y] = toScreen(view, state.viewer.x, state.viewer.z);
  const heading = Math.atan2(-Math.cos(state.viewer.yaw), -Math.sin(state.viewer.yaw));
  const reach = Math.max(7 * view.scale, 26);
  const cone = ctx.createRadialGradient(x, y, 0, x, y, reach);
  cone.addColorStop(0, "rgba(36, 31, 26, 0.35)");
  cone.addColorStop(1, "rgba(36, 31, 26, 0)");
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, reach, heading - 0.55, heading + 0.55);
  ctx.closePath();
  ctx.fillStyle = cone;
  ctx.fill();
  dot(state.viewer, 5, "#241f1a", "#ffffff");
}

/**
 * The wing of the painting in view, else of the painting nearest the viewer
 * if one is near; the reception by the desk.
 */
function wingAt(map: GalleryMap, viewer: Point, selected: number | null): string | null {
  const inView = selected === null ? undefined : map.paintings[selected];
  if (inView) {
    return map.wings[inView.wing]?.name ?? null;
  }
  let nearest = -1;
  let nearestDistance = 6;
  map.paintings.forEach((painting, index) => {
    // A little out from the wall, where someone looking at it would stand.
    const distance = Math.hypot(painting.x + painting.nx * 2 - viewer.x, painting.z + painting.nz * 2 - viewer.z);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });
  const painting = map.paintings[nearest];
  if (painting && map.wings[painting.wing]) {
    return map.wings[painting.wing]?.name ?? null;
  }
  if (viewer.z < map.desk.z + 6) {
    return "Reception";
  }
  return null;
}
