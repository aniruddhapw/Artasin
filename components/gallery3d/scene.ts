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
  placeProps,
  type GalleryLayout,
  type Point,
  type WallSlot
} from "@/lib/galleryLayout";
import type { GalleryApi, GalleryCallbacks, GalleryInsets, GalleryLive, GalleryMap, GalleryPainting } from "./types";
import type { Wing } from "@/lib/galleryWings";
import { loadVisitorModels, visitorModelBudget } from "./crowd";
import { addBenches, addPlants } from "./props";
import { LIGHT_MAP_INTENSITY, floorLightmap, wallLightmap, wallPlane } from "./lighting";
import { HALL_HEIGHT, HANG_HEIGHT, SPOT_OUT, slotsOnFace, spotFor, wallFaces } from "@/lib/galleryLighting";
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


const EYE_HEIGHT = 1.65;
// The artwork itself; the mount and frame add to it, keeping the framed size
// close to what the wall slots were planned for.
const MAX_WIDTH = 2.5;
const MAX_HEIGHT = 1.85;
const FRAME_BORDER = 0.08;
/** The off-white mount between artwork and frame, as a share of its shorter side. */
const MOUNT_SHARE = 0.08;
const WALK_SPEED = 3.2;
const LOOK_SPEED = 0.0042;
/** How close the camera may come to a wall. */
const WALL_MARGIN = 0.6;

const DESK_HEIGHT = 1.05;
const HALF_CORRIDOR = CORRIDOR_WIDTH / 2;

// components/BrandLogo.tsx shows the same file; its pixel size sets the aspect.
const LOGO_URL = "/brand/artasin-lockup.png";
const LOGO_WIDTH = 499;
const LOGO_HEIGHT = 132;

// Warm cream walls and a warm room tone, after the redesign concept.
const WALL_COLOR = 0xf2eadc;
const ROOM_TONE = 0xebe2d3;
const FRAME_COLOR = 0x1d1a17;

export function buildGallery(
  THREE: Three,
  mount: HTMLElement,
  paintings: readonly GalleryPainting[],
  { onSelect, onProgress, onMove, onHelper }: GalleryCallbacks,
  wings: readonly Wing[] = []
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
  scene.background = new THREE.Color(ROOM_TONE);
  scene.fog = new THREE.Fog(ROOM_TONE, 18, 70);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);
  camera.rotation.order = "YXZ";

  const layout = planGallery(paintings.length);
  const { bounds } = layout;
  // Every painting's ceiling spotlight, for the baked light (lib/galleryLighting.ts).
  const litSlots = layout.slots.slice(0, paintings.length);
  const spots = litSlots.map(spotFor);
  const floorWidth = bounds.maxX - bounds.minX;
  const floorDepth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  // ---------------------------------------------------------------- the room
  // A soft image of a lit room, reflected by every material: it gives frames,
  // the floor and the people their highlights, which flat lights alone can't.
  // Generated once on the GPU (no download); the plain lights carry the scene
  // until it is ready.
  // Walls and floor carry their own baked light (lightmaps, below); these
  // lights are for everything else (people, plants, frames) and are kept
  // low so the spotlit paintings stand out.
  scene.add(new THREE.HemisphereLight(0xffefd6, 0x8f7356, 0.6));
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));
  const sun = new THREE.DirectionalLight(0xffe6c4, 0.4);
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
  // One texture covers 6 m of floor, so its repeat is hard to spot.
  floorTexture.repeat.set(floorWidth / 6, floorDepth / 6);
  floorTexture.anisotropy = maxAnisotropy;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, floorDepth),
    // Polished enough to catch a soft sheen from the room, not a mirror.
    new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.4,
      metalness: 0.05,
      envMapIntensity: 0.45,
      lightMap: floorLightmap(THREE, layout, spots),
      lightMapIntensity: LIGHT_MAP_INTENSITY
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, centerZ);
  scene.add(floor);

  // Lit from below by the hemisphere's ground colour, a standard material reads
  // as murky grey; a little emissive keeps the ceiling gallery-white.
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, floorDepth),
    new THREE.MeshStandardMaterial({ color: 0xfaf5ec, emissive: 0xdccfba, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, HALL_HEIGHT, centerZ);
  scene.add(ceiling);

  // Walls block clicks on whatever is behind them (see pickAt).
  const occluders: THREE_NS.Object3D[] = [];
  const skirtMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.55 });
  // Every wall face (the outer walls and the four sides of each block) is its
  // own plane, so each can carry the light its spotlights throw on it: the
  // bright scallop on each painting, softer between, darker at the corners.
  for (const face of wallFaces(layout)) {
    const plane = wallPlane(face);
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(plane.width, HALL_HEIGHT),
      // Lit only by its lightmap (no scene lights), so the contrast between
      // spotlit paintings and the wall between them is exactly as baked.
      new THREE.MeshBasicMaterial({
        color: WALL_COLOR,
        lightMap: wallLightmap(THREE, face, slotsOnFace(face, litSlots).map(spotFor)),
        lightMapIntensity: LIGHT_MAP_INTENSITY
      })
    );
    wall.rotation.y = plane.rotation;
    wall.position.set(plane.centre.x, HALL_HEIGHT / 2, plane.centre.z);
    // Skirting boards ground the walls visually.
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(plane.width, 0.14, 0.04), skirtMaterial);
    skirt.rotation.y = plane.rotation;
    skirt.position.set(plane.centre.x + face.n.x * 0.02, 0.07, plane.centre.z + face.n.z * 0.02);
    scene.add(wall, skirt);
    occluders.push(wall);
  }

  addTrackRails(THREE, scene, layout);

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
  // The mount sits in the spotlight's brightest light, which the room's low
  // general light doesn't give it.
  const mountMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 0.92, emissive: 0xb4a994 });
  const frameShadowMaterial = new THREE.MeshBasicMaterial({
    map: makeFrameShadowTexture(THREE),
    color: 0x1d1610,
    transparent: true,
    opacity: 0.55,
    depthWrite: false
  });
  const pickables: THREE_NS.Object3D[] = [];
  const hung = paintings.map((painting, index) => {
    // planGallery makes a slot for every painting.
    const slot: WallSlot = layout.slots[index] ?? { x: 0, z: 0, nx: 0, nz: 1 };
    const group = new THREE.Group();
    group.position.set(slot.x + slot.nx * 0.01, HANG_HEIGHT, slot.z + slot.nz * 0.01);
    // The painting faces out along the wall's normal (planes face +Z).
    group.rotation.y = Math.atan2(slot.nx, slot.nz);

    // The frame's soft shadow on the wall, cast down by its spotlight.
    const shadow = new THREE.Mesh(canvasGeometry, frameShadowMaterial);
    shadow.position.z = 0.003;

    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = 0.03;

    // The mount: an off-white border inside the frame, as a gallery would hang it.
    const mat = new THREE.Mesh(canvasGeometry, mountMaterial);
    mat.position.z = 0.061;

    const canvasMaterial = new THREE.MeshBasicMaterial({ color: 0xdcd8d0 });
    const art = new THREE.Mesh(canvasGeometry, canvasMaterial);
    art.position.z = 0.063;

    const plaque = makePlaque(THREE, painting, maxAnisotropy);

    frame.userData.index = index;
    mat.userData.index = index;
    art.userData.index = index;
    pickables.push(frame, mat, art);
    group.add(shadow, frame, mat, art, plaque);
    scene.add(group);

    const beam = addSpotlight(THREE, scene, spot, slot);
    const item = {
      group,
      shadow,
      frame,
      mat,
      art,
      plaque,
      beam,
      width: 0,
      height: 0,
      /** The whole framed work: artwork, mount and frame. */
      outerWidth: 0,
      outerHeight: 0,
      normal: { x: slot.nx, z: slot.nz }
    };
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
    const mount = clamp(Math.min(width, height) * MOUNT_SHARE, 0.08, 0.16);
    const outerWidth = width + (mount + FRAME_BORDER) * 2;
    const outerHeight = height + (mount + FRAME_BORDER) * 2;
    item.width = width;
    item.height = height;
    item.outerWidth = outerWidth;
    item.outerHeight = outerHeight;
    item.art.scale.set(width, height, 1);
    item.mat.scale.set(width + mount * 2, height + mount * 2, 1);
    item.frame.scale.set(outerWidth, outerHeight, 1);
    // A little larger than the frame and lower, as the light comes from above.
    item.shadow.scale.set(outerWidth + 0.34, outerHeight + 0.34, 1);
    item.shadow.position.y = -0.09;
    item.plaque.position.x = outerWidth / 2 + PLAQUE_WIDTH / 2 + 0.12;
    item.plaque.position.y = -outerHeight / 2 + PLAQUE_HEIGHT / 2;
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

  // Benches now; the plants (~150 KB) arrive with the people, after the
  // paintings. Both are already solid to collide() (lib/galleryLayout.ts).
  const furniture = placeProps(layout);
  addBenches(THREE, scene, furniture.benches, glowTexture);
  let plantsRequested = false;
  function requestPlants() {
    if (plantsRequested) {
      return;
    }
    plantsRequested = true;
    addPlants(THREE, scene, furniture.plants, glowTexture).catch(() => {});
  }
  // A sign hanging over the corridor where each wing begins.
  if (wings.length > 1) {
    addWingSigns(THREE, scene, layout, wings, maxAnisotropy);
  }
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
    requestPlants();
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
      width: item.outerWidth,
      height: item.outerHeight,
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
    return { x: item.group.position.x, z: item.group.position.z, nx, nz, halfWidth: item.outerWidth / 2, depth };
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

  // ---------------------------------------------------------------- mini-map
  const wingOfSlot = (index: number) => Math.max(wings.findIndex((wing) => index >= wing.start && index < wing.end), 0);
  const map: GalleryMap = {
    bounds: layout.bounds,
    islands: layout.islands,
    desk: { ...layout.desk, width: DESK_WIDTH, depth: DESK_DEPTH },
    entrance: { x: layout.start.x, z: layout.bounds.maxZ },
    paintings: hung.map((_, index) => {
      const slot = layout.slots[index] ?? { x: 0, z: 0, nx: 0, nz: 1 };
      return { ...slot, wing: wingOfSlot(index) };
    }),
    wings: wings.map((wing) => {
      // Name each wing in the corridor by its middle painting: always on the
      // floor, where an average of its places might land inside a block.
      const slot = layout.slots[Math.floor((wing.start + Math.min(wing.end, hung.length) - 1) / 2)];
      return {
        ...wing,
        label: slot ? { x: slot.x + slot.nx * HALF_CORRIDOR, z: slot.z + slot.nz * HALF_CORRIDOR } : layout.start
      };
    })
  };

  function live(): GalleryLive {
    const people = visitors.positions();
    return { viewer: { x: position.x, z: position.z, yaw }, visitors: people.visitors, helper: people.helper };
  }

  function walkTo(point: Point) {
    noteMove();
    const spot = collide(layout, point, WALL_MARGIN);
    startTween(new THREE.Vector3(spot.x, EYE_HEIGHT, spot.z));
  }

  return {
    focus,
    setInsets,
    walkTo,
    map,
    live,
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
      opacity: 0.08,
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

const WING_SIGN_WIDTH = 2.4;
const WING_SIGN_HEIGHT = 0.62;
const WING_SIGN_Y = 4.1;

/**
 * A sign over the middle of the corridor where each wing begins, hung from
 * the ceiling on two brass rods and facing both ways along the corridor, so
 * it reads from either end: the wing's name and how many paintings it has.
 */
function addWingSigns(
  THREE: Three,
  scene: THREE_NS.Scene,
  layout: GalleryLayout,
  wings: readonly Wing[],
  anisotropy: number
): void {
  const edge = new THREE.MeshStandardMaterial({ color: 0x9c7740, metalness: 0.6, roughness: 0.35 });
  const board = new THREE.BoxGeometry(WING_SIGN_WIDTH, WING_SIGN_HEIGHT, 0.04);
  const rodLength = HALL_HEIGHT - (WING_SIGN_Y + WING_SIGN_HEIGHT / 2);
  const rod = new THREE.CylinderGeometry(0.008, 0.008, rodLength, 6);
  for (const wing of wings) {
    const slot = layout.slots[wing.start];
    if (!slot) {
      continue;
    }
    const texture = makeWingSignTexture(THREE, wing);
    texture.anisotropy = anisotropy;
    const face = new THREE.MeshBasicMaterial({ map: texture });
    const group = new THREE.Group();
    group.position.set(slot.x + slot.nx * CORRIDOR_WIDTH / 2, WING_SIGN_Y, slot.z + slot.nz * CORRIDOR_WIDTH / 2);
    // Its faces look along the corridor: across the wall's normal.
    group.rotation.y = Math.atan2(-slot.nz, slot.nx);
    // A box's faces: +x, -x, +y, -y, +z and -z, each reading the right way round from outside.
    group.add(new THREE.Mesh(board, [edge, edge, edge, edge, face, face]));
    for (const side of [-1, 1]) {
      const hanger = new THREE.Mesh(rod, edge);
      hanger.position.set(side * WING_SIGN_WIDTH * 0.36, WING_SIGN_HEIGHT / 2 + rodLength / 2, 0);
      group.add(hanger);
    }
    scene.add(group);
  }
}

function makeWingSignTexture(THREE: Three, wing: Wing): THREE_NS.CanvasTexture {
  const width = 1024;
  const height = Math.round((width * WING_SIGN_HEIGHT) / WING_SIGN_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const count = wing.end - wing.start;
  // Drawn again once the web fonts have loaded, as the plaques are.
  const draw = () => {
    const ctx = context2d(canvas);
    ctx.fillStyle = "#26211c";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(201, 164, 106, 0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.textAlign = "center";
    ctx.fillStyle = "#c9a46a";
    ctx.font = '600 26px Inter, "Helvetica Neue", Arial, sans-serif';
    ctx.letterSpacing = "6px";
    ctx.fillText(`${count} ${count === 1 ? "PAINTING" : "PAINTINGS"}`, width / 2, 84);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#f4ede0";
    ctx.font = '400 92px "Playfair Display", Georgia, serif';
    ctx.fillText(fitText(ctx, wing.name, width - 120), width / 2, 196);
    texture.needsUpdate = true;
  };
  draw();
  void document.fonts?.ready.then(draw);
  return texture;
}

/**
 * Black ceiling tracks the spotlights hang from: one along each wall that has
 * paintings, SPOT_OUT out from it, as in a real gallery. All of them are one
 * merged mesh, so they cost a single draw.
 */
function addTrackRails(THREE: Three, scene: THREE_NS.Scene, layout: GalleryLayout): void {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const place = new THREE.Matrix4();
  const turn = new THREE.Matrix3();
  for (const face of wallFaces(layout)) {
    if (!slotsOnFace(face, layout.slots).length) {
      continue;
    }
    const length = Math.hypot(face.b.x - face.a.x, face.b.z - face.a.z);
    const rail = new THREE.BoxGeometry(length, 0.03, 0.04);
    place.compose(
      new THREE.Vector3(
        (face.a.x + face.b.x) / 2 + face.n.x * SPOT_OUT,
        HALL_HEIGHT - 0.02,
        (face.a.z + face.b.z) / 2 + face.n.z * SPOT_OUT
      ),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(face.n.x, face.n.z)),
      new THREE.Vector3(1, 1, 1)
    );
    turn.getNormalMatrix(place);
    const offset = positions.length / 3;
    const position = rail.getAttribute("position");
    const normal = rail.getAttribute("normal");
    const point = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      point.fromBufferAttribute(position, i).applyMatrix4(place);
      positions.push(point.x, point.y, point.z);
      point.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize();
      normals.push(point.x, point.y, point.z);
    }
    const index = rail.getIndex();
    for (let i = 0; index && i < index.count; i += 1) {
      indices.push(index.getX(i) + offset);
    }
    rail.dispose();
  }
  if (!indices.length) {
    return;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.5, metalness: 0.3 })));
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

/**
 * The floor: honey-oak planks, 16 rows over 6 m of floor, each plank 1.2–2.7 m
 * long and a slightly different tone, with fine grain. Big enough that the
 * repeat is hard to spot. A fixed seed keeps the floor the same on every visit.
 */
function makePlankTexture(THREE: Three): THREE_NS.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = context2d(canvas);
  const rows = 16;
  const rowHeight = size / rows;
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Draws a rectangle, and again a texture-width to the left: a plank running
  // off the right edge carries on from the left, so the repeat has no seam.
  const fillWrapped = (x: number, y: number, w: number, h: number) => {
    ctx.fillRect(x, y, w, h);
    if (x + w > size) {
      ctx.fillRect(x - size, y, w, h);
    }
  };
  for (let row = 0; row < rows; row += 1) {
    // Each row starts at its own point, and its planks cover exactly one
    // texture width, the last one shortened to meet the first.
    const start = random() * size;
    let x = start;
    while (x < start + size) {
      const length = Math.min(size * (0.2 + random() * 0.25), start + size - x);
      const shade = 132 + Math.floor(random() * 44);
      ctx.fillStyle = `rgb(${shade + 42}, ${shade + 4}, ${shade - 52})`;
      fillWrapped(x % size, row * rowHeight, length, rowHeight);
      for (let grain = 0; grain < 7; grain += 1) {
        ctx.fillStyle = `rgba(80, 52, 26, ${0.035 + random() * 0.05})`;
        fillWrapped(x % size, row * rowHeight + random() * rowHeight, length, 1 + random() * 2);
      }
      ctx.fillStyle = "rgba(60, 40, 20, 0.45)";
      fillWrapped(x % size, row * rowHeight, 2, rowHeight);
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

// Large enough to read from a couple of metres, as gallery labels are.
const PLAQUE_WIDTH = 0.62;
const PLAQUE_HEIGHT = 0.385;

/**
 * The wall label beside a painting: a thin brushed-brass plate with the
 * title, artist, medium, size and price engraved on it. Slightly metallic, so
 * it catches the room's reflection like the real thing.
 */
function makePlaque(THREE: Three, painting: GalleryPainting, anisotropy: number): THREE_NS.Mesh {
  const texture = makePlaqueTexture(THREE, painting);
  texture.anisotropy = anisotropy;
  const face = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.35, roughness: 0.42 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x9c7740, metalness: 0.6, roughness: 0.35 });
  // A box's faces: +x, -x, +y, -y, +z (the front), -z.
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(PLAQUE_WIDTH, PLAQUE_HEIGHT, 0.012), [edge, edge, edge, edge, face, edge]);
  plaque.position.z = 0.008;
  return plaque;
}

function makePlaqueTexture(THREE: Three, painting: GalleryPainting): THREE_NS.CanvasTexture {
  const width = 512;
  const height = Math.round((width * PLAQUE_HEIGHT) / PLAQUE_WIDTH);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Drawn again once the web fonts have loaded, so labels never keep a fallback face.
  const draw = () => {
    const ctx = context2d(canvas);

    // Brushed brass: a warm gradient with fine horizontal streaks.
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#b48d55");
    gradient.addColorStop(0.45, "#dcc08a");
    gradient.addColorStop(1, "#a9814b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    let seed = painting.title.length * 131 + 17;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let line = 0; line < 140; line += 1) {
      ctx.fillStyle = random() < 0.5 ? `rgba(255, 244, 214, ${0.05 + random() * 0.08})` : `rgba(90, 62, 26, ${0.04 + random() * 0.06})`;
      ctx.fillRect(0, random() * height, width, 1);
    }
    ctx.strokeStyle = "rgba(84, 58, 24, 0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Engraved lettering: dark, with a thin light edge below like a cut.
    const engrave = (text: string, x: number, y: number) => {
      ctx.fillStyle = "rgba(255, 240, 205, 0.55)";
      ctx.fillText(text, x, y + 1.5);
      ctx.fillStyle = "#2c1d0d";
      ctx.fillText(text, x, y);
    };
    const left = 30;
    const inner = width - left * 2;
    ctx.font = '600 38px "Playfair Display", Georgia, serif';
    const titleLines = wrapText(ctx, painting.title, inner).slice(0, 2);
    titleLines.forEach((line, index) => engrave(line, left, 62 + index * 42));
    let y = 62 + titleLines.length * 42;
    ctx.font = 'italic 26px "Playfair Display", Georgia, serif';
    engrave(fitText(ctx, [painting.artistName, painting.year].filter(Boolean).join(", "), inner), left, y);
    y += 34;
    ctx.font = '24px Inter, "Helvetica Neue", Arial, sans-serif';
    for (const detail of [painting.medium, painting.dimensions].filter(Boolean)) {
      if (y > height - 60) {
        break;
      }
      engrave(fitText(ctx, detail, inner), left, y);
      y += 30;
    }
    ctx.font = '600 28px Inter, "Helvetica Neue", Arial, sans-serif';
    engrave(painting.price, left, Math.min(y + 8, height - 26));
    texture.needsUpdate = true;
  };
  draw();
  void document.fonts?.ready.then(draw);
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
