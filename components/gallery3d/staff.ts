/**
 * Realistic models for the two gallery staff — the custom-orders desk
 * representative and the Artasin helper — converted from the Microsoft
 * Rocketbox avatar library (MIT; see public/gallery3d/staff/LICENSE.md).
 *
 * They replace the code-built mannequins once loaded, so the gallery is
 * usable straight away and on a slow connection the mannequins simply stay.
 * The loader and decoder are imported on demand, like three itself.
 */

import type * as THREE_NS from "three";

type Three = typeof THREE_NS;

export type StaffRole = "desk" | "helper";

const MODEL_URLS: Record<StaffRole, string> = {
  desk: "/gallery3d/staff/desk.glb",
  helper: "/gallery3d/staff/helper.glb"
};

export interface StaffModel {
  model: THREE_NS.Object3D;
  mixer: THREE_NS.AnimationMixer;
  /** By clip name: "idle", "wave", and for the helper "walk". */
  actions: Partial<Record<"idle" | "wave" | "walk", THREE_NS.AnimationAction>>;
  /** Turned to look at the visitor, on top of whatever the clip is doing. */
  head: THREE_NS.Object3D | null;
}

/**
 * Whether to fetch the models at all: not when the visitor has asked to save
 * data or is on a very slow connection, where the ~1.5 MB would cost more
 * than it adds.
 */
export function shouldLoadStaffModels(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData) {
    return false;
  }
  return !connection?.effectiveType || !/(^|-)2g$/.test(connection.effectiveType);
}

export async function loadStaffModels(THREE: Three): Promise<Partial<Record<StaffRole, StaffModel>>> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js")
  ]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  const entries = await Promise.all(
    (Object.keys(MODEL_URLS) as StaffRole[]).map(async (role) => {
      try {
        const gltf = await loader.loadAsync(MODEL_URLS[role]);
        const model = gltf.scene;
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            // The skinned mesh's bounds come from its bind pose; the arms
            // and walk move it outside them, so never cull it by them.
            object.frustumCulled = false;
          }
        });
        const mixer = new THREE.AnimationMixer(model);
        const actions: StaffModel["actions"] = {};
        for (const clip of gltf.animations) {
          if (clip.name === "idle" || clip.name === "wave" || clip.name === "walk") {
            actions[clip.name] = mixer.clipAction(clip);
          }
        }
        actions.idle?.play();
        if (actions.wave) {
          actions.wave.setLoop(THREE.LoopOnce, 1);
          actions.wave.clampWhenFinished = false;
        }
        if (actions.walk) {
          // Running alongside the idle, weighted by how much it is walking.
          actions.walk.play();
          actions.walk.setEffectiveWeight(0);
        }
        return [role, { model, mixer, actions, head: model.getObjectByName("Bip01_Head") ?? null }] as const;
      } catch (error) {
        console.warn(`Gallery ${role} model could not be loaded; keeping the simple figure.`, error);
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((entry) => entry !== null));
}

const turn = { axis: null as THREE_NS.Vector3 | null, parent: null as THREE_NS.Quaternion | null, rotation: null as THREE_NS.Quaternion | null };

/**
 * Turns a bone about the vertical, in its parent's frame, after the clip has
 * posed it: how the staff look towards the visitor while still breathing,
 * waving or walking.
 */
export function addYaw(THREE: Three, bone: THREE_NS.Object3D, angle: number): void {
  if (!angle || !bone.parent) {
    return;
  }
  turn.axis ??= new THREE.Vector3();
  turn.parent ??= new THREE.Quaternion();
  turn.rotation ??= new THREE.Quaternion();
  bone.parent.getWorldQuaternion(turn.parent);
  turn.axis.set(0, 1, 0).applyQuaternion(turn.parent.invert());
  bone.quaternion.premultiply(turn.rotation.setFromAxisAngle(turn.axis, angle));
}
