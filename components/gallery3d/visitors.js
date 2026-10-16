/**
 * Other visitors for the virtual gallery: faceless, mannequin-like figures
 * built from simple shapes, who wander between the paintings, stop to look
 * for a while, sometimes in twos, and keep out of the visitor's way.
 *
 * Everything is generated in code (no model downloads). Geometries and
 * materials are shared between figures; scene.js disposes them with the scene.
 */

// Muted clothing colours in keeping with the site's palette.
const CLOTHES = [0x2b2b2e, 0x3d4a5c, 0xb48a5a, 0xa65a3f, 0xe9e2d3, 0x5d6b4f, 0x6e5a7a, 0x8c8c86];
const TROUSERS = [0x1f1f22, 0x2f3540, 0x4a4036, 0xd8cfbe, 0x3a3a3a];
// Faceless mannequin heads in a range of warm tones.
const SKIN = [0xe8d5bf, 0xd2b08c, 0xb08765, 0x8a6446, 0x5e412d];
const HAIR = [0x1c1612, 0x3b2a1e, 0x6b4e33, 0x9a9590, 0x2a2420];
const SHOES = [0x161616, 0x3a2a1e, 0xf2f0ea];

const WALK_SPEED = [0.75, 1.15];
const LOOK_TIME = [5, 15];
const PERSONAL_SPACE = 0.75;
const VIEWER_SPACE = 1.3;

export function createVisitors(THREE, scene, { hung, bounds, reducedMotion, glowTexture, desk }) {
  const count = hung.length ? Math.min(Math.max(Math.round(hung.length / 3), 3), 12) : 0;

  // A fixed seed gives every visit the same crowd.
  let seed = 20241;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const between = ([min, max]) => min + random() * (max - min);
  const pickFrom = (list) => list[Math.floor(random() * list.length)];

  const materials = new Map();
  const material = (color) => {
    if (!materials.has(color)) {
      materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    }
    return materials.get(color);
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

  const visitors = [];
  for (let i = 0; i < count; i += 1) {
    visitors.push(buildVisitor(i));
  }

  // A random outfit for a visitor. Each choice draws from the seeded random,
  // so the crowd is the same on every visit.
  function randomLook() {
    const look = {
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
  function buildFigure(look) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    root.scale.setScalar(look.scale);

    const clothes = material(look.clothes);
    const trousers = material(look.trousers);
    const skin = material(look.skin);
    const shoes = material(look.shoes);

    const limb = (geo, mat, x, y, drop) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = -drop;
      pivot.add(mesh);
      body.add(pivot);
      return pivot;
    };

    const legs = [-0.09, 0.09].map((x) => {
      const pivot = limb(geometry.leg, trousers, x, 0.92, 0.43);
      const shoe = new THREE.Mesh(geometry.shoe, shoes);
      shoe.scale.set(1, 0.6, 1.5);
      shoe.position.set(0, -0.88, 0.04);
      pivot.add(shoe);
      return pivot;
    });

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

    const arms = [-0.225, 0.225].map((x) => limb(geometry.arm, clothes, x, 1.42, 0.3));
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
      const hair = new THREE.Mesh(geometry.hair, material(look.hair));
      hair.position.y = 0.01;
      hair.rotation.x = -0.25;
      head.add(hair);
      if (look.bun) {
        const bun = new THREE.Mesh(geometry.bun, hair.material);
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
      arms[look.bagArm].add(bag);
    }

    const shadow = new THREE.Mesh(geometry.shadow, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    root.add(shadow);

    scene.add(root);
    return { root, body, head, legs, arms };
  }

  function buildVisitor(index) {
    const { root, body, head, legs, arms } = buildFigure(randomLook());

    const visitor = {
      root,
      body,
      head,
      legs,
      arms,
      speed: between(WALK_SPEED),
      heading: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
      sway: random() * Math.PI * 2,
      state: "look",
      timer: between(LOOK_TIME) * random(),
      painting: index % hung.length,
      target: new THREE.Vector3(),
      blend: 0
    };
    chooseSpot(visitor, visitor.painting);
    root.position.copy(visitor.target);
    visitor.heading = visitor.faceHeading;
    return visitor;
  }

  // Where to stand to look at a painting: a step or two back from the wall,
  // off to one side if someone is already there.
  function chooseSpot(visitor, paintingIndex) {
    const item = hung[paintingIndex];
    const company = visitors.filter((other) => other !== visitor && other.painting === paintingIndex).length;
    const along = (company ? (company % 2 ? 1 : -1) * (0.55 + 0.25 * company) : 0) + (random() - 0.5) * 0.5;
    const back = between([1.5, 2.4]);
    visitor.painting = paintingIndex;
    visitor.target.set(
      item.group.position.x + item.normalX * back,
      0,
      item.group.position.z + along
    );
    clamp(visitor.target);
    // Face the wall the painting hangs on (figures are built facing +Z).
    visitor.faceHeading = Math.atan2(-item.normalX, 0);
  }

  function nextPainting(visitor) {
    // Mostly the neighbours, sometimes somewhere further down the hall.
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

  function clamp(vector) {
    vector.x = Math.min(Math.max(vector.x, bounds.minX), bounds.maxX);
    vector.z = Math.min(Math.max(vector.z, bounds.minZ), bounds.maxZ);
    return vector;
  }

  // The ARTASIN representative behind the custom-orders desk: dressed in the
  // house black with a terracotta scarf and a name badge, facing the hall.
  const representative = desk ? buildRepresentative(desk) : null;

  function buildRepresentative({ x, z }) {
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
    const meshes = [];
    figure.root.traverse((object) => {
      if (object.isMesh && object.material !== shadowMaterial) {
        meshes.push(object);
      }
    });
    return { ...figure, meshes, sway: 0, look: 0, wave: 0, waveCooldown: 0 };
  }

  function updateRepresentative(dt, viewer) {
    const rep = representative;
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

  let focused = null;
  const desired = new THREE.Vector3();
  const push = new THREE.Vector3();
  const offset = new THREE.Vector3();

  function update(dt, viewer, focusedIndex) {
    focused = focusedIndex;
    if (representative) {
      updateRepresentative(dt, viewer);
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
        desired.subVectors(visitor.target, root.position).setY(0);
        const distance = desired.length();
        if (distance < 0.08) {
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
          desired.add(push).normalize();
          const step = Math.min(visitor.speed * dt, distance);
          root.position.addScaledVector(desired, step);
          clamp(root.position);
          visitor.heading += wrapAngle(Math.atan2(desired.x, desired.z) - visitor.heading) * Math.min(dt * 6, 1);
          moving = true;
        }
      }

      if (!moving) {
        visitor.heading += wrapAngle(visitor.faceHeading - visitor.heading) * Math.min(dt * 3, 1);
      }
      root.rotation.y = visitor.heading;

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
    }
  }

  function setVisible(visible) {
    for (const visitor of visitors) {
      visitor.root.visible = visible;
    }
  }

  return { update, setVisible, count, representativeMeshes: representative?.meshes ?? [] };
}

function clampAngle(angle, limit) {
  const wrapped = wrapAngle(angle);
  return Math.min(Math.max(wrapped, -limit), limit);
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
