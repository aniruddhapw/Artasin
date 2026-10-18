/**
 * Other visitors for the virtual gallery: faceless, mannequin-like figures
 * built from simple shapes, who wander the corridors between the paintings,
 * stop to look for a while, sometimes in twos, and keep out of the visitor's way.
 *
 * The figures are generated in code, so the gallery needs no downloads to
 * start; realistic avatars (crowd.ts) take their place once they have loaded.
 * Geometries and materials are shared between figures; scene.ts disposes them
 * with the scene.
 */

import type * as THREE_NS from "three";
import type { Point } from "@/lib/galleryLayout";
import { CLOTHING_DYES, type VisitorBody, type VisitorModel } from "./crowd";
import { addYaw, type StaffModel, type StaffRole } from "./staff";
import type { NonEmptyArray } from "@/types/utils";

type Three = typeof THREE_NS;

/** A painting on the wall, as far as visitors care: where it is and which way it faces. */
interface PaintingSpot {
  group: THREE_NS.Object3D;
  /** The wall's normal, out into the corridor. */
  normal: Point;
}

export interface VisitorOptions {
  hung: readonly PaintingSpot[];
  /** How to get about the floor plan (lib/galleryLayout.ts). */
  walk: {
    /** The points to pass through from one place to another, ending at `to`. */
    route(from: Point, to: Point): Point[];
    /** The nearest place at least `radius` clear of walls and the desk. */
    collide(point: Point, radius: number): Point;
  };
  reducedMotion: boolean;
  /** A soft radial texture, reused for the shadow under each figure. */
  glowTexture: THREE_NS.Texture;
  /** Where the representative stands behind the custom-orders desk. */
  desk?: { x: number; z: number };
  /** Where the Artasin helper waits for the visitor to arrive. */
  helper?: { x: number; z: number };
}

/**
 * The floor between a painting and the viewer looking at it, which passers-by
 * keep out of: from the wall out to just past the viewer, as wide as the
 * painting plus a margin.
 */
export interface ClearView {
  /** The painting's centre on the wall. */
  x: number;
  z: number;
  /** The wall's normal, towards the viewer. */
  nx: number;
  nz: number;
  halfWidth: number;
  /** How far out from the wall the viewer stands. */
  depth: number;
}

export interface Visitors {
  update(dt: number, viewer: { x: number; z: number }, focusedIndex: number | null, clearView: ClearView | null): void;
  setVisible(visible: boolean): void;
  count: number;
  /** The representative's meshes, so clicking them opens the desk. */
  representativeMeshes: THREE_NS.Mesh[];
  /** The helper's meshes and name tag, so clicking them opens the helper. */
  helperObjects: THREE_NS.Object3D[];
  /** Swaps the staff's simple figures for realistic models once they have loaded. */
  useStaffModels(models: Partial<Record<StaffRole, StaffModel>>): void;
  /** Swaps the other visitors' simple figures for realistic avatars once they have loaded. */
  useVisitorModels(models: readonly VisitorModel[]): void;
}

/** How a figure is dressed. Colours are hex numbers. */
interface Look {
  scale: number;
  clothes: number;
  trousers: number;
  skin: number;
  shoes: number;
  coat: boolean;
  hair?: number;
  bun?: boolean;
  hat?: number;
  scarf?: number;
  bag?: number;
  /** Which arm carries the bag. */
  bagArm?: 0 | 1;
}

interface Figure {
  root: THREE_NS.Group;
  body: THREE_NS.Group;
  head: THREE_NS.Group;
  legs: [THREE_NS.Group, THREE_NS.Group];
  arms: [THREE_NS.Group, THREE_NS.Group];
}

interface Visitor extends Figure {
  speed: number;
  heading: number;
  /** The heading that faces the painting they are looking at. */
  faceHeading: number;
  phase: number;
  sway: number;
  state: "look" | "walk";
  timer: number;
  painting: number;
  target: THREE_NS.Vector3;
  /** Corridor waypoints still to walk through, ending at target. */
  path: Point[];
  /** 0 standing still, 1 walking; eases between the two. */
  blend: number;
  /** Already stepped aside for the viewer at this painting. */
  madeRoom?: boolean;
  /** The realistic avatar standing in for the simple figure, once loaded. */
  model?: VisitorBody;
  /** Time not yet given to the avatar's animation (far-off ones update less often). */
  pendingDt: number;
  /** Counts frames, to update far-off avatars on every third. */
  frame: number;
}

interface Helper extends Figure {
  tag: THREE_NS.Sprite;
  staff?: StaffModel;
  /** Head turn towards the visitor while standing, eased. */
  look: number;
  /** Has waved hello on the visitor's first approach. */
  greeted: boolean;
  heading: number;
  faceHeading: number;
  phase: number;
  blend: number;
  sway: number;
  path: Point[];
  /** Where it is headed, to tell when the plan needs redoing. */
  goal: Point | null;
  /** Seconds until the plan may be redone. */
  replan: number;
}

interface Representative extends Figure {
  staff?: StaffModel;
  meshes: THREE_NS.Mesh[];
  sway: number;
  look: number;
  wave: number;
  waveCooldown: number;
}

// Muted clothing colours in keeping with the site's palette.
const CLOTHES = [0x2b2b2e, 0x3d4a5c, 0xb48a5a, 0xa65a3f, 0xe9e2d3, 0x5d6b4f, 0x6e5a7a, 0x8c8c86] as const;
const TROUSERS = [0x1f1f22, 0x2f3540, 0x4a4036, 0xd8cfbe, 0x3a3a3a] as const;
// Faceless mannequin heads in a range of warm tones.
const SKIN = [0xe8d5bf, 0xd2b08c, 0xb08765, 0x8a6446, 0x5e412d] as const;
const HAIR = [0x1c1612, 0x3b2a1e, 0x6b4e33, 0x9a9590, 0x2a2420] as const;
const SHOES = [0x161616, 0x3a2a1e, 0xf2f0ea] as const;

const WALK_SPEED: Range = [0.75, 1.15];
const LOOK_TIME: Range = [5, 15];
const PERSONAL_SPACE = 0.75;
const VIEWER_SPACE = 1.3;
/** Closer to the camera than this, a visitor is hidden rather than drawn as a blur. */
const NEAR_VIEWER = 1;
/** How close a visitor's middle comes to a wall. */
const BODY_RADIUS = 0.35;
/** Further than this, an avatar is small enough on screen to animate on every third frame. */
const FAR_VIEWER = 12;

/** A [min, max] range to pick a random value from. */
type Range = readonly [number, number];

export function createVisitors(
  THREE: Three,
  scene: THREE_NS.Scene,
  { hung, walk, reducedMotion, glowTexture, desk, helper: helperStart }: VisitorOptions
): Visitors {
  const count = hung.length ? Math.min(Math.max(Math.round(hung.length / 3), 3), 12) : 0;

  // A fixed seed gives every visit the same crowd.
  let seed = 20241;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const between = ([min, max]: Range) => min + random() * (max - min);
  const pickFrom = <T,>(list: NonEmptyArray<T>): T => list[Math.floor(random() * list.length)] ?? list[0];

  const materials = new Map<number, THREE_NS.MeshStandardMaterial>();
  const material = (color: number): THREE_NS.MeshStandardMaterial => {
    let shared = materials.get(color);
    if (!shared) {
      shared = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      materials.set(color, shared);
    }
    return shared;
  };

  const geometry = {
    leg: new THREE.CapsuleGeometry(0.068, 0.72, 4, 10),
    shoe: new THREE.SphereGeometry(0.075, 12, 8),
    torso: new THREE.CapsuleGeometry(0.17, 0.42, 4, 14),
    coat: new THREE.CylinderGeometry(0.18, 0.26, 0.62, 16, 1, true),
    arm: new THREE.CapsuleGeometry(0.048, 0.52, 4, 10),
    neck: new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10),
    head: new THREE.SphereGeometry(0.11, 18, 14),
    hair: new THREE.SphereGeometry(0.118, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    bun: new THREE.SphereGeometry(0.06, 12, 10),
    brim: new THREE.CylinderGeometry(0.19, 0.19, 0.012, 20),
    crown: new THREE.CylinderGeometry(0.1, 0.11, 0.1, 18),
    bag: new THREE.BoxGeometry(0.06, 0.3, 0.28),
    scarf: new THREE.TorusGeometry(0.075, 0.03, 8, 18),
    shadow: new THREE.PlaneGeometry(0.9, 0.9)
  };
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: glowTexture,
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });

  const visitors: Visitor[] = [];
  for (let i = 0; i < count; i += 1) {
    visitors.push(buildVisitor(i));
  }

  // A random outfit for a visitor. Each choice draws from the seeded random,
  // so the crowd is the same on every visit.
  function randomLook(): Look {
    const look: Look = {
      scale: between([0.9, 1.06]),
      clothes: pickFrom(CLOTHES),
      trousers: pickFrom(TROUSERS),
      skin: pickFrom(SKIN),
      shoes: pickFrom(SHOES),
      coat: random() < 0.4
    };
    const accessory = random();
    if (accessory < 0.45) {
      look.hair = pickFrom(HAIR);
      look.bun = random() < 0.4;
    } else if (accessory < 0.62) {
      look.hat = pickFrom([0x2b2b2e, 0xb48a5a, 0xe9e2d3]);
    }
    if (random() < 0.3) {
      look.scarf = pickFrom([0xa65a3f, 0xe9e2d3, 0x3d4a5c, 0xb48a5a]);
    }
    if (random() < 0.3) {
      look.bag = pickFrom([0xd9ccb4, 0x2b2b2e, 0x8a5a3a]);
      look.bagArm = random() < 0.5 ? 0 : 1;
    }
    return look;
  }

  // Builds one figure, facing +Z with its feet at the origin.
  function buildFigure(look: Look): Figure {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    root.scale.setScalar(look.scale);

    const clothes = material(look.clothes);
    const trousers = material(look.trousers);
    const skin = material(look.skin);
    const shoes = material(look.shoes);

    const limb = (geo: THREE_NS.BufferGeometry, mat: THREE_NS.Material, x: number, y: number, drop: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = -drop;
      pivot.add(mesh);
      body.add(pivot);
      return pivot;
    };

    const leg = (x: number) => {
      const pivot = limb(geometry.leg, trousers, x, 0.92, 0.43);
      const shoe = new THREE.Mesh(geometry.shoe, shoes);
      shoe.scale.set(1, 0.6, 1.5);
      shoe.position.set(0, -0.88, 0.04);
      pivot.add(shoe);
      return pivot;
    };
    const legs: Figure["legs"] = [leg(-0.09), leg(0.09)];

    const torso = new THREE.Mesh(geometry.torso, clothes);
    torso.scale.set(1, 1, 0.72);
    torso.position.y = 1.2;
    body.add(torso);
    if (look.coat) {
      const coat = new THREE.Mesh(geometry.coat, clothes);
      coat.scale.set(1, 1, 0.78);
      coat.position.y = 0.92;
      body.add(coat);
    }

    const arms: Figure["arms"] = [limb(geometry.arm, clothes, -0.225, 1.42, 0.3), limb(geometry.arm, clothes, 0.225, 1.42, 0.3)];
    arms[0].rotation.z = -0.06;
    arms[1].rotation.z = 0.06;

    const neck = new THREE.Mesh(geometry.neck, skin);
    neck.position.y = 1.55;
    body.add(neck);

    const head = new THREE.Group();
    head.position.y = 1.67;
    head.add(new THREE.Mesh(geometry.head, skin));
    body.add(head);

    if (look.hair !== undefined) {
      const hairMaterial = material(look.hair);
      const hair = new THREE.Mesh(geometry.hair, hairMaterial);
      hair.position.y = 0.01;
      hair.rotation.x = -0.25;
      head.add(hair);
      if (look.bun) {
        const bun = new THREE.Mesh(geometry.bun, hairMaterial);
        bun.position.set(0, 0.07, -0.1);
        head.add(bun);
      }
    } else if (look.hat !== undefined) {
      const hat = material(look.hat);
      const brim = new THREE.Mesh(geometry.brim, hat);
      brim.position.y = 0.07;
      const crown = new THREE.Mesh(geometry.crown, hat);
      crown.position.y = 0.12;
      head.add(brim, crown);
    }
    if (look.scarf !== undefined) {
      const scarf = new THREE.Mesh(geometry.scarf, material(look.scarf));
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 1.52;
      body.add(scarf);
    }
    if (look.bag !== undefined) {
      const bag = new THREE.Mesh(geometry.bag, material(look.bag));
      bag.position.set(0, -0.42, 0);
      arms[look.bagArm ?? 0].add(bag);
    }

    const shadow = new THREE.Mesh(geometry.shadow, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    root.add(shadow);

    scene.add(root);
    return { root, body, head, legs, arms };
  }

  function buildVisitor(index: number): Visitor {
    const { root, body, head, legs, arms } = buildFigure(randomLook());

    const visitor: Visitor = {
      root,
      body,
      head,
      legs,
      arms,
      speed: between(WALK_SPEED),
      heading: random() * Math.PI * 2,
      faceHeading: 0,
      phase: random() * Math.PI * 2,
      sway: random() * Math.PI * 2,
      state: "look",
      timer: between(LOOK_TIME) * random(),
      painting: index % hung.length,
      target: new THREE.Vector3(),
      path: [],
      blend: 0,
      pendingDt: 0,
      frame: index
    };
    chooseSpot(visitor, visitor.painting);
    root.position.copy(visitor.target);
    visitor.path = [];
    visitor.heading = visitor.faceHeading;
    return visitor;
  }

  // Where to stand to look at a painting: a step or two back from the wall,
  // off to one side if someone is already there.
  function chooseSpot(visitor: Visitor, paintingIndex: number) {
    const item = hung[paintingIndex];
    if (!item) {
      return;
    }
    const company = visitors.filter((other) => other !== visitor && other.painting === paintingIndex).length;
    const along = (company ? (company % 2 ? 1 : -1) * (0.55 + 0.25 * company) : 0) + (random() - 0.5) * 0.5;
    const back = between([1.5, 2.4]);
    const { x: nx, z: nz } = item.normal;
    visitor.painting = paintingIndex;
    // Out from the wall along its normal, and sideways along the wall.
    const spot = walk.collide(
      { x: item.group.position.x + nx * back - nz * along, z: item.group.position.z + nz * back + nx * along },
      BODY_RADIUS
    );
    visitor.target.set(spot.x, 0, spot.z);
    visitor.path = walk.route({ x: visitor.root.position.x, z: visitor.root.position.z }, spot);
    // Face the wall the painting hangs on (figures are built facing +Z).
    visitor.faceHeading = Math.atan2(-nx, -nz);
  }

  function nextPainting(visitor: Visitor): number {
    // Mostly the neighbours, sometimes somewhere further off.
    const near = random() < 0.75;
    let next = near
      ? visitor.painting + (random() < 0.5 ? -1 : 1) * (1 + Math.floor(random() * 3))
      : Math.floor(random() * hung.length);
    next = Math.min(Math.max(next, 0), hung.length - 1);
    // Not the one they just saw, nor the one the viewer is in front of.
    for (let tries = 0; (next === visitor.painting || next === focused) && tries < 2 && hung.length > 2; tries += 1) {
      next = (next + 1) % hung.length;
    }
    return next;
  }

  // The ARTASIN representative behind the custom-orders desk: dressed in the
  // house black with a terracotta scarf and a name badge, facing the reception.
  const representative = desk ? buildRepresentative(desk) : null;

  function buildRepresentative({ x, z }: { x: number; z: number }): Representative {
    const figure = buildFigure({
      scale: 1,
      clothes: 0x1d1d1f,
      trousers: 0x1d1d1f,
      skin: SKIN[2],
      shoes: 0x161616,
      coat: false,
      hair: HAIR[0],
      bun: true,
      scarf: 0xa65a3f
    });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.01), material(0xf4f1ea));
    badge.position.set(0.09, 1.33, 0.125);
    figure.body.add(badge);
    figure.root.position.set(x, 0, z);
    const meshes: THREE_NS.Mesh[] = [];
    figure.root.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material !== shadowMaterial) {
        meshes.push(object);
      }
    });
    return { ...figure, meshes, sway: 0, look: 0, wave: 0, waveCooldown: 0 };
  }

  function updateRepresentative(rep: Representative, dt: number, viewer: { x: number; z: number }) {
    const dx = viewer.x - rep.root.position.x;
    const dz = viewer.z - rep.root.position.z;
    const distance = Math.hypot(dx, dz);
    // Follow the viewer with a turn of the head once they are in the room's
    // far end, and wave once as they reach the desk.
    const towards = distance < 14 ? clampAngle(Math.atan2(dx, dz), 0.9) : 0;
    rep.look += (towards - rep.look) * Math.min(dt * 3, 1);
    rep.head.rotation.y = reducedMotion ? 0 : rep.look;
    rep.waveCooldown = Math.max(rep.waveCooldown - dt, 0);
    if (!reducedMotion && distance < 5 && dz > 0 && !rep.waveCooldown && !rep.wave) {
      rep.wave = 2.4;
      rep.waveCooldown = 25;
      if (rep.staff) {
        playWave(rep.staff);
      }
    }
    if (rep.staff) {
      rep.staff.mixer.update(reducedMotion ? 0 : dt);
      if (rep.staff.head) {
        addYaw(THREE, rep.staff.head, rep.look);
      }
    }
    rep.sway += dt * (reducedMotion ? 0 : 0.6);
    rep.body.rotation.z = Math.sin(rep.sway) * 0.015;
    let raise = 0;
    if (rep.wave > 0) {
      rep.wave = Math.max(rep.wave - dt, 0);
      // Ease the arm up, wave, and back down.
      raise = Math.min(1, (2.4 - rep.wave) * 3, rep.wave * 3);
    }
    const arm = rep.arms[1];
    arm.rotation.z = 0.06 + raise * (2.45 + Math.sin(rep.wave * 11) * 0.22);
    arm.rotation.x = -raise * 0.25;
  }

  // The Artasin helper: in a terracotta top with a cream scarf and an
  // "Ask me" tag above their head, so visitors know who to click.
  const helper = helperStart ? buildHelper(helperStart) : null;

  function buildHelper({ x, z }: { x: number; z: number }): Helper {
    const figure = buildFigure({
      scale: 1,
      clothes: 0xa65a3f,
      trousers: 0x1d1d1f,
      skin: SKIN[1],
      shoes: 0x161616,
      coat: false,
      hair: HAIR[1],
      scarf: 0xf4f1ea
    });
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.01), material(0xf4f1ea));
    badge.position.set(0.09, 1.33, 0.125);
    figure.body.add(badge);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeTagTexture(THREE), transparent: true, depthWrite: false }));
    tag.scale.set(0.62, 0.22, 1);
    tag.position.y = 2.12;
    figure.root.add(tag);
    figure.root.position.set(x, 0, z);
    // Facing in from the entrance side, towards an arriving visitor.
    return {
      ...figure,
      tag,
      look: 0,
      greeted: false,
      heading: 0,
      faceHeading: 0,
      phase: 0,
      blend: 0,
      sway: 0,
      path: [],
      goal: null,
      replan: 0
    };
  }

  /**
   * Keeps the helper near the visitor without crowding them: beside them,
   * a step nearer the wall, while they look at a painting; otherwise it
   * catches up when the visitor wanders more than a few rooms away.
   */
  function updateHelper(guide: Helper, dt: number, viewer: { x: number; z: number }, clearView: ClearView | null) {
    const { root } = guide;
    guide.replan = Math.max(guide.replan - dt, 0);
    let goal: Point | null = null;
    let faceAt: Point = viewer;
    if (clearView) {
      // Just past the painting's edge on the side away from its label (which
      // hangs on the painting's own +x, i.e. -tangent here), and well out in
      // front of the viewer, so they show at the edge of the view without
      // covering the work.
      const tx = -clearView.nz;
      const tz = clearView.nx;
      const out = clamp(clearView.depth * 0.3, 1, Math.max(clearView.depth - 1, 1));
      const across = clearView.halfWidth + 0.55;
      goal = walk.collide(
        { x: clearView.x + clearView.nx * out + tx * across, z: clearView.z + clearView.nz * out + tz * across },
        BODY_RADIUS
      );
      faceAt = { x: clearView.x, z: clearView.z };
    } else if (Math.hypot(viewer.x - root.position.x, viewer.z - root.position.z) > 9) {
      const dx = root.position.x - viewer.x;
      const dz = root.position.z - viewer.z;
      const gap = Math.hypot(dx, dz) || 1;
      goal = walk.collide({ x: viewer.x + (dx / gap) * 2.2, z: viewer.z + (dz / gap) * 2.2 }, BODY_RADIUS);
    }
    const moved = goal && (!guide.goal || Math.hypot(goal.x - guide.goal.x, goal.z - guide.goal.z) > 1);
    if (goal && moved && !guide.replan && !reducedMotion) {
      guide.goal = goal;
      guide.path = walk.route({ x: root.position.x, z: root.position.z }, goal);
      guide.replan = 1.5;
    }

    let moving = false;
    let waypoint = guide.path[0];
    while (waypoint && Math.hypot(waypoint.x - root.position.x, waypoint.z - root.position.z) < 0.1) {
      guide.path.shift();
      waypoint = guide.path[0];
    }
    if (waypoint && !reducedMotion) {
      desired.set(waypoint.x - root.position.x, 0, waypoint.z - root.position.z);
      const distance = desired.length();
      desired.divideScalar(distance);
      root.position.addScaledVector(desired, Math.min(1.4 * dt, distance));
      const clear = walk.collide({ x: root.position.x, z: root.position.z }, BODY_RADIUS);
      root.position.x = clear.x;
      root.position.z = clear.z;
      guide.heading += wrapAngle(Math.atan2(desired.x, desired.z) - guide.heading) * Math.min(dt * 6, 1);
      moving = true;
    } else {
      guide.faceHeading = Math.atan2(faceAt.x - root.position.x, faceAt.z - root.position.z);
      guide.heading += wrapAngle(guide.faceHeading - guide.heading) * Math.min(dt * 3, 1);
    }
    root.rotation.y = guide.heading;

    guide.blend += ((moving ? 1 : 0) - guide.blend) * Math.min(dt * 5, 1);
    guide.phase += dt * 1.4 * 5.2;
    const swing = Math.sin(guide.phase) * 0.5 * guide.blend;
    guide.legs[0].rotation.x = swing;
    guide.legs[1].rotation.x = -swing;
    guide.arms[0].rotation.x = -swing * 0.75;
    guide.arms[1].rotation.x = swing * 0.75;
    guide.body.position.y = Math.abs(Math.cos(guide.phase)) * 0.03 * guide.blend;
    guide.sway += dt * (reducedMotion ? 0 : 1.6);
    // The tag bobs gently so it catches the eye.
    guide.tag.position.y = 2.12 + Math.sin(guide.sway) * 0.03;

    if (guide.staff) {
      const { mixer, actions, head } = guide.staff;
      const waving = actions.wave?.isRunning() ?? false;
      actions.walk?.setEffectiveWeight(guide.blend);
      if (!waving) {
        actions.idle?.setEffectiveWeight(1 - guide.blend);
      }
      // A wave the first time the visitor comes near, while standing.
      const near = Math.hypot(viewer.x - root.position.x, viewer.z - root.position.z) < 7;
      if (!guide.greeted && near && !moving && !reducedMotion) {
        guide.greeted = true;
        playWave(guide.staff);
      }
      // Glance at the visitor while standing still.
      const towards = moving ? 0 : clampAngle(Math.atan2(viewer.x - root.position.x, viewer.z - root.position.z) - guide.heading, 0.8);
      guide.look += (towards - guide.look) * Math.min(dt * 3, 1);
      mixer.update(reducedMotion ? 0 : dt);
      if (head) {
        addYaw(THREE, head, guide.look);
      }
    }
  }

  // Into the wave and, when it is done, back to standing.
  function playWave({ mixer, actions }: StaffModel) {
    const { wave, idle } = actions;
    if (!wave || wave.isRunning()) {
      return;
    }
    wave.reset().setEffectiveWeight(1).fadeIn(0.35).play();
    idle?.fadeOut(0.35);
    const done = (event: { action: THREE_NS.AnimationAction }) => {
      if (event.action !== wave) {
        return;
      }
      mixer.removeEventListener("finished", done);
      wave.fadeOut(0.45);
      idle?.reset().fadeIn(0.45).play();
    };
    mixer.addEventListener("finished", done);
  }

  // The model stands where the simple figure stood; the figure stays, hidden,
  // as what clicks land on.
  function adopt(figure: Figure, staff: StaffModel) {
    figure.root.add(staff.model);
    figure.body.visible = false;
  }

  // Each visitor takes the next avatar in turn, so the same one never stands
  // at neighbouring paintings (visitors start at consecutive ones). The first
  // of each wears their own clothes; later copies wear a different colour top.
  function useVisitorModels(models: readonly VisitorModel[]) {
    visitors.forEach((visitor, index) => {
      const model = models[index % models.length];
      if (visitor.model || !model) {
        return;
      }
      const copy = Math.floor(index / models.length);
      visitor.model = model.create(copy ? CLOTHING_DYES[(index + 3 * copy) % CLOTHING_DYES.length] : undefined);
      visitor.root.add(visitor.model.object);
      visitor.body.visible = false;
      // The avatars already differ in build; keep heights within a natural range.
      visitor.root.scale.setScalar(clamp(visitor.root.scale.x, 0.95, 1.03));
    });
  }

  function useStaffModels(models: Partial<Record<StaffRole, StaffModel>>) {
    if (representative && models.desk && !representative.staff) {
      representative.staff = models.desk;
      adopt(representative, models.desk);
    }
    if (helper && models.helper && !helper.staff) {
      helper.staff = models.helper;
      adopt(helper, models.helper);
    }
  }

  let focused: number | null = null;
  const desired = new THREE.Vector3();
  const push = new THREE.Vector3();
  const offset = new THREE.Vector3();

  function update(dt: number, viewer: { x: number; z: number }, focusedIndex: number | null, clearView: ClearView | null) {
    focused = focusedIndex;
    if (representative) {
      updateRepresentative(representative, dt, viewer);
    }
    if (helper) {
      updateHelper(helper, dt, viewer, clearView);
    }
    for (const visitor of visitors) {
      const { root } = visitor;

      // Someone standing at the painting the viewer just walked up to steps
      // aside, so they never block the view.
      if (visitor.state === "look" && visitor.painting === focusedIndex && !visitor.madeRoom) {
        visitor.madeRoom = true;
        visitor.state = "walk";
        chooseSpot(visitor, nextPainting(visitor));
      }

      if (visitor.state === "look") {
        visitor.timer -= dt;
        if (visitor.timer <= 0 && !reducedMotion) {
          visitor.state = "walk";
          visitor.madeRoom = false;
          chooseSpot(visitor, nextPainting(visitor));
        }
      }

      let moving = false;
      if (visitor.state === "walk" && !reducedMotion) {
        // Head for the next corridor waypoint; the last one is the spot.
        let waypoint = visitor.path[0];
        while (waypoint && Math.hypot(waypoint.x - root.position.x, waypoint.z - root.position.z) < 0.1) {
          visitor.path.shift();
          waypoint = visitor.path[0];
        }
        desired.set((waypoint?.x ?? root.position.x) - root.position.x, 0, (waypoint?.z ?? root.position.z) - root.position.z);
        const distance = desired.length();
        if (!waypoint) {
          visitor.state = "look";
          visitor.timer = between(LOOK_TIME);
        } else {
          desired.divideScalar(distance);
          // Keep a little space from other visitors and more from the viewer.
          push.set(0, 0, 0);
          for (const other of visitors) {
            if (other === visitor) {
              continue;
            }
            offset.subVectors(root.position, other.root.position).setY(0);
            const gap = offset.length();
            if (gap > 0.001 && gap < PERSONAL_SPACE) {
              push.addScaledVector(offset, (PERSONAL_SPACE - gap) / (gap * PERSONAL_SPACE));
            }
          }
          offset.set(root.position.x - viewer.x, 0, root.position.z - viewer.z);
          const viewerGap = offset.length();
          if (viewerGap > 0.001 && viewerGap < VIEWER_SPACE) {
            push.addScaledVector(offset, (2 * (VIEWER_SPACE - viewerGap)) / (viewerGap * VIEWER_SPACE));
          }
          // Passing someone looking at a painting, go round behind them
          // rather than between them and it.
          if (clearView) {
            const rx = root.position.x - clearView.x;
            const rz = root.position.z - clearView.z;
            const out = rx * clearView.nx + rz * clearView.nz;
            const across = rx * -clearView.nz + rz * clearView.nx;
            if (Math.abs(across) < clearView.halfWidth + 0.9 && out > -0.2 && out < clearView.depth + 0.5) {
              push.x += clearView.nx * 3;
              push.z += clearView.nz * 3;
            }
          }
          desired.add(push).normalize();
          const step = Math.min(visitor.speed * dt, distance);
          root.position.addScaledVector(desired, step);
          const clear = walk.collide({ x: root.position.x, z: root.position.z }, BODY_RADIUS);
          root.position.x = clear.x;
          root.position.z = clear.z;
          visitor.heading += wrapAngle(Math.atan2(desired.x, desired.z) - visitor.heading) * Math.min(dt * 6, 1);
          moving = true;
        }
      }

      if (!moving) {
        visitor.heading += wrapAngle(visitor.faceHeading - visitor.heading) * Math.min(dt * 3, 1);
      }
      root.rotation.y = visitor.heading;
      // Someone passing within arm's reach of the camera would fill the
      // screen as a blur, so they step out of sight until they are by.
      root.visible = shown && Math.hypot(root.position.x - viewer.x, root.position.z - viewer.z) > NEAR_VIEWER;

      // Blend between the walk cycle and standing still.
      visitor.blend += ((moving ? 1 : 0) - visitor.blend) * Math.min(dt * 5, 1);
      visitor.phase += dt * visitor.speed * 5.2;
      const swing = Math.sin(visitor.phase) * 0.5 * visitor.blend;
      visitor.legs[0].rotation.x = swing;
      visitor.legs[1].rotation.x = -swing;
      visitor.arms[0].rotation.x = -swing * 0.75;
      visitor.arms[1].rotation.x = swing * 0.75;
      visitor.body.position.y = Math.abs(Math.cos(visitor.phase)) * 0.03 * visitor.blend;

      // Looking: a slow shift of weight and a slight tilt of the head.
      visitor.sway += dt * (reducedMotion ? 0 : 0.6);
      const still = 1 - visitor.blend;
      visitor.body.rotation.z = Math.sin(visitor.sway) * 0.02 * still;
      visitor.head.rotation.x = -0.12 * still;
      visitor.head.rotation.z = Math.sin(visitor.sway * 0.7) * 0.08 * still;
      visitor.head.rotation.y = Math.sin(visitor.sway * 0.45) * 0.15 * still;

      if (visitor.model && root.visible) {
        const { mixer, idle, walk: stride, walkSpeed } = visitor.model;
        stride.setEffectiveWeight(visitor.blend);
        idle.setEffectiveWeight(1 - visitor.blend);
        // Steps in time with how fast they actually move, so feet don't slide.
        stride.timeScale = visitor.speed / walkSpeed;
        visitor.pendingDt += reducedMotion ? 0 : dt;
        visitor.frame += 1;
        const far = Math.hypot(root.position.x - viewer.x, root.position.z - viewer.z) > FAR_VIEWER;
        if (!far || visitor.frame % 3 === 0) {
          mixer.update(visitor.pendingDt);
          visitor.pendingDt = 0;
        }
      }
    }
  }

  let shown = true;
  function setVisible(visible: boolean) {
    shown = visible;
    for (const visitor of visitors) {
      visitor.root.visible = visible;
    }
  }

  const helperObjects: THREE_NS.Object3D[] = [];
  helper?.root.traverse((object) => {
    if ((object instanceof THREE.Mesh && object.material !== shadowMaterial) || object instanceof THREE.Sprite) {
      helperObjects.push(object);
    }
  });

  return {
    update,
    setVisible,
    count,
    representativeMeshes: representative?.meshes ?? [],
    helperObjects,
    useStaffModels,
    useVisitorModels
  };
}

/** The helper's "Ask me" name tag: a dark pill with cream lettering. */
function makeTagTexture(THREE: Three): THREE_NS.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 90;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(29, 26, 23, 0.92)";
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 82, 41);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.font = '600 38px Inter, "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Ask me", 128, 47);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampAngle(angle: number, limit: number): number {
  const wrapped = wrapAngle(angle);
  return Math.min(Math.max(wrapped, -limit), limit);
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
