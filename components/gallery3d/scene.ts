/**
 * The Three.js side of the virtual gallery (app/gallery/walk).
 *
 * Paintings hang down both walls of a long hall, alternating left and right so
 * that "next" always moves a few steps further in. The hall's length follows
 * the number of paintings. Everything here is plain imperative Three.js; the
 * React component only calls the returned { focus, dispose }.
 *
 * THREE is passed in rather than imported so the ~600 KB library is loaded
 * with a dynamic import() and stays out of every other page's bundle.
 */

import type * as THREE_NS from "three";
import type { GalleryApi, GalleryCallbacks, GalleryInsets, GalleryPainting } from "./types";
import { createVisitors } from "./visitors";

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
}


const HALL_WIDTH = 12;
const HALL_HEIGHT = 5.2;
// Distance between neighbouring paintings on the same wall.
const WALL_SPACING = 5;
const EYE_HEIGHT = 1.65;
const HANG_HEIGHT = 1.9;
const MAX_WIDTH = 2.8;
const MAX_HEIGHT = 2.1;
const FRAME_BORDER = 0.08;
const WALK_SPEED = 3.2;
const LOOK_SPEED = 0.0042;
const ENTRANCE_Z = 4;
const WALL_MARGIN = 0.8;

const DESK_WIDTH = 2.8;
const DESK_DEPTH = 0.75;
const DESK_HEIGHT = 1.05;
const DESK_FROM_END_WALL = 2.2;

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
  { onSelect, onProgress, onMove }: GalleryCallbacks
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

  const lastZ = -(2 + Math.max(paintings.length - 1, 0) * (WALL_SPACING / 2));
  // Room past the last painting for the custom-orders desk.
  const endZ = lastZ - 6;
  const hallLength = ENTRANCE_Z - endZ;
  const centerZ = (ENTRANCE_Z + endZ) / 2;

  // ---------------------------------------------------------------- the room
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x9c8a74, 1.6));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xfff4e0, 0.9);
  sun.position.set(2, 10, 4);
  scene.add(sun);

  const floorTexture = makePlankTexture(THREE);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(HALL_WIDTH / 3, hallLength / 3);
  floorTexture.anisotropy = maxAnisotropy;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL_WIDTH, hallLength),
    new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.55, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  scene.add(floor);

  // Lit from below by the hemisphere's ground colour, a standard material reads
  // as murky grey; a little emissive keeps the ceiling gallery-white.
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL_WIDTH, hallLength),
    new THREE.MeshStandardMaterial({ color: 0xfbfaf7, emissive: 0xd9d5cc, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, HALL_HEIGHT, centerZ);
  scene.add(ceiling);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95 });
  const sideGeometry = new THREE.PlaneGeometry(hallLength, HALL_HEIGHT);
  const leftWall = new THREE.Mesh(sideGeometry, wallMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-HALL_WIDTH / 2, HALL_HEIGHT / 2, centerZ);
  const rightWall = new THREE.Mesh(sideGeometry, wallMaterial);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(HALL_WIDTH / 2, HALL_HEIGHT / 2, centerZ);
  const endGeometry = new THREE.PlaneGeometry(HALL_WIDTH, HALL_HEIGHT);
  const endWall = new THREE.Mesh(endGeometry, wallMaterial);
  endWall.position.set(0, HALL_HEIGHT / 2, endZ);
  const entranceWall = new THREE.Mesh(endGeometry, wallMaterial);
  entranceWall.rotation.y = Math.PI;
  entranceWall.position.set(0, HALL_HEIGHT / 2, ENTRANCE_Z);
  scene.add(leftWall, rightWall, endWall, entranceWall);

  // Skirting boards ground the walls visually.
  const skirtMaterial = new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 0.7 });
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, hallLength), skirtMaterial);
    skirt.position.set(side * (HALL_WIDTH / 2 - 0.02), 0.07, centerZ);
    scene.add(skirt);
  }

  // Ceiling light strips, which also read as the hall's direction of travel.
  const stripMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of [-2.4, 2.4]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, hallLength - 1.5), stripMaterial);
    strip.position.set(x, HALL_HEIGHT - 0.03, centerZ);
    scene.add(strip);
  }

  // The end wall carries the real ARTASIN lockup (the brushstroke A and the
  // wordmark, the same file as the nav logo), with a line about the room below.
  const logoWidth = 3.4;
  const logoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(logoWidth, logoWidth * (LOGO_HEIGHT / LOGO_WIDTH)),
    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
  );
  logoMesh.position.set(0, 3.2, endZ + 0.02);
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
  signMesh.position.set(0, 2.52, endZ + 0.02);
  scene.add(signMesh);

  // -------------------------------------------------------------- paintings
  const glowTexture = makeGlowTexture(THREE);
  const frameGeometry = new THREE.BoxGeometry(1, 1, 0.06);
  const canvasGeometry = new THREE.PlaneGeometry(1, 1);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.45, metalness: 0.2 });
  const pickables: THREE_NS.Object3D[] = [];
  const hung = paintings.map((painting, index) => {
    const left = index % 2 === 0;
    const z = -(2 + index * (WALL_SPACING / 2));
    const group = new THREE.Group();
    group.position.set(left ? -HALL_WIDTH / 2 + 0.01 : HALL_WIDTH / 2 - 0.01, HANG_HEIGHT, z);
    group.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;

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
    group.add(glow, frame, art, plaque);
    scene.add(group);

    const item = { group, glow, frame, art, plaque, width: 0, height: 0, normalX: left ? 1 : -1 };
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
    const glowSize = Math.max(width, height) * 2.1;
    item.glow.scale.set(glowSize, glowSize, 1);
    item.plaque.position.x = width / 2 + FRAME_BORDER + 0.42;
    item.plaque.position.y = -height / 2 + 0.14;
  }

  // ------------------------------------------------------- custom orders desk
  // At the far end of the hall, under the ARTASIN sign: a desk staffed by a
  // representative, which opens the custom-order (commission) request.
  const DESK_INDEX = hung.length;
  const desk = buildDesk(THREE, scene, endZ + DESK_FROM_END_WALL, glowTexture);
  for (const mesh of desk.meshes) {
    mesh.userData.index = DESK_INDEX;
    pickables.push(mesh);
  }

  const visitors = createVisitors(THREE, scene, {
    hung,
    reducedMotion,
    glowTexture,
    desk: { x: 0.35, z: desk.z - 0.75 },
    bounds: {
      minX: -HALL_WIDTH / 2 + 1.2,
      maxX: HALL_WIDTH / 2 - 1.2,
      minZ: desk.z + DESK_DEPTH / 2 + 0.9,
      maxZ: ENTRANCE_Z - 1.5
    }
  });

  for (const mesh of visitors.representativeMeshes) {
    mesh.userData.index = DESK_INDEX;
    pickables.push(mesh);
  }

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
        }
      });
  });

  // ---------------------------------------------------------------- controls
  const position = new THREE.Vector3(0, EYE_HEIGHT, ENTRANCE_Z - 1.2);
  let yaw = 0;
  let pitch = 0;
  let tween: {
    fromPosition: THREE_NS.Vector3;
    toPosition: THREE_NS.Vector3;
    fromYaw: number;
    toYaw: number;
    fromPitch: number;
    toPitch: number;
    elapsed: number;
    duration: number;
  } | null = null;
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

  function startTween(toPosition: THREE_NS.Vector3, toYaw?: number, toPitch?: number) {
    const distance = position.distanceTo(toPosition);
    const duration = reducedMotion ? 0 : Math.min(Math.max(distance / 4, 0.6), 2.2);
    if (!duration) {
      position.copy(toPosition);
      yaw = toYaw ?? yaw;
      pitch = toPitch ?? pitch;
      tween = null;
      return;
    }
    tween = {
      fromPosition: position.clone(),
      toPosition,
      fromYaw: yaw,
      // Turn the short way round.
      toYaw: toYaw === undefined ? yaw : yaw + wrapAngle(toYaw - yaw),
      fromPitch: pitch,
      toPitch: toPitch ?? pitch,
      elapsed: 0,
      duration
    };
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
        yaw: 0
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
      normal: new THREE.Vector3(item.normalX, 0, 0),
      // Facing the wall: the camera looks down -Z at yaw 0, so +X wall is -PI/2.
      yaw: item.normalX > 0 ? Math.PI / 2 : -Math.PI / 2
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
    const distance = clamp(Math.max(fitHeight, fitWidth), 2.2, HALL_WIDTH - WALL_MARGIN * 2);
    const target = subject.center.clone().addScaledVector(subject.normal, distance).setY(EYE_HEIGHT);
    // Tilt so the subject's centre lands in the middle of the clear band.
    const bandCentre = 1 - (2 * (insets.top + clear / 2)) / viewHeight;
    const facePitch = Math.atan2(subject.center.y - EYE_HEIGHT, distance) - Math.atan(bandCentre * tanV);
    return { target, faceYaw: subject.yaw, facePitch };
  }

  function focus(index: number) {
    const subject = subjectFor(index);
    if (!subject) {
      return;
    }
    const { target, faceYaw, facePitch } = framing(subject);
    startTween(target, faceYaw, facePitch);
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
      tween.toPosition = target;
      tween.toYaw = tween.fromYaw + wrapAngle(faceYaw - tween.fromYaw);
      tween.toPitch = facePitch;
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

  function pick(clientX: number, clientY: number, objects: THREE_NS.Object3D[]): THREE_NS.Intersection | null {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(objects, false)[0] || null;
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
    const hit = pick(event.clientX, event.clientY, pickables);
    if (hit) {
      focus(hit.object.userData.index);
      return;
    }
    const ground = pick(event.clientX, event.clientY, [floor]);
    if (ground) {
      noteMove();
      startTween(clampToHall(new THREE.Vector3(ground.point.x, EYE_HEIGHT, ground.point.z)));
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
    clampToHall(position);
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

  function clampToHall(vector: THREE_NS.Vector3): THREE_NS.Vector3 {
    vector.x = clamp(vector.x, -HALL_WIDTH / 2 + WALL_MARGIN, HALL_WIDTH / 2 - WALL_MARGIN);
    vector.z = clamp(vector.z, endZ + WALL_MARGIN, ENTRANCE_Z - WALL_MARGIN);
    // The desk and the space behind it are off limits: step out of them by
    // the shortest way, to either side or back in front.
    const halfWidth = DESK_WIDTH / 2 + 0.5;
    const front = desk.z + DESK_DEPTH / 2 + 0.9;
    if (Math.abs(vector.x) < halfWidth && vector.z < front) {
      const toSide = halfWidth - Math.abs(vector.x);
      const toFront = front - vector.z;
      if (toFront < toSide) {
        vector.z = front;
      } else {
        vector.x = Math.sign(vector.x || 1) * halfWidth;
      }
    }
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
      clampToHall(position);
    }

    if (tween) {
      tween.elapsed += dt;
      const t = Math.min(tween.elapsed / tween.duration, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      position.lerpVectors(tween.fromPosition, tween.toPosition, eased);
      yaw = tween.fromYaw + (tween.toYaw - tween.fromYaw) * eased;
      pitch = tween.fromPitch + (tween.toPitch - tween.fromPitch) * eased;
      if (t >= 1) {
        tween = null;
      }
    }

    // Walking away from a painting closes its card.
    if (selectedIndex !== null && selectedAnchor && !tween && position.distanceTo(selectedAnchor) > 3) {
      selectedIndex = null;
      selectedAnchor = null;
      onSelect(null);
    }

    visitors.update(dt, position, selectedIndex);

    camera.position.copy(position);
    camera.rotation.set(pitch, yaw, 0);

    if (hover.dirty && pointer.id === null) {
      hover.dirty = false;
      const over = Boolean(pick(hover.x, hover.y, pickables));
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
          if ("map" in material && material.map instanceof THREE.Texture) {
            material.map.dispose();
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
  z: number,
  glowTexture: THREE_NS.Texture
): { z: number; meshes: THREE_NS.Mesh[] } {
  const group = new THREE.Group();
  group.position.set(0, 0, z);
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
  glow.position.set(0, 2.4, -DESK_FROM_END_WALL + 0.01);
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
