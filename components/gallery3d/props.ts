/**
 * Furniture for the 3D gallery: walnut benches in the reception and potted
 * plants at the corners where corridors cross. Where they stand comes from
 * placeProps() in lib/galleryLayout.ts, which also makes them solid.
 *
 * The benches are built in code. The plant is Poly Haven's "Potted Plant 02"
 * (CC0; see public/gallery3d/props/LICENSE.md), simplified to ~5.5k
 * triangles and 147 KB, and drawn as instances: every plant in the gallery
 * costs one draw call per part, however many there are.
 */

import type * as THREE_NS from "three";
import { BENCH_DEPTH, BENCH_LENGTH, type Bench } from "@/lib/galleryLayout";
import type { Point } from "@/lib/galleryLayout";

type Three = typeof THREE_NS;

const PLANT_URL = "/gallery3d/props/plant.glb";
const SEAT_HEIGHT = 0.44;
const SEAT_THICKNESS = 0.08;

/** A walnut bench on two solid legs, with a soft shadow on the floor. */
export function addBenches(THREE: Three, scene: THREE_NS.Scene, benches: readonly Bench[], glowTexture: THREE_NS.Texture): void {
  if (!benches.length) {
    return;
  }
  const walnut = new THREE.MeshStandardMaterial({ map: makeWalnutTexture(THREE), roughness: 0.45, metalness: 0 });
  const seat = new THREE.BoxGeometry(BENCH_LENGTH, SEAT_THICKNESS, BENCH_DEPTH);
  const leg = new THREE.BoxGeometry(0.09, SEAT_HEIGHT - SEAT_THICKNESS / 2, BENCH_DEPTH - 0.06);
  const shadow = new THREE.MeshBasicMaterial({ map: glowTexture, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });
  const shadowGeometry = new THREE.PlaneGeometry(BENCH_LENGTH + 0.7, BENCH_DEPTH + 0.7);
  for (const bench of benches) {
    const group = new THREE.Group();
    group.position.set(bench.x, 0, bench.z);
    group.rotation.y = bench.rotation;
    const top = new THREE.Mesh(seat, walnut);
    top.position.y = SEAT_HEIGHT;
    group.add(top);
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(leg, walnut);
      support.position.set(side * (BENCH_LENGTH / 2 - 0.16), (SEAT_HEIGHT - SEAT_THICKNESS / 2) / 2, 0);
      group.add(support);
    }
    const contact = new THREE.Mesh(shadowGeometry, shadow);
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.004;
    group.add(contact);
    scene.add(group);
  }
}

/**
 * Loads the plant and stands one at every spot, each turned and sized a
 * little differently so they don't look stamped out. Resolves when they are
 * in the scene; rejects (and leaves the floor bare) if the model can't load.
 */
export async function addPlants(
  THREE: Three,
  scene: THREE_NS.Scene,
  spots: readonly Point[],
  glowTexture: THREE_NS.Texture
): Promise<void> {
  if (!spots.length) {
    return;
  }
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js")
  ]);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(PLANT_URL);
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  // Stand the pot on the floor, centred on its spot.
  const box = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  const toOrigin = new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z);

  // A fixed seed keeps every visit's plants the same.
  let seed = 4242;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const placements = spots.map((spot) => {
    const scale = 0.95 + random() * 0.15;
    return new THREE.Matrix4().compose(
      new THREE.Vector3(spot.x, 0, spot.z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2),
      new THREE.Vector3(scale, scale, scale)
    );
  });

  const instance = new THREE.Matrix4();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }
    const part = new THREE.Matrix4().multiplyMatrices(toOrigin, object.matrixWorld);
    const mesh = new THREE.InstancedMesh(object.geometry, object.material, placements.length);
    placements.forEach((placement, index) => {
      mesh.setMatrixAt(index, instance.multiplyMatrices(placement, part));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  });

  // A soft shadow under every pot, so the plants sit on the floor rather
  // than float above it. One instanced mesh for all of them.
  const shadows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: glowTexture, color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false }),
    placements.length
  );
  placements.forEach((placement, index) => {
    shadows.setMatrixAt(index, instance.multiplyMatrices(placement, new THREE.Matrix4().makeTranslation(0, 0.005, 0)));
  });
  shadows.instanceMatrix.needsUpdate = true;
  shadows.computeBoundingSphere();
  shadows.renderOrder = 1;
  scene.add(shadows);
}

/** Dark walnut with long, slightly wavy grain. */
function makeWalnutTexture(THREE: Three): THREE_NS.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#5a3b24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let seed = 99;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let line = 0; line < 70; line += 1) {
      const y = random() * canvas.height;
      const dark = random() < 0.6;
      ctx.strokeStyle = dark ? `rgba(40, 24, 12, ${0.15 + random() * 0.25})` : `rgba(140, 98, 62, ${0.1 + random() * 0.2})`;
      ctx.lineWidth = 1 + random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 32) {
        ctx.lineTo(x, y + Math.sin(x / 70 + line) * 2.5);
      }
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
