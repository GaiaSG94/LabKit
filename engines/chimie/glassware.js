// Chemistry glassware factories (Three.js via the global THREE).
// Pure geometry builders: no scene, no animation loop, no DOM.
// Every builder returns the meshes the bench view needs to animate.

const FLASK_PROFILE = [
  [0, 0], [0.9, 0], [0.98, 0.035], [1.0, 0.1], [0.97, 0.2],
  [0.36, 1.5], [0.3, 1.63], [0.29, 2.3], [0.34, 2.33], [0.36, 2.37],
  [0.33, 2.4], [0.28, 2.37],
];

export function lathe(THREE, points, segments) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments || 72);
}

export function glassMaterial(THREE) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.12,
    ior: 1.48,
    clearcoat: 0.6,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });
}

export function metalMaterial(THREE, color, roughness) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness });
}

export function shadows(mesh, receive) {
  mesh.castShadow = true;
  mesh.receiveShadow = !!receive;
  return mesh;
}

// Inner radius of the flask at height y, used to clip the liquid column.
export function flaskInnerRadius(y) {
  return y < 0.2 ? 0.92 : 0.92 - (0.92 - 0.27) * Math.min(1, (y - 0.2) / 1.3);
}

export function liquidLevelOf(volume, capacity) {
  const f = Math.min(1, Math.max(0, volume / (capacity || 500)));
  return f > 0 ? 0.08 + Math.pow(f, 0.85) * 1.36 : 0;
}

// Erlenmeyer with its liquid column, meniscus disc and a sediment bed for precipitate.
export function buildFlask(THREE) {
  const group = new THREE.Group();
  const liquidMat = new THREE.MeshStandardMaterial({
    color: 0x0b8f47,
    roughness: 0.18,
    emissive: 0x078a40,
    emissiveIntensity: 0.55,
  });
  const liquid = shadows(new THREE.Mesh(new THREE.BufferGeometry(), liquidMat));
  const menMat = new THREE.MeshStandardMaterial({
    color: 0x22c06b,
    roughness: 0.1,
    emissive: 0x0f9d50,
    emissiveIntensity: 0.45,
  });
  const men = new THREE.Mesh(new THREE.CircleGeometry(1, 64), menMat);
  men.rotation.x = -Math.PI / 2;
  // Sediment: a flattened cone resting on the flask floor, grown by precipitate mass.
  const sedMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.85 });
  const sediment = shadows(new THREE.Mesh(new THREE.ConeGeometry(0.82, 1, 40, 1), sedMat));
  sediment.rotation.x = Math.PI;
  sediment.position.y = 0.09;
  sediment.scale.set(1, 0.001, 1);
  group.add(liquid, men, sediment, new THREE.Mesh(lathe(THREE, FLASK_PROFILE), glassMaterial(THREE)));

  function shape(level) {
    const on = level > 0.06;
    liquid.visible = on;
    men.visible = on;
    sediment.visible = on;
    if (!on) return;
    const top = Math.max(0.21, level);
    liquid.geometry.dispose();
    liquid.geometry = lathe(THREE, [
      [0, 0.05], [0.84, 0.05], [0.91, 0.12],
      [flaskInnerRadius(0.2), 0.2], [flaskInnerRadius(top), top], [0, top],
    ]);
    men.scale.setScalar(flaskInnerRadius(level) - 0.01);
    men.position.y = top + 0.002;
  }

  function setSediment(mass, hex) {
    const h = Math.min(0.42, mass * 0.5);
    sediment.scale.y = Math.max(0.001, h);
    sediment.position.y = 0.09 + h / 2;
    sediment.visible = h > 0.004;
    if (hex) {
      sedMat.color.set(hex);
      sedMat.emissive = sedMat.emissive || new THREE.Color(0x000000);
    }
  }

  return { group, liquid, men, sediment, liquidMat, menMat, shape, setSediment };
}

export function buildThermometer(THREE) {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    roughness: 0.2,
    emissive: 0xff3b30,
    emissiveIntensity: 0.25,
  });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 10), red);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), red);
  bulb.position.y = 0.06;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 2.6, 20), glassMaterial(THREE));
  tube.position.y = 1.3;
  group.add(column, bulb, tube);
  group.position.set(0.12, 0.28, 0.05);
  group.rotation.z = -0.07;
  return { group, column };
}

export function buildBurner(THREE) {
  const dark = metalMaterial(THREE, 0x2f3431, 0.4);
  const steel = metalMaterial(THREE, 0xa7b0ad, 0.28);
  const group = new THREE.Group();
  const base = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 48), dark));
  base.position.y = -1.16;
  const pipe = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 32), steel));
  pipe.position.y = -0.87;
  const collar = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.09, 32), steel));
  collar.position.y = -0.98;
  const valve = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.08), steel));
  valve.position.set(0.24, -1.08, 0);
  group.add(base, pipe, collar, valve);

  const flame = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.56, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x3b82f6, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  outer.position.y = 0.28;
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.3, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xbfe6ff, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  inner.position.y = 0.15;
  flame.add(outer, inner);
  flame.position.y = -0.62;
  const glow = new THREE.PointLight(0x5aa9ff, 0.8, 3, 2);
  glow.position.set(0, -0.3, 0);
  return { group, flame, glow, hit: burnerHit(THREE) };
}

function burnerHit(THREE) {
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.25, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.y = -0.7;
  hit.userData.burner = true;
  return hit;
}

// Graduated burette holding the NaOH titrant, with a stopcock and a drain spout.
export function buildBurette(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.6, 28, 1, true), glass);
  tube.position.y = 1.3;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.055, 0.34, 20), glass);
  tip.position.y = -0.16;
  const cock = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), metalMaterial(THREE, 0x1f1d24, 0.5));
  cock.rotation.z = Math.PI / 2;
  cock.position.set(0.13, 0.06, 0);
  const fillMat = new THREE.MeshStandardMaterial({
    color: 0xc4b5fd, roughness: 0.15, transparent: true, opacity: 0.85,
    emissive: 0x7c3aed, emissiveIntensity: 0.18,
  });
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 1, 24), fillMat);
  fill.position.y = 1.3;
  group.add(tube, tip, cock, fill);
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 2.9, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.y = 1.3;
  hit.userData.burette = true;
  group.add(hit);

  // fraction: 0..1 of titrant still in the tube.
  function setFill(fraction) {
    const f = Math.max(0, Math.min(1, fraction));
    fill.scale.y = Math.max(0.001, f);
    fill.position.y = 2.6 - (2.6 * f) / 2 + 0.02;
    fill.visible = f > 0.005;
  }
  return { group, hit, setFill, fillMat };
}

// Round manometer with a needle, reading the flask headspace pressure in kPa.
export function buildManometer(THREE) {
  const group = new THREE.Group();
  const case_ = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.1, 40),
    metalMaterial(THREE, 0xdde3df, 0.35),
  );
  case_.rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.38, 40), new THREE.MeshStandardMaterial({ color: 0xfafaf7, roughness: 0.6 }));
  face.position.z = 0.056;
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.3, 0.012),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }),
  );
  needle.position.set(0, 0.12, 0.07);
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), metalMaterial(THREE, 0x1f1d24, 0.4));
  pivot.position.z = 0.07;
  group.add(case_, face, needle, pivot);
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.rotation.x = Math.PI / 2;
  group.add(hit);
  return { group, needle };
}

// Plain glass beaker resting on the bench, left of the reagent bottles.
export function buildBeaker(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const body = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.8, 36, 1, true), glass));
  body.position.y = 0.4;
  const rim = shadows(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.025, 10, 40), glass));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.8;
  const bottom = shadows(new THREE.Mesh(new THREE.CircleGeometry(0.34, 36), glass));
  bottom.rotation.x = -Math.PI / 2;
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x9fd8ef, roughness: 0.15, transparent: true, opacity: 0.7 });
  const water = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.42, 32), waterMat));
  water.position.y = 0.21;
  group.add(body, rim, bottom, water);
  group.position.set(-1.15, -1.2, 0.95);
  return { group };
}

// Magnetic stirrer plate with its dial, parked right of the flask.
export function buildStirrer(THREE) {
  const group = new THREE.Group();
  const plate = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.65), metalMaterial(THREE, 0xe8ece9, 0.3)));
  plate.position.y = 0.05;
  const dial = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), metalMaterial(THREE, 0x0f172a, 0.35)));
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.2, 0.08, 0.14);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.5, 28, 1, true), glassMaterial(THREE));
  cup.position.y = 0.35;
  group.add(plate, dial, cup);
  group.position.set(0.55, -1.2, -1.15);
  return { group };
}

// Wooden rack holding five empty test tubes, back-left of the bench.
export function buildTestTubeRack(THREE) {
  const group = new THREE.Group();
  const wood = metalMaterial(THREE, 0x8b5e3c, 0.65);
  const board = shadows(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.5), wood));
  const top = shadows(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.16), wood));
  top.position.set(0, 0.34, 0);
  group.add(board, top);
  for (let i = -2; i <= 2; i++) {
    const tube = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.7, 18, 1, true), glassMaterial(THREE)));
    tube.position.set(i * 0.22, 0.36, 0);
    group.add(tube);
  }
  group.position.set(-1.15, -1.2, -1.35);
  return { group };
}

// Graduated cylinder with its scale and a little solution, front-right.
export function buildGraduatedCylinder(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const tube = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 32, 1, true), glass));
  tube.position.y = 0.55;
  const foot = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 32), glass));
  foot.position.y = 0.03;
  const marks = new THREE.MeshBasicMaterial({ color: 0x334155 });
  for (let i = 1; i <= 6; i++) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.01), marks);
    mark.position.set(0.09, 0.18 + i * 0.14, 0.12);
    group.add(mark);
  }
  const solution = shadows(new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.42, 28),
    new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.15, transparent: true, opacity: 0.75 }),
  ));
  solution.position.y = 0.24;
  group.add(tube, foot, solution);
  group.position.set(0.9, -1.2, 1.2);
  return { group };
}

// Glass funnel resting on its stem, front-left of the flask.
export function buildFunnel(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const cone = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.05, 0.44, 32, 1, true), glass));
  cone.position.y = 0.48;
  const stem = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 20), glass));
  stem.position.y = 0.14;
  const rim = shadows(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 10, 40), glass));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.7;
  group.add(cone, stem, rim);
  group.position.set(-0.4, -1.2, 1.15);
  return { group };
}

// Wash bottle (pissette) with its bent spout, front-right of the bench.
export function buildWashBottle(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const body = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.52, 28, 1, true), glass));
  body.position.y = 0.26;
  const water = shadows(new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.19, 0.3, 24),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, roughness: 0.15, transparent: true, opacity: 0.7 }),
  ));
  water.position.y = 0.16;
  const cap = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 20), metalMaterial(THREE, 0x334155, 0.5)));
  cap.position.y = 0.56;
  const spout = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 12), glass));
  spout.position.set(0.12, 0.62, 0);
  spout.rotation.z = -0.5;
  group.add(body, water, cap, spout);
  group.position.set(2.75, -1.2, -0.6);
  return { group };
}

// Hot plate: the heating surface every real bench uses to warm a flask.
export function buildHotPlate(THREE) {
  const group = new THREE.Group();
  const body = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.7), metalMaterial(THREE, 0x475569, 0.35)));
  body.position.y = 0.09;
  const ceramic = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 32), metalMaterial(THREE, 0xf1f5f9, 0.55)));
  ceramic.position.y = 0.2;
  const knob = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), metalMaterial(THREE, 0xb91c1c, 0.4)));
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.28, 0.12, 0.36);
  group.add(body, ceramic, knob);
  group.position.set(1.45, -1.2, -1.35);
  return { group };
}

// Watch glass: a shallow dish used to evaporate a solution.
export function buildWatchGlass(THREE) {
  const group = new THREE.Group();
  const dish = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.035, 36), glassMaterial(THREE)));
  dish.position.y = 0.02;
  const solution = shadows(new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.16, 0.02, 32),
    new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.2, transparent: true, opacity: 0.8 }),
  ));
  solution.position.y = 0.03;
  group.add(dish, solution);
  group.position.set(-1.75, -1.2, 1.35);
  return { group };
}

// Pasteur pipette lying on the bench.
export function buildPasteurPipette(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const bulb = shadows(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), glass));
  bulb.position.y = 0.09;
  const tube = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.012, 0.62, 14), glass));
  tube.position.y = -0.31;
  const drop = shadows(new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.1, transparent: true, opacity: 0.8 }),
  ));
  drop.position.y = -0.63;
  group.add(bulb, tube, drop);
  group.position.set(-1.05, -1.2, 1.5);
  group.rotation.z = Math.PI / 2 - 0.15;
  group.rotation.y = 0.4;
  return { group };
}

// Mortar and pestle, for crushing a solid.
export function buildMortar(THREE) {
  const group = new THREE.Group();
  const bowl = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.28, 32, 1, true), metalMaterial(THREE, 0xb0b7bd, 0.4)));
  bowl.position.y = 0.14;
  const pestle = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.42, 20), metalMaterial(THREE, 0xc7ced4, 0.35)));
  pestle.position.set(0.16, 0.26, 0.05);
  pestle.rotation.z = 0.5;
  group.add(bowl, pestle);
  group.position.set(1.95, -1.2, 1.35);
  return { group };
}

// Volumetric flask: the calibrated flask used to prepare a solution.
export function buildVolumetricFlask(THREE) {
  const group = new THREE.Group();
  const glass = glassMaterial(THREE);
  const bulb = shadows(new THREE.Mesh(new THREE.SphereGeometry(0.26, 28, 20), glass));
  bulb.position.y = 0.26;
  bulb.scale.set(1, 0.95, 1);
  const neck = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 20), glass));
  neck.position.y = 0.68;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 6, 20), new THREE.MeshBasicMaterial({ color: 0x64748b }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.82;
  const stopper = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.09, 18), metalMaterial(THREE, 0x334155, 0.5)));
  stopper.position.y = 0.95;
  group.add(bulb, neck, ring, stopper);
  group.position.set(2.35, -1.2, -1.35);
  return { group };
}

// Digital stopwatch, to time a reaction.
export function buildStopwatch(THREE) {
  const group = new THREE.Group();
  const body = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.14), metalMaterial(THREE, 0x1f2937, 0.4)));
  body.position.y = 0.1;
  const face = shadows(new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4, emissive: 0x14532d, emissiveIntensity: 0.6 })));
  face.position.set(0, 0.11, 0.071);
  const crown = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), metalMaterial(THREE, 0x9ca3af, 0.3)));
  crown.position.set(0.19, 0.1, 0);
  crown.rotation.z = Math.PI / 2;
  group.add(body, face, crown);
  group.position.set(0.1, -1.2, 1.55);
  group.rotation.y = -0.25;
  return { group };
}
