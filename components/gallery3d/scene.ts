/**
 * The Three.js side of the virtual gallery (app/gallery/walk).
 *
 * The floor is a grid of corridors around solid wall blocks (planned in
 * lib/galleryLayout.ts), with paintings on both sides of every corridor, each
 * lit by its own ceiling spotlight, and a reception with the custom-orders
 * desk at the far end. Everything here is plain imperative Three.js; the
 * React component only calls the returned GalleryApi.
 *
 * THREE is passed in rather than imported so the ~600 KB library is loaded
 * with a dynamic import() and stays out of every other page's bundle.
 */

import type * as THREE_NS from "three";
import {
  CORRIDOR_WIDTH,
  DESK_DEPTH,
  DESK_FROM_FAR_WALL,
  DESK_WIDTH,
  collide,
  pathLength,
  planGallery,
  route,
  type GalleryLayout,
  type Point,
  type WallSlot
} from "@/lib/galleryLayout";
import type { GalleryApi, GalleryCallbacks, GalleryInsets, GalleryPainting } from "./types";
import { loadVisitorModels, visitorModelBudget } from "./crowd";
import { loadStaffModels, shouldLoadStaffModels } from "./staff";
import { createVisitors, type ClearView } from "./visitors";

/** The three module, passed in so it can be loaded on demand. */
type Three = typeof THREE_NS;

/** What the camera frames for a selection, in world units. */
interface Subject {
  center: THREE_NS.Vector3;
  width: number;
  height: number;
  /** Points from the subject towards where the viewer stands. */
  normal: THREE_NS.Vector3;
  /** The camera yaw that faces the subject. */
  yaw: number;
  /** How far back the camera can stand before it meets the wall behind. */
  maxDistance: number;
}

/** A glide of the camera along a route through the corridors. */
interface Tween {
  from: THREE_NS.Vector3;
  /** The points to pass through; the last is where the camera stops. */
  path: THREE_NS.Vector3[];
  total: number;
  fromYaw: number;
  /** The yaw to end on; undefined keeps facing the way of travel. */
  toYaw: number | undefined;
  fromPitch: number;
  toPitch: number;
  /** Turns to face along each leg, for routes that go round corners. */
  follow: boolean;
  followYaw: number;
  elapsed: number;
  duration: number;
}


const HALL_HEIGHT = 5.2;
const EYE_HEIGHT = 1.65;
const HANG_HEIGHT = 1.9;
const MAX_WIDTH = 2.8;
const MAX_HEIGHT = 2.1;
const FRAME_BORDER = 0.08;
const WALK_SPEED = 3.2;
const LOOK_SPEED = 0.0042;
/** How close the camera may come to a wall. */
const WALL_MARGIN = 0.6;
/** How far out from its wall each painting's ceiling spotlight hangs. */
const SPOT_OUT = 1.5;

const DESK_HEIGHT = 1.05;

// components/BrandLogo.tsx shows the same file; its pixel size sets the aspect.
const LOGO_URL = "/brand/artasin-lockup.png";
const LOGO_WIDTH = 499;
const LOGO_HEIGHT = 132;

const WALL_COLOR = 0xf4f1ea;
const FRAME_COLOR = 0x1d1a17;

export function buildGallery(
  THREE: Three,
  mount: HTMLElement,
  paintings: readonly GalleryPainting[],
  { onSelect, onProgress, onMove, onHelper }: GalleryCallbacks
): GalleryApi {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  mount.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", "Interactive 3D gallery of paintings");
  canvas.setAttribute("role", "img");
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9e5dc);
  scene.fog = new THREE.Fog(0xe9e5dc, 18, 70);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);
  camera.rotation.order = "YXZ";

  const layout = planGallery(paintings.length);
  const { bounds } = layout;
  const floorWidth = bounds.maxX - bounds.minX;
  const floorDepth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  // ---------------------------------------------------------------- the room
  // A soft image of a lit room, reflected by every material: it gives frames,
  // the floor and the people their highlights, which flat lights alone can't.
  // Generated once on the GPU (no download); the plain lights carry the scene
  // until it is ready.
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x9c8a74, 0.85));
  scene.add(new THREE.AmbientLight(0xffffff, 0.1));
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.6);
  sun.position.set(2, 10, 4);
  scene.add(sun);
  let environment: THREE_NS.Texture | null = null;
  import("three/examples/jsm/environments/RoomEnvironment.js")
    .then(({ RoomEnvironment }) => {
      if (disposed) {
        return;
      }
      const pmrem = new THREE.PMREMGenerator(renderer);
      environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = environment;
      scene.environmentIntensity = 0.35;
    })
    .catch(() => {});

  const floorTexture = makePlankTexture(THREE);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(floorWidth / 3, floorDepth / 3);
  floorTexture.anisotropy = maxAnisotropy;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, floorDepth),
    // Polished enough to catch a soft sheen from the room, not a mirror.
    new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.45 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, centerZ);
  scene.add(floor);

  // Lit from below by the hemisphere's ground colour, a standard material reads
  // as murky grey; a little emissive keeps the ceiling gallery-white.
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, floorDepth),
    new THREE.MeshStandardMaterial({ color: 0xfbfaf7, emissive: 0xd9d5cc, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, HALL_HEIGHT, centerZ);
  scene.add(ceiling);

  // Walls block clicks on whatever is behind them (see pickAt).
  const occluders: THREE_NS.Object3D[] = [];
  const wallMaterial = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95 });
  const skirtMaterial = new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 0.7 });
  const outerWalls: { width: number; x: number; z: number; rotation: number }[] = [
    { width: floorDepth, x: bounds.minX, z: centerZ, rotation: Math.PI / 2 },
    { width: floorDepth, x: bounds.maxX, z: centerZ, rotation: -Math.PI / 2 },
    { width: floorWidth, x: centerX, z: bounds.minZ, rotation: 0 },
    { width: floorWidth, x: centerX, z: bounds.maxZ, rotation: Math.PI }
  ];
  for (const wall of outerWalls) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wall.width, HALL_HEIGHT), wallMaterial);
    mesh.rotation.y = wall.rotation;
    mesh.position.set(wall.x, HALL_HEIGHT / 2, wall.z);
    // Skirting boards ground the walls visually.
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(wall.width, 0.14, 0.04), skirtMaterial);
    skirt.rotation.y = wall.rotation;
    skirt.position.set(wall.x, 0.07, wall.z);
    scene.add(mesh, skirt);
    occluders.push(mesh);
  }
  // The blocks the corridors run between, floor to ceiling.
  for (const island of layout.islands) {
    const width = island.maxX - island.minX;
    const depth = island.maxZ - island.minZ;
    const x = (island.minX + island.maxX) / 2;
    const z = (island.minZ + island.maxZ) / 2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, HALL_HEIGHT, depth), wallMaterial);
    block.position.set(x, HALL_HEIGHT / 2, z);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.14, depth + 0.04), skirtMaterial);
    skirt.position.set(x, 0.07, z);
    scene.add(block, skirt);
    occluders.push(block);
  }

  addContactShadows(THREE, scene, layout);

  // A soft ceiling panel over every corridor crossing.
  const panelMaterial = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
  const panelGeometry = new THREE.PlaneGeometry(1.6, 1.6);
  for (const x of layout.xs) {
    for (const z of layout.zs) {
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(x, HALL_HEIGHT - 0.005, z);
      scene.add(panel);
    }
  }

  // The far wall of the reception carries the real ARTASIN lockup (the
  // brushstroke A and the wordmark, the same file as the nav logo), with a
  // line about the collection below, above the custom-orders desk.
  const logoWidth = 3.4;
  const logoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(logoWidth, logoWidth * (LOGO_HEIGHT / LOGO_WIDTH)),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
  );
  logoMesh.position.set(layout.desk.x, 3.2, bounds.minZ + 0.02);
  scene.add(logoMesh);
  new THREE.TextureLoader().load(LOGO_URL, (texture) => {
    if (disposed) {
      texture.dispose();
      return;
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    logoMesh.material.map = texture;
    logoMesh.material.opacity = 1;
    logoMesh.material.needsUpdate = true;
  });
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 0.3),
    new THREE.MeshBasicMaterial({ map: makeSignTexture(THREE, paintings.length), transparent: true, depthWrite: false })
  );
  signMesh.position.set(layout.desk.x, 2.52, bounds.minZ + 0.02);
  scene.add(signMesh);

  // -------------------------------------------------------------- paintings
  const glowTexture = makeGlowTexture(THREE);
  const frameGeometry = new THREE.BoxGeometry(1, 1, 0.06);
  const canvasGeometry = new THREE.PlaneGeometry(1, 1);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.45, metalness: 0.2 });
  const spot = makeSpotlightParts(THREE);
  const frameShadowMaterial = new THREE.MeshBasicMaterial({
    map: makeFrameShadowTexture(THREE),
    color: 0x1d1610,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });
  addLightPools(THREE, scene, layout.slots.slice(0, paintings.length), glowTexture);
  const pickables: THREE_NS.Object3D[] = [];
  const hung = paintings.map((painting, index) => {
    // planGallery makes a slot for every painting.
    const slot: WallSlot = layout.slots[index] ?? { x: 0, z: 0, nx: 0, nz: 1 };
    const group = new THREE.Group();
    group.position.set(slot.x + slot.nx * 0.01, HANG_HEIGHT, slot.z + slot.nz * 0.01);
    // The painting faces out along the wall's normal (planes face +Z).
    group.rotation.y = Math.atan2(slot.nx, slot.nz);

    const glow = new THREE.Mesh(
      canvasGeometry,
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xffe2b8,
        opacity: 0.55
      })
    );
    glow.position.set(0, 0.25, 0.005);

    // The frame's soft shadow on the wall, cast down by its spotlight.
    const shadow = new THREE.Mesh(canvasGeometry, frameShadowMaterial);
    shadow.position.z = 0.003;

    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = 0.03;

    const canvasMaterial = new THREE.MeshBasicMaterial({ color: 0xdcd8d0 });
    const art = new THREE.Mesh(canvasGeometry, canvasMaterial);
    art.position.z = 0.062;

    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.28),
      new THREE.MeshBasicMaterial({ map: makePlaqueTexture(THREE, painting) })
    );
    plaque.position.z = 0.012;

    frame.userData.index = index;
    art.userData.index = index;
    pickables.push(frame, art);
    group.add(shadow, glow, frame, art, plaque);
    scene.add(group);

    const beam = addSpotlight(THREE, scene, spot, slot);
    const item = { group, shadow, glow, frame, art, plaque, beam, width: 0, height: 0, normal: { x: slot.nx, z: slot.nz } };
    resize(item, 4 / 3);
    return item;
  });

  type HungPainting = (typeof hung)[number];

  function resize(item: HungPainting, aspect: number) {
    let width = MAX_WIDTH;
    let height = width / aspect;
    if (height > MAX_HEIGHT) {
      height = MAX_HEIGHT;
      width = height * aspect;
    }
    item.width = width;
    item.height = height;
    item.art.scale.set(width, height, 1);
    item.frame.scale.set(width + FRAME_BORDER * 2, height + FRAME_BORDER * 2, 1);
    // A little larger than the frame and lower, as the light comes from above.
    item.shadow.scale.set(width + FRAME_BORDER * 2 + 0.34, height + FRAME_BORDER * 2 + 0.34, 1);
    item.shadow.position.y = -0.09;
    const glowSize = Math.max(width, height) * 2.1;
    item.glow.scale.set(glowSize, glowSize, 1);
    item.plaque.position.x = width / 2 + FRAME_BORDER + 0.36;
    item.plaque.position.y = -height / 2 + 0.14;
    // The spotlight's beam widens to take in the whole painting.
    const spread = Math.max(width, height) * 0.62;
    item.beam.scale.x = spread;
    item.beam.scale.z = spread;
  }

  // ------------------------------------------------------- custom orders desk
  // In the reception at the far end, under the ARTASIN sign: a desk staffed by a
  // representative, which opens the custom-order (commission) request.
  const DESK_INDEX = hung.length;
  const desk = buildDesk(THREE, scene, layout.desk, glowTexture);
  for (const mesh of desk.meshes) {
    mesh.userData.index = DESK_INDEX;
    pickables.push(mesh);
  }

  const visitors = createVisitors(THREE, scene, {
    hung,
    reducedMotion,
    glowTexture,
    desk: { x: layout.desk.x + 0.35, z: layout.desk.z - 0.75 },
    // A few steps in from the entrance, a little to one side of the way in:
    // near enough the middle to be in view on a phone held upright.
    helper: { x: layout.start.x + 1.2, z: layout.start.z - 6 },
    walk: {
      route: (from, to) => route(layout, from, to),
      collide: (point, radius) => collide(layout, point, radius)
    }
  });

  for (const mesh of visitors.representativeMeshes) {
    mesh.userData.index = DESK_INDEX;
    pickables.push(mesh);
  }
  for (const object of visitors.helperObjects) {
    object.userData.helper = true;
    pickables.push(object);
  }

  // The staff's realistic models (~1.5 MB) come after the paintings, so they
  // never hold up the gallery, and the other visitors' avatars (up to
  // ~0.85 MB, less on small devices) after those; until then, or without
  // them, the simple figures stand in.
  let staffRequested = false;
  function requestStaffModels() {
    if (staffRequested || !shouldLoadStaffModels()) {
      return;
    }
    staffRequested = true;
    loadStaffModels(THREE)
      .then((models) => {
        if (!disposed) {
          visitors.useStaffModels(models);
        }
      })
      .catch(() => {})
      .then(() => (disposed || !visitors.count ? [] : loadVisitorModels(THREE, visitorModelBudget())))
      .then((models) => {
        if (!disposed) {
          visitors.useVisitorModels(models);
        }
      })
      .catch(() => {});
  }
  const staffTimer = window.setTimeout(requestStaffModels, 4000);

  let loaded = 0;
  let disposed = false;
  const textures: THREE_NS.Texture[] = [];
  hung.forEach((item, index) => {
    loadArtTexture(THREE, paintings[index]?.imageUrl ?? "/artisan/artwork-placeholder.svg")
      .catch(() => loadArtTexture(THREE, "/artisan/artwork-placeholder.svg"))
      .then(({ texture, aspect }) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.anisotropy = maxAnisotropy;
        textures.push(texture);
        item.art.material.map = texture;
        item.art.material.color.set(0xffffff);
        item.art.material.needsUpdate = true;
        resize(item, aspect);
        if (selectedIndex === index) {
          refit();
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded += 1;
        if (!disposed) {
          onProgress(loaded);
          if (loaded === hung.length) {
            requestStaffModels();
          }
        }
      });
  });

  // ---------------------------------------------------------------- controls
  const position = new THREE.Vector3(layout.start.x, EYE_HEIGHT, layout.start.z);
  let yaw = 0;
  let pitch = 0;
  let tween: Tween | null = null;
  let selectedIndex: number | null = null;
  let selectedAnchor: THREE_NS.Vector3 | null = null;
  let movedOnce = false;
  const keys = new Set();
  const pointer: { id: number | null; startX: number; startY: number; lastX: number; lastY: number; dragged: boolean } = {
    id: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragged: false
  };
  const hover = { x: 0, y: 0, dirty: false };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function noteMove() {
    tween = null;
    parked = false;
    if (!movedOnce) {
      movedOnce = true;
      onMove();
    }
  }

  // Glide to a point along the corridors, turning at the crossings (or, when
  // `instant`, be there straight away).
  function startTween(toPosition: THREE_NS.Vector3, toYaw?: number, toPitch?: number, instant = false) {
    const path = route(layout, flat(position), flat(toPosition)).map(
      (point) => new THREE.Vector3(point.x, EYE_HEIGHT, point.z)
    );
    const total = pathLength(flat(position), path);
    const duration = reducedMotion || instant ? 0 : clamp(total / 3.5, 0.6, 4.5);
    if (!duration) {
      position.copy(toPosition);
      yaw = toYaw ?? yaw;
      pitch = toPitch ?? pitch;
      tween = null;
      return;
    }
    const follow = path.length > 1;
    tween = {
      from: position.clone(),
      path,
      total,
      fromYaw: yaw,
      // Turn the short way round.
      toYaw: toYaw === undefined ? (follow ? undefined : yaw) : yaw + wrapAngle(toYaw - yaw),
      fromPitch: pitch,
      toPitch: toPitch ?? pitch,
      follow,
      followYaw: yaw,
      elapsed: 0,
      duration
    };
  }

  // Moves an in-progress glide's destination, e.g. when the framing changes.
  function retarget(active: Tween, target: THREE_NS.Vector3, faceYaw: number, facePitch: number) {
    active.path[active.path.length - 1] = target;
    active.total = pathLength(flat(active.from), active.path.map(flat));
    active.toYaw = active.fromYaw + wrapAngle(faceYaw - active.fromYaw);
    active.toPitch = facePitch;
  }

  // Where a glide is, a distance along its route.
  function along(active: Tween, distance: number, out: THREE_NS.Vector3): THREE_NS.Vector3 {
    let previous = active.from;
    for (const point of active.path) {
      const leg = previous.distanceTo(point);
      if (distance <= leg) {
        return out.lerpVectors(previous, point, leg ? distance / leg : 1);
      }
      distance -= leg;
      previous = point;
    }
    return out.copy(previous);
  }

  // Screen space the overlay UI covers, in CSS pixels, so a focused painting
  // is framed in the part of the view that is still clear (set by the React
  // component as its bars and card change size).
  let insets: GalleryInsets = { top: 0, bottom: 0 };
  // True while the camera sits where focus() put it; any look or step by the
  // visitor clears it, so re-framing never yanks the view back.
  let parked = false;

  // What the camera frames for a selection: a painting on its wall, or the
  // desk with its representative. normal points from the subject to the viewer.
  function subjectFor(index: number): Subject | null {
    if (index === DESK_INDEX) {
      // The desk, the representative and the ARTASIN sign above them.
      return {
        center: new THREE.Vector3(0, 1.85, desk.z - 0.3),
        width: 5,
        height: 3.7,
        normal: new THREE.Vector3(0, 0, 1),
        yaw: 0,
        // Back across the reception to the far side of the last corridor.
        maxDistance: (layout.zs[layout.rows] ?? 0) + CORRIDOR_WIDTH / 2 - WALL_MARGIN - (desk.z - 0.3)
      };
    }
    const item = hung[index];
    if (!item) {
      return null;
    }
    return {
      center: item.group.position,
      width: item.width + FRAME_BORDER * 2,
      height: item.height + FRAME_BORDER * 2,
      normal: new THREE.Vector3(item.normal.x, 0, item.normal.z),
      // Facing the wall: the camera looks along -normal, and at yaw 0 down -Z.
      yaw: Math.atan2(item.normal.x, item.normal.z),
      maxDistance: CORRIDOR_WIDTH - WALL_MARGIN
    };
  }

  function framing(subject: Subject) {
    const viewHeight = mount.clientHeight || 1;
    const clear = Math.max(viewHeight - insets.top - insets.bottom, viewHeight * 0.3);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanH = tanV * camera.aspect;
    // Back off until the subject fits the clear band with a margin, and the
    // full width too — on a phone held upright, usually the tighter one.
    const fitHeight = (subject.height * 1.12) / (2 * tanV * (clear / viewHeight));
    const fitWidth = (subject.width * 1.1) / (2 * tanH);
    const distance = clamp(Math.max(fitHeight, fitWidth), 2.2, subject.maxDistance);
    const target = subject.center.clone().addScaledVector(subject.normal, distance).setY(EYE_HEIGHT);
    // Tilt so the subject's centre lands in the middle of the clear band.
    const bandCentre = 1 - (2 * (insets.top + clear / 2)) / viewHeight;
    const facePitch = Math.atan2(subject.center.y - EYE_HEIGHT, distance) - Math.atan(bandCentre * tanV);
    return { target, faceYaw: subject.yaw, facePitch };
  }

  function focus(index: number, { instant = false }: { instant?: boolean } = {}) {
    const subject = subjectFor(index);
    if (!subject) {
      return;
    }
    const { target, faceYaw, facePitch } = framing(subject);
    startTween(target, faceYaw, facePitch, instant);
    selectedIndex = index;
    selectedAnchor = target;
    parked = true;
    onSelect(index);
  }

  // Re-frame the selection after the clear area or a painting's size changes.
  function refit() {
    if (selectedIndex === null || !parked) {
      return;
    }
    const subject = subjectFor(selectedIndex);
    if (!subject) {
      return;
    }
    const { target, faceYaw, facePitch } = framing(subject);
    selectedAnchor = target;
    if (tween) {
      retarget(tween, target, faceYaw, facePitch);
    } else {
      startTween(target, faceYaw, facePitch);
    }
  }

  function setInsets(next: GalleryInsets) {
    if (next.top === insets.top && next.bottom === insets.bottom) {
      return;
    }
    insets = next;
    refit();
  }

  // What is under the pointer: a painting or the desk (by index), a spot on
  // the floor, or nothing. Walls in the way hide whatever is behind them.
  const pickTargets: THREE_NS.Object3D[] = [...pickables, ...occluders, floor];
  function pickAt(
    clientX: number,
    clientY: number
  ): { index: number } | { helper: true } | { floor: THREE_NS.Vector3 } | null {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickTargets, false)[0];
    if (!hit) {
      return null;
    }
    const index: unknown = hit.object.userData.index;
    if (typeof index === "number") {
      return { index };
    }
    if (hit.object.userData.helper === true) {
      return { helper: true };
    }
    return hit.object === floor ? { floor: hit.point } : null;
  }

  function onPointerDown(event: PointerEvent) {
    if (pointer.id !== null) {
      return;
    }
    pointer.id = event.pointerId;
    pointer.startX = pointer.lastX = event.clientX;
    pointer.startY = pointer.lastY = event.clientY;
    pointer.dragged = false;
    canvas.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointer.id) {
      hover.x = event.clientX;
      hover.y = event.clientY;
      hover.dirty = true;
      return;
    }
    const dx = event.clientX - pointer.lastX;
    const dy = event.clientY - pointer.lastY;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    if (!pointer.dragged && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 6) {
      pointer.dragged = true;
      noteMove();
    }
    if (pointer.dragged) {
      yaw += dx * LOOK_SPEED;
      pitch = clamp(pitch + dy * LOOK_SPEED, -1.1, 1.1);
    }
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointer.id) {
      return;
    }
    pointer.id = null;
    if (pointer.dragged) {
      return;
    }
    const hit = pickAt(event.clientX, event.clientY);
    if (hit && "index" in hit) {
      focus(hit.index);
    } else if (hit && "helper" in hit) {
      onHelper();
    } else if (hit) {
      noteMove();
      const spot = collide(layout, flat(hit.floor), WALL_MARGIN);
      startTween(new THREE.Vector3(spot.x, EYE_HEIGHT, spot.z));
    }
  }

  function onPointerCancel(event: PointerEvent) {
    if (event.pointerId === pointer.id) {
      pointer.id = null;
    }
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    noteMove();
    const step = clamp(-event.deltaY * 0.01, -1.5, 1.5);
    position.x -= Math.sin(yaw) * step;
    position.z -= Math.cos(yaw) * step;
    keepClear(position);
  }

  const movementKeys = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"
  ]);

  function onKeyDown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey || !movementKeys.has(event.code)) {
      return;
    }
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) {
      return;
    }
    if (event.code.startsWith("Arrow")) {
      event.preventDefault();
    }
    keys.add(event.code);
  }

  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.code);
  }

  function onBlur() {
    keys.clear();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // The floor between the viewer and the painting they are looking at.
  function clearViewFor(index: number | null): ClearView | null {
    const item = index === null ? undefined : hung[index];
    if (!item || !selectedAnchor) {
      return null;
    }
    const { x: nx, z: nz } = item.normal;
    const depth = (selectedAnchor.x - item.group.position.x) * nx + (selectedAnchor.z - item.group.position.z) * nz;
    return { x: item.group.position.x, z: item.group.position.z, nx, nz, halfWidth: item.width / 2, depth };
  }

  // Out of the walls, the blocks and the desk.
  function keepClear(vector: THREE_NS.Vector3): THREE_NS.Vector3 {
    const clear = collide(layout, flat(vector), WALL_MARGIN);
    vector.x = clear.x;
    vector.z = clear.z;
    return vector;
  }

  // ------------------------------------------------------------------- loop
  const resizeObserver = new ResizeObserver(() => {
    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    refit();
  });
  resizeObserver.observe(mount);

  const clock = new THREE.Clock();
  const scratch = new THREE.Vector3();
  let frame = 0;
  let hovering = false;

  function tick() {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.1);

    const forward = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
    const strafe = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const turn = (keys.has("ArrowLeft") ? 1 : 0) - (keys.has("ArrowRight") ? 1 : 0);
    if (forward || strafe || turn) {
      noteMove();
      const speed = WALK_SPEED * (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 2 : 1) * dt;
      yaw += turn * 1.8 * dt;
      position.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed;
      position.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed;
      keepClear(position);
    }

    if (tween) {
      tween.elapsed += dt;
      const t = Math.min(tween.elapsed / tween.duration, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const before = scratch.copy(position);
      along(tween, eased * tween.total, position);
      if (tween.follow) {
        // Look the way of travel round the corners, then turn to the subject.
        const dx = position.x - before.x;
        const dz = position.z - before.z;
        if (Math.hypot(dx, dz) > 1e-4) {
          tween.followYaw += wrapAngle(Math.atan2(-dx, -dz) - tween.followYaw) * Math.min(dt * 5, 1);
        }
        const settle = tween.toYaw === undefined ? 0 : smoothstep(0.65, 1, t);
        yaw = tween.followYaw + wrapAngle((tween.toYaw ?? tween.followYaw) - tween.followYaw) * settle;
      } else {
        yaw = tween.fromYaw + ((tween.toYaw ?? tween.fromYaw) - tween.fromYaw) * eased;
      }
      pitch = tween.fromPitch + (tween.toPitch - tween.fromPitch) * eased;
      if (t >= 1) {
        yaw = tween.toYaw ?? yaw;
        pitch = tween.toPitch;
        tween = null;
      }
    }

    // Walking away from a painting closes its card.
    if (selectedIndex !== null && selectedAnchor && !tween && position.distanceTo(selectedAnchor) > 3) {
      selectedIndex = null;
      selectedAnchor = null;
      onSelect(null);
    }

    visitors.update(dt, position, selectedIndex, clearViewFor(selectedIndex));

    camera.position.copy(position);
    camera.rotation.set(pitch, yaw, 0);

    if (hover.dirty && pointer.id === null) {
      hover.dirty = false;
      const target = pickAt(hover.x, hover.y);
      const over = Boolean(target && ("index" in target || "helper" in target));
      if (over !== hovering) {
        hovering = over;
        canvas.style.cursor = over ? "pointer" : "";
      }
    }

    renderer.render(scene, camera);
  }
  tick();

  return {
    focus,
    setInsets,
    setVisitorsVisible: visitors.setVisible,
    dispose() {
      disposed = true;
      environment?.dispose();
      window.clearTimeout(staffTimer);
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      scene.traverse((object) => {
        // Every object here that owns a geometry or material is a Mesh.
        if (!(object instanceof THREE.Mesh)) {
          return;
        }
        object.geometry?.dispose();
        const materials: THREE_NS.Material[] = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          // Every texture it holds (map, normalMap...), not only the colour map.
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) {
              value.dispose();
            }
          }
          material?.dispose();
        }
      });
      for (const texture of textures) {
        texture.dispose();
      }
      renderer.dispose();
      canvas.remove();
    }
  };
}

function buildDesk(
  THREE: Three,
  scene: THREE_NS.Scene,
  { x, z }: Point,
  glowTexture: THREE_NS.Texture
): { z: number; meshes: THREE_NS.Mesh[] } {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const meshes: THREE_NS.Mesh[] = [];
  const add = <T extends THREE_NS.Mesh>(mesh: T): T => {
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  const base = add(
    new THREE.Mesh(
      new THREE.BoxGeometry(DESK_WIDTH, DESK_HEIGHT - 0.05, DESK_DEPTH),
      new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.6 })
    )
  );
  base.position.y = (DESK_HEIGHT - 0.05) / 2;

  const top = add(
    new THREE.Mesh(
      new THREE.BoxGeometry(DESK_WIDTH + 0.08, 0.05, DESK_DEPTH + 0.08),
      new THREE.MeshStandardMaterial({ color: 0xa0784f, roughness: 0.45 })
    )
  );
  top.position.y = DESK_HEIGHT - 0.025;

  const front = add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(DESK_WIDTH - 0.2, 0.62),
      new THREE.MeshBasicMaterial({ map: makeDeskTexture(THREE), transparent: true, depthWrite: false })
    )
  );
  front.position.set(0, 0.58, DESK_DEPTH / 2 + 0.003);

  // A few things on the desk: brochures, a card stand and a vase.
  const brochureMaterials = [0xf4f1ea, 0xa65a3f, 0xe9e2d3].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  const brochureGeometry = new THREE.BoxGeometry(0.3, 0.018, 0.22);
  brochureMaterials.forEach((material, index) => {
    const brochure = add(new THREE.Mesh(brochureGeometry, material));
    brochure.position.set(0.75 + index * 0.02, DESK_HEIGHT + 0.01 + index * 0.018, 0.12);
    brochure.rotation.y = 0.15 - index * 0.12;
  });
  const stand = add(
    new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.01), new THREE.MeshStandardMaterial({ color: 0xf4f1ea }))
  );
  stand.position.set(0.25, DESK_HEIGHT + 0.07, 0.2);
  stand.rotation.x = -0.25;
  const vase = add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.28, 18),
      new THREE.MeshStandardMaterial({ color: 0xe9e2d3, roughness: 0.3 })
    )
  );
  vase.position.set(-0.95, DESK_HEIGHT + 0.14, 0.05);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x5d6b4f, roughness: 0.8 });
  const bloomMaterial = new THREE.MeshStandardMaterial({ color: 0xa65a3f, roughness: 0.7 });
  [-0.3, 0, 0.32].forEach((lean, index) => {
    const stem = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 6), stemMaterial));
    stem.position.set(-0.95 + lean * 0.12, DESK_HEIGHT + 0.42, 0.05);
    stem.rotation.z = lean;
    const bloom = add(new THREE.Mesh(new THREE.SphereGeometry(0.035 + index * 0.006, 10, 8), bloomMaterial));
    bloom.position.set(-0.95 - Math.sin(lean) * 0.18 + lean * 0.12, DESK_HEIGHT + 0.6, 0.05);
  });

  // A pool of warm light on the end wall behind the desk.
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffe2b8,
      opacity: 0.5
    })
  );
  glow.position.set(0, 2.4, -DESK_FROM_FAR_WALL + 0.01);
  group.add(glow);

  scene.add(group);
  return { z, meshes };
}

function makeDeskTexture(THREE: Three): THREE_NS.CanvasTexture {
  const width = 1024;
  const height = 224;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = context2d(canvas);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4f1ea";
  ctx.font = '600 64px Inter, "Helvetica Neue", Arial, sans-serif';
  ctx.letterSpacing = "12px";
  ctx.fillText("CUSTOM ORDERS", width / 2, 104);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#c9b79c";
  ctx.font = 'italic 40px "Playfair Display", Georgia, serif';
  ctx.fillText("Commission an original piece", width / 2, 172);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The shared parts of every painting's ceiling spotlight. */
interface SpotlightParts {
  stem: THREE_NS.BufferGeometry;
  can: THREE_NS.BufferGeometry;
  lens: THREE_NS.BufferGeometry;
  beam: THREE_NS.BufferGeometry;
  body: THREE_NS.Material;
  glass: THREE_NS.Material;
  light: THREE_NS.Material;
}

function makeSpotlightParts(THREE: Three): SpotlightParts {
  return {
    stem: new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8),
    can: new THREE.CylinderGeometry(0.07, 0.085, 0.24, 18),
    lens: new THREE.CircleGeometry(0.075, 18),
    // A unit cone, apex up; each beam is scaled to its painting.
    beam: new THREE.ConeGeometry(1, 1, 28, 1, true),
    body: new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.4, metalness: 0.5 }),
    glass: new THREE.MeshBasicMaterial({ color: 0xfff1d6 }),
    light: new THREE.MeshBasicMaterial({
      color: 0xffe9c4,
      map: makeBeamTexture(THREE),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  };
}

/**
 * Hangs a track spotlight from the ceiling in front of a wall slot, aimed at
 * the painting, with a faint beam down to it. Returns the beam so its width
 * can follow the painting's size.
 */
function addSpotlight(THREE: Three, scene: THREE_NS.Scene, parts: SpotlightParts, slot: WallSlot): THREE_NS.Mesh {
  const mount = new THREE.Vector3(slot.x + slot.nx * SPOT_OUT, HALL_HEIGHT, slot.z + slot.nz * SPOT_OUT);
  const stem = new THREE.Mesh(parts.stem, parts.body);
  stem.position.set(mount.x, HALL_HEIGHT - 0.15, mount.z);

  const head = new THREE.Vector3(mount.x, HALL_HEIGHT - 0.34, mount.z);
  const aim = new THREE.Vector3(slot.x + slot.nx * 0.06, HANG_HEIGHT + 0.15, slot.z + slot.nz * 0.06);
  const direction = aim.clone().sub(head).normalize();
  // The can's axis is +Y, lens end first.
  const fixture = new THREE.Group();
  fixture.position.copy(head);
  fixture.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const can = new THREE.Mesh(parts.can, parts.body);
  const lens = new THREE.Mesh(parts.lens, parts.glass);
  lens.position.y = 0.121;
  lens.rotation.x = -Math.PI / 2;
  fixture.add(can, lens);

  // The beam runs from the lens to the wall: apex at the light, widening out.
  const lensPoint = head.clone().addScaledVector(direction, 0.12);
  const length = lensPoint.distanceTo(aim);
  const beam = new THREE.Mesh(parts.beam, parts.light);
  beam.position.copy(lensPoint).addScaledVector(direction, length / 2);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().negate());
  // y stretches the unit cone to the beam's length; resize() sets x and z.
  beam.scale.set(1, length, 1);
  scene.add(stem, fixture, beam);
  return beam;
}

/** A wall face: from `a` to `b` along the floor, with `n` pointing into the room. */
interface WallFace {
  a: Point;
  b: Point;
  n: Point;
}

/** Every wall face of the plan: the outer walls facing in, the blocks facing out. */
function wallFaces(layout: GalleryLayout): WallFace[] {
  const box = (r: GalleryLayout["bounds"], sign: 1 | -1): WallFace[] => [
    { a: { x: r.minX, z: r.minZ }, b: { x: r.minX, z: r.maxZ }, n: { x: sign, z: 0 } },
    { a: { x: r.maxX, z: r.minZ }, b: { x: r.maxX, z: r.maxZ }, n: { x: -sign, z: 0 } },
    { a: { x: r.minX, z: r.minZ }, b: { x: r.maxX, z: r.minZ }, n: { x: 0, z: sign } },
    { a: { x: r.minX, z: r.maxZ }, b: { x: r.maxX, z: r.maxZ }, n: { x: 0, z: -sign } }
  ];
  return [...box(layout.bounds, 1), ...layout.islands.flatMap((island) => box(island, -1))];
}

/**
 * Builds one mesh from many quads, each given as four corners in order
 * (along the near edge, then back along the far edge). The near edge gets
 * v = 0 and the far edge v = 1, so a fade texture runs across every quad.
 */
function quadsGeometry(THREE: Three, quads: readonly (readonly [THREE_NS.Vector3, THREE_NS.Vector3, THREE_NS.Vector3, THREE_NS.Vector3])[]) {
  const positions = new Float32Array(quads.length * 12);
  const uvs = new Float32Array(quads.length * 8);
  const indices: number[] = [];
  quads.forEach((corners, q) => {
    corners.forEach((corner, c) => positions.set([corner.x, corner.y, corner.z], q * 12 + c * 3));
    uvs.set([0, 0, 1, 0, 1, 1, 0, 1], q * 8);
    const o = q * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Soft shading where walls meet the floor and the ceiling, the way light
 * falls off into corners in a real room: a dark band on the floor along every
 * wall, and fainter ones up the foot and down the top of the wall. Drawn as
 * one mesh, so it costs a single draw however big the gallery grows.
 */
function addContactShadows(THREE: Three, scene: THREE_NS.Scene, layout: GalleryLayout): void {
  const quads: [THREE_NS.Vector3, THREE_NS.Vector3, THREE_NS.Vector3, THREE_NS.Vector3][] = [];
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  for (const { a, b, n } of wallFaces(layout)) {
    const floorBand = 0.75;
    const wallBand = 0.55;
    const ceilingBand = 0.9;
    const lift = 0.004;
    // Floor, from the wall out.
    quads.push([
      v(a.x + n.x * lift, lift, a.z + n.z * lift),
      v(b.x + n.x * lift, lift, b.z + n.z * lift),
      v(b.x + n.x * floorBand, lift, b.z + n.z * floorBand),
      v(a.x + n.x * floorBand, lift, a.z + n.z * floorBand)
    ]);
    // The foot of the wall, from the floor up.
    quads.push([
      v(a.x + n.x * lift, 0, a.z + n.z * lift),
      v(b.x + n.x * lift, 0, b.z + n.z * lift),
      v(b.x + n.x * lift, wallBand, b.z + n.z * lift),
      v(a.x + n.x * lift, wallBand, a.z + n.z * lift)
    ]);
    // The top of the wall, from the ceiling down.
    quads.push([
      v(a.x + n.x * lift, HALL_HEIGHT, a.z + n.z * lift),
      v(b.x + n.x * lift, HALL_HEIGHT, b.z + n.z * lift),
      v(b.x + n.x * lift, HALL_HEIGHT - ceilingBand, b.z + n.z * lift),
      v(a.x + n.x * lift, HALL_HEIGHT - ceilingBand, a.z + n.z * lift)
    ]);
  }
  const mesh = new THREE.Mesh(
    quadsGeometry(THREE, quads),
    new THREE.MeshBasicMaterial({
      map: makeFadeTexture(THREE),
      color: 0x2a2118,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1
    })
  );
  // Drawn after the walls and floor it darkens.
  mesh.renderOrder = 1;
  scene.add(mesh);
}

/** A warm pool of light on the floor below each painting's spotlight, all in one mesh. */
function addLightPools(THREE: Three, scene: THREE_NS.Scene, slots: readonly WallSlot[], glowTexture: THREE_NS.Texture): void {
  const size = 1.4;
  const quads = slots.map((slot) => {
    // Out from the wall, where the beam's spill reaches the floor.
    const cx = slot.x + slot.nx * 1.1;
    const cz = slot.z + slot.nz * 1.1;
    const y = 0.006;
    return [
      new THREE.Vector3(cx - size, y, cz - size),
      new THREE.Vector3(cx + size, y, cz - size),
      new THREE.Vector3(cx + size, y, cz + size),
      new THREE.Vector3(cx - size, y, cz + size)
    ] as const;
  });
  if (!quads.length) {
    return;
  }
  // Each quad's 0-1 UVs take in the whole radial glow.
  const mesh = new THREE.Mesh(
    quadsGeometry(THREE, quads),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: 0xffd9a8,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );
  mesh.renderOrder = 2;
  scene.add(mesh);
}

/** Dark at v = 0 fading to nothing at v = 1, eased so the edge never shows. */
function makeFadeTexture(THREE: Three): THREE_NS.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const ctx = context2d(canvas);
  // flipY puts the bottom of the canvas at v = 0.
  const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.15)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}

/** A soft-edged rectangle, scaled behind each frame as its shadow. */
function makeFrameShadowTexture(THREE: Three): THREE_NS.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = context2d(canvas);
  ctx.filter = "blur(9px)";
  ctx.fillStyle = "#fff";
  ctx.fillRect(18, 18, size - 36, size - 36);
  return new THREE.CanvasTexture(canvas);
}

/** Fades a beam from the lamp (the top of the cone) to nothing at the wall. */
function makeBeamTexture(THREE: Three): THREE_NS.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = context2d(canvas);
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}

function flat(vector: { x: number; z: number }): Point {
  return { x: vector.x, z: vector.z };
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Loads an artwork image as a texture and reports its aspect ratio. SVGs (the
 * bundled placeholders) carry only a viewBox, which browsers do not report as
 * a natural size, so they are rasterised onto a canvas at their viewBox ratio.
 */
async function loadArtTexture(THREE: Three, url: string): Promise<{ texture: THREE_NS.Texture; aspect: number }> {
  const isSvg = /\.svg(\?|$)/i.test(url);
  let aspect = 1;
  if (isSvg) {
    const text = await fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Image request failed: ${response.status}`);
      }
      return response.text();
    });
    const viewBox = text.match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    aspect = viewBox ? Number(viewBox[1]) / Number(viewBox[2]) : 1;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });

  let texture: THREE_NS.Texture;
  if (isSvg) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round(1024 / aspect);
    context2d(canvas).drawImage(image, 0, 0, canvas.width, canvas.height);
    texture = new THREE.CanvasTexture(canvas);
  } else {
    aspect = image.naturalWidth / image.naturalHeight || 1;
    texture = new THREE.Texture(image);
    texture.needsUpdate = true;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, aspect };
}

function makePlankTexture(THREE: Three): THREE_NS.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = context2d(canvas);
  const rows = 8;
  const rowHeight = size / rows;
  // A fixed seed keeps the floor identical on every visit.
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let row = 0; row < rows; row += 1) {
    let x = -random() * size * 0.5;
    while (x < size) {
      const length = size * (0.45 + random() * 0.5);
      const shade = 150 + Math.floor(random() * 40);
      ctx.fillStyle = `rgb(${shade + 30}, ${shade}, ${shade - 38})`;
      ctx.fillRect(x, row * rowHeight, length, rowHeight);
      for (let grain = 0; grain < 6; grain += 1) {
        ctx.fillStyle = `rgba(80, 55, 30, ${0.04 + random() * 0.05})`;
        ctx.fillRect(x, row * rowHeight + random() * rowHeight, length, 1 + random() * 2);
      }
      ctx.fillStyle = "rgba(60, 40, 20, 0.45)";
      ctx.fillRect(x, row * rowHeight, 2, rowHeight);
      x += length;
    }
    ctx.fillStyle = "rgba(60, 40, 20, 0.5)";
    ctx.fillRect(0, row * rowHeight, size, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeGlowTexture(THREE: Three): THREE_NS.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = context2d(canvas);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makePlaqueTexture(THREE: Three, painting: GalleryPainting): THREE_NS.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = context2d(canvas);
  ctx.fillStyle = "#fbfaf6";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d8d3c8";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.fillStyle = "#1a1c1c";
  ctx.font = '600 40px "Playfair Display", Georgia, serif';
  const titleLines = wrapText(ctx, painting.title, width - 64).slice(0, 2);
  titleLines.forEach((line, index) => ctx.fillText(line, 32, 68 + index * 46));

  const below = 68 + titleLines.length * 46;
  ctx.fillStyle = "#444748";
  ctx.font = '28px Inter, "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(fitText(ctx, [painting.artistName, painting.year].filter(Boolean).join(", "), width - 64), 32, below);
  ctx.fillStyle = "#1a1c1c";
  ctx.font = '600 28px Inter, "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(painting.price, 32, Math.min(below + 46, height - 28));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSignTexture(THREE: Three, count: number): THREE_NS.CanvasTexture {
  const width = 1024;
  const height = 64;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = context2d(canvas);
  ctx.textAlign = "center";
  ctx.fillStyle = "#444748";
  ctx.font = '600 30px Inter, "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(`THE COLLECTION · ${count} ${count === 1 ? "PAINTING" : "PAINTINGS"}`, width / 2, 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  if (lines.length > 2) {
    lines[1] = fitText(ctx, `${lines[1]} ${lines.slice(2).join(" ")}`, maxWidth);
  }
  return lines;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

/** The 2D context of a canvas; every browser that runs WebGL provides one. */
function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas is not available");
  }
  return ctx;
}
