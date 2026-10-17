/**
 * Realistic models for the gallery's other visitors: four Microsoft Rocketbox
 * avatars (MIT; see public/gallery3d/visitors/LICENSE.md) sharing two small
 * animation files, one per skeleton, so ~0.85 MB covers the whole crowd.
 *
 * Like the staff models (staff.ts), they arrive after the paintings and take
 * over from the code-built mannequins one by one; on a slow connection or a
 * small device fewer of them load, or none, and the mannequins stay.
 */

import type * as THREE_NS from "three";

type Three = typeof THREE_NS;
type Sex = "f" | "m";

/** In loading order, alternating so that a budget of two still gets one of each. */
const VARIANTS: readonly { url: string; sex: Sex }[] = [
  { url: "/gallery3d/visitors/f03.glb", sex: "f" },
  { url: "/gallery3d/visitors/m17.glb", sex: "m" },
  { url: "/gallery3d/visitors/f09.glb", sex: "f" },
  { url: "/gallery3d/visitors/m03.glb", sex: "m" }
];

const ANIMATION_URLS: Record<Sex, string> = {
  f: "/gallery3d/visitors/anims-f.glb",
  m: "/gallery3d/visitors/anims-m.glb"
};

/**
 * How fast each walk clip covers the ground at normal speed, in metres per
 * second (measured from its root travel when converting): playing it at
 * speed / this keeps the feet from sliding.
 */
const WALK_CLIP_SPEED: Record<Sex, number> = { f: 0.93, m: 0.69 };

/** One loaded avatar, ready to be copied for as many visitors as need it. */
export interface VisitorModel {
  create(): VisitorBody;
}

/** One visitor's copy of an avatar, with its own animation state. */
export interface VisitorBody {
  object: THREE_NS.Object3D;
  mixer: THREE_NS.AnimationMixer;
  idle: THREE_NS.AnimationAction;
  walk: THREE_NS.AnimationAction;
  /** Ground speed at which the walk plays at its natural rate. */
  walkSpeed: number;
}

/**
 * How many of the avatars to fetch: none when the visitor saves data or is on
 * 2G, two (one woman, one man, ~0.45 MB) on 3G or a device with under 4 GB of
 * memory, and all four otherwise.
 */
export function visitorModelBudget(): number {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };
  const connection = nav.connection;
  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) {
    return 0;
  }
  if (connection?.effectiveType === "3g" || (nav.deviceMemory !== undefined && nav.deviceMemory < 4)) {
    return 2;
  }
  return VARIANTS.length;
}

export async function loadVisitorModels(THREE: Three, budget: number): Promise<VisitorModel[]> {
  const variants = VARIANTS.slice(0, budget);
  if (!variants.length) {
    return [];
  }
  const [{ GLTFLoader }, { MeshoptDecoder }, { clone }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    import("three/examples/jsm/utils/SkeletonUtils.js")
  ]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  const sexes = [...new Set(variants.map((variant) => variant.sex))];
  const clipsBySex = new Map<Sex, { idle: THREE_NS.AnimationClip; walk: THREE_NS.AnimationClip }>();
  await Promise.all(
    sexes.map(async (sex) => {
      try {
        const { animations } = await loader.loadAsync(ANIMATION_URLS[sex]);
        const idle = animations.find((clip) => clip.name === "idle");
        const walk = animations.find((clip) => clip.name === "walk");
        if (idle && walk) {
          clipsBySex.set(sex, { idle, walk });
        }
      } catch (error) {
        console.warn("Gallery visitor animations could not be loaded; keeping the simple figures.", error);
      }
    })
  );

  const models = await Promise.all(
    variants.map(async ({ url, sex }): Promise<VisitorModel | null> => {
      const clips = clipsBySex.get(sex);
      if (!clips) {
        return null;
      }
      try {
        const { scene: template } = await loader.loadAsync(url);
        return {
          create() {
            const object = clone(template);
            object.updateMatrixWorld(true);
            object.traverse((child) => {
              if (child instanceof THREE.SkinnedMesh) {
                // Bounds from the standing pose, with room for the arms and
                // stride, so visitors out of view are skipped by the renderer.
                child.computeBoundingSphere();
                child.boundingSphere?.set(child.boundingSphere.center, child.boundingSphere.radius * 1.3);
              }
            });
            const mixer = new THREE.AnimationMixer(object);
            const idle = mixer.clipAction(clips.idle);
            const walk = mixer.clipAction(clips.walk);
            // Both run all the time, weighted by how much the visitor is walking;
            // starting at random points keeps the crowd from moving in step.
            idle.play();
            idle.time = Math.random() * clips.idle.duration;
            walk.play();
            walk.time = Math.random() * clips.walk.duration;
            walk.setEffectiveWeight(0);
            return { object, mixer, idle, walk, walkSpeed: WALK_CLIP_SPEED[sex] };
          }
        };
      } catch (error) {
        console.warn(`Gallery visitor model ${url} could not be loaded; keeping the simple figure.`, error);
        return null;
      }
    })
  );
  return models.filter((model) => model !== null);
}
