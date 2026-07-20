import gsap from "gsap";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type ScreenPoint = {
  x: number;
  y: number;
};

export type DealerStageOptions = {
  reducedMotion: boolean;
};

export type DealerStage = {
  canvas: HTMLCanvasElement;
  resize: (width: number, height: number) => void;
  project: (position: THREE.Vector3) => ScreenPoint;
  getDeckPoint: () => ScreenPoint;
  getHandPoint: () => ScreenPoint;
  intro: () => gsap.core.Timeline;
  dealPulse: () => gsap.core.Timeline;
  celebrate: () => void;
  setDeckRemaining: (count: number) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  dispose: () => void;
};

type Limb = {
  root: THREE.Group;
  joint: THREE.Group;
  terminal: THREE.Group;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  shape.moveTo(-halfWidth + radius, -halfHeight);
  shape.lineTo(halfWidth - radius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + radius);
  shape.lineTo(halfWidth, halfHeight - radius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
  shape.lineTo(-halfWidth + radius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - radius);
  shape.lineTo(-halfWidth, -halfHeight + radius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + radius, -halfHeight);

  return shape;
}

function makeTexture(
  width: number,
  height: number,
  painter: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create canvas texture.");
  }

  painter(ctx, canvas);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createVelvetTexture(): THREE.CanvasTexture {
  return makeTexture(512, 512, (ctx, canvas) => {
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.35,
      canvas.height * 0.3,
      20,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.8,
    );
    gradient.addColorStop(0, "#121824");
    gradient.addColorStop(0.45, "#06090f");
    gradient.addColorStop(1, "#020305");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.22;
    for (let index = 0; index < 80; index += 1) {
      const y = (index / 79) * canvas.height;
      const alpha = 0.02 + (index % 2) * 0.015;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, y, canvas.width, 1);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(210, 175, 65, 0.18)";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
  });
}

function createWoodTexture(): THREE.CanvasTexture {
  return makeTexture(1024, 1024, (ctx, canvas) => {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#5b3117");
    gradient.addColorStop(0.38, "#2d1409");
    gradient.addColorStop(0.65, "#6b3a1e");
    gradient.addColorStop(1, "#160a05");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 42; index += 1) {
      const y = (index / 41) * canvas.height;
      const wobble = Math.sin(index * 0.85) * 8;
      ctx.strokeStyle = `rgba(255, 220, 150, ${0.04 + (index % 4) * 0.015})`;
      ctx.lineWidth = 2 + (index % 3) * 1.2;
      ctx.beginPath();
      ctx.moveTo(-20, y + wobble);
      ctx.bezierCurveTo(canvas.width * 0.3, y - wobble, canvas.width * 0.66, y + wobble * 1.2, canvas.width + 20, y - wobble * 0.5);
      ctx.stroke();
    }

    const grain = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.5, 50, canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.7);
    grain.addColorStop(0, "rgba(255,255,255,0.08)");
    grain.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
}

function createGlowTexture(color = "#f0d88a"): THREE.CanvasTexture {
  return makeTexture(128, 128, (ctx, canvas) => {
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.5,
      0,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.5,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.35, "rgba(255, 227, 156, 0.65)");
    gradient.addColorStop(0.75, "rgba(255, 210, 92, 0.16)");
    gradient.addColorStop(1, "rgba(255, 210, 92, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
}

function createBackdropTexture(): THREE.CanvasTexture {
  return makeTexture(1024, 512, (ctx, canvas) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#030305");
    gradient.addColorStop(0.3, "#0a090f");
    gradient.addColorStop(1, "#170b0a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const halo = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.35, 10, canvas.width * 0.5, canvas.height * 0.35, canvas.width * 0.42);
    halo.addColorStop(0, "rgba(214, 175, 66, 0.26)");
    halo.addColorStop(0.4, "rgba(214, 175, 66, 0.08)");
    halo.addColorStop(1, "rgba(214, 175, 66, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#ffffff";
    for (let index = 0; index < 110; index += 1) {
      ctx.fillRect((index * 29) % canvas.width, (index * 19) % canvas.height, 2, 2);
    }
  });
}

function createParticleTexture(): THREE.CanvasTexture {
  return createGlowTexture("#ffffff");
}

function createLimb(
  upperLength: number,
  lowerLength: number,
  radius: number,
  material: THREE.Material,
): Limb {
  const root = new THREE.Group();
  const upper = new THREE.Group();
  const upperMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, upperLength, 12), material);
  upperMesh.position.y = -upperLength / 2;
  upper.add(upperMesh);

  const elbow = new THREE.Group();
  elbow.position.y = -upperLength;
  upper.add(elbow);

  const lower = new THREE.Group();
  const lowerMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 1.02, lowerLength, 12), material);
  lowerMesh.position.y = -lowerLength / 2;
  lower.add(lowerMesh);
  lower.position.y = 0;

  const terminal = new THREE.Group();
  terminal.position.y = -lowerLength;
  lower.add(terminal);

  elbow.add(lower);
  root.add(upper);

  return {
    root,
    joint: elbow,
    terminal,
  };
}

function makeSpotlightBeam(texture: THREE.Texture, opacity = 0.18): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), material);
  beam.rotation.x = -Math.PI / 2.1;
  beam.position.y = 4.8;
  beam.position.z = -1.6;
  return beam;
}

export function createDealerStage(container: HTMLElement, options: DealerStageOptions): DealerStage {
  const state = {
    reducedMotion: options.reducedMotion,
    deckRemaining: 27,
    cameraDrift: options.reducedMotion ? 0.02 : 0.07,
    pulse: 0,
  };

  const renderer = new THREE.WebGLRenderer({
    antialias: !options.reducedMotion,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.reducedMotion ? 1.3 : 1.7));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = !options.reducedMotion;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "dealer-stage__canvas";
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040305, options.reducedMotion ? 0.06 : 0.05);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const cameraRig = {
    x: 0.2,
    y: 4.25,
    z: 13.5,
    lookX: 0,
    lookY: 1.4,
    lookZ: 0,
    roll: -0.012,
  };

  const deckWorldAnchor = new THREE.Object3D();
  const handWorldAnchor = new THREE.Object3D();
  scene.add(deckWorldAnchor, handWorldAnchor);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight),
    options.reducedMotion ? 0.8 : 1.1,
    0.55,
    0.24,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const ambient = new THREE.AmbientLight(0x665741, options.reducedMotion ? 0.35 : 0.45);
  const fill = new THREE.HemisphereLight(0xffedd6, 0x150506, options.reducedMotion ? 1.0 : 1.2);
  const rim = new THREE.DirectionalLight(0xd7b35b, options.reducedMotion ? 1.4 : 1.8);
  rim.position.set(-3.5, 7, 4.5);
  const spotlight = new THREE.SpotLight(0xfff0c4, options.reducedMotion ? 1.9 : 2.5, 22, Math.PI / 8, 0.35, 1.1);
  spotlight.position.set(1.5, 7.6, 4.2);
  spotlight.castShadow = !options.reducedMotion;
  spotlight.target.position.set(0, 1.2, 0);
  const deckSpot = new THREE.PointLight(0xd9b15d, options.reducedMotion ? 1.2 : 1.55, 10, 1.8);
  deckSpot.position.set(-2.3, 1.55, 1.4);
  const seatGlow = new THREE.PointLight(0xdfefff, 0, 18, 1.7);
  seatGlow.position.set(0, 1.4, 0);

  scene.add(ambient, fill, rim, spotlight, spotlight.target, deckSpot, seatGlow);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 10),
    new THREE.MeshBasicMaterial({
      map: createBackdropTexture(),
      transparent: true,
      opacity: 0.9,
    }),
  );
  backdrop.position.set(0, 4.2, -6.7);
  scene.add(backdrop);

  const curtainGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8),
    new THREE.MeshBasicMaterial({
      map: createGlowTexture("#d1ad58"),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  curtainGlow.position.set(0, 5.25, -5.8);
  scene.add(curtainGlow);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 16),
    new THREE.MeshStandardMaterial({
      color: 0x09070a,
      metalness: 0.15,
      roughness: 0.92,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  scene.add(floor);

  const woodTexture = createWoodTexture();
  const velvetTexture = createVelvetTexture();
  const tableGroup = new THREE.Group();
  tableGroup.position.set(0, 0, 0);
  tableGroup.rotation.y = -0.16;

  const tableShape = createRoundedRectShape(10.2, 5.45, 1.02);
  const bodyGeometry = new THREE.ExtrudeGeometry(tableShape, { depth: 0.88, bevelEnabled: false });
  bodyGeometry.center();
  const tableBody = new THREE.Mesh(
    bodyGeometry,
    new THREE.MeshPhysicalMaterial({
      map: woodTexture,
      color: 0x4a2515,
      roughness: 0.54,
      metalness: 0.16,
      clearcoat: 0.32,
      clearcoatRoughness: 0.34,
      envMapIntensity: 0.8,
    }),
  );
  tableBody.position.y = 0.32;
  tableBody.castShadow = true;
  tableBody.receiveShadow = true;

  const topGeometry = new THREE.ExtrudeGeometry(createRoundedRectShape(9.3, 4.55, 0.82), {
    depth: 0.18,
    bevelEnabled: false,
  });
  topGeometry.center();
  const tableTop = new THREE.Mesh(
    topGeometry,
    new THREE.MeshStandardMaterial({
      map: velvetTexture,
      color: 0x0a1113,
      roughness: 0.98,
      metalness: 0.02,
      transparent: true,
      opacity: 0.98,
    }),
  );
  tableTop.position.y = 0.78;
  tableTop.receiveShadow = true;

  const rimGeometry = new THREE.ExtrudeGeometry(createRoundedRectShape(9.7, 4.95, 0.92), {
    depth: 0.07,
    bevelEnabled: false,
  });
  rimGeometry.center();
  const tableRim = new THREE.Mesh(
    rimGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xc8a54a,
      metalness: 0.78,
      roughness: 0.18,
      emissive: 0x3a2605,
      emissiveIntensity: 0.35,
    }),
  );
  tableRim.position.y = 0.68;
  tableRim.castShadow = true;

  const tableShadow = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 48),
    new THREE.MeshBasicMaterial({
      map: createGlowTexture("#000000"),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    }),
  );
  tableShadow.rotation.x = -Math.PI / 2;
  tableShadow.position.y = -0.1;

  tableGroup.add(tableShadow, tableBody, tableRim, tableTop);
  scene.add(tableGroup);

  const deckGroup = new THREE.Group();
  deckGroup.position.set(-2.42, 1.1, 0.36);
  deckGroup.rotation.set(-0.1, -0.16, -0.09);
  scene.add(deckGroup);

  const totalDeckCards = 30;
  const deckCards: THREE.Mesh[] = [];
  const cardGeometry = new THREE.BoxGeometry(0.95, 0.028, 1.34);
  for (let index = 0; index < totalDeckCards; index += 1) {
    const card = new THREE.Mesh(
      cardGeometry,
      new THREE.MeshStandardMaterial({
        color: index === totalDeckCards - 1 ? 0x221519 : 0x0b0b0e,
        roughness: 0.78,
        metalness: 0.16,
        emissive: index === totalDeckCards - 1 ? 0x3f3010 : 0x000000,
        emissiveIntensity: index === totalDeckCards - 1 ? 0.2 : 0,
      }),
    );
    card.position.y = index * 0.016;
    card.rotation.z = (index - totalDeckCards / 2) * 0.0018;
    card.castShadow = true;
    card.receiveShadow = true;
    deckGroup.add(card);
    deckCards.push(card);
  }

  const deckGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 32),
    new THREE.MeshBasicMaterial({
      map: createGlowTexture("#d4b355"),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  deckGlow.rotation.x = -Math.PI / 2;
  deckGlow.position.set(0, -0.03, 0.05);
  deckGroup.add(deckGlow);

  const dealerRoot = new THREE.Group();
  dealerRoot.position.set(0, 0.86, -1.88);
  dealerRoot.rotation.y = 0.12;
  scene.add(dealerRoot);

  const jacketMaterial = new THREE.MeshStandardMaterial({
    color: 0x09090c,
    roughness: 0.92,
    metalness: 0.04,
    emissive: 0x020203,
    emissiveIntensity: 0.25,
  });
  const shirtMaterial = new THREE.MeshStandardMaterial({
    color: 0x17141b,
    roughness: 0.86,
    metalness: 0.08,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xd2a57b,
    roughness: 0.68,
    metalness: 0.03,
    emissive: 0x3d1f09,
    emissiveIntensity: 0.09,
  });
  const cuffMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8bb65,
    roughness: 0.22,
    metalness: 0.88,
    emissive: 0x4c3810,
    emissiveIntensity: 0.2,
  });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.56, 1.92, 0.82), jacketMaterial);
  torso.position.set(0, 1.28, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  dealerRoot.add(torso);

  const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.35, 0.1), cuffMaterial);
  lapel.position.set(-0.48, 1.3, 0.36);
  lapel.rotation.z = 0.22;
  dealerRoot.add(lapel);
  const lapelRight = lapel.clone();
  lapelRight.position.x = 0.48;
  lapelRight.rotation.z = -0.22;
  dealerRoot.add(lapelRight);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.16), cuffMaterial);
  collar.position.set(0, 2.15, 0.21);
  dealerRoot.add(collar);

  const tie = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.38, 4), jacketMaterial);
  tie.position.set(0, 1.95, 0.26);
  tie.rotation.z = Math.PI / 4;
  dealerRoot.add(tie);

  const head = new THREE.Group();
  head.position.set(0, 2.78, 0.04);
  dealerRoot.add(head);

  const headSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 20),
    new THREE.MeshStandardMaterial({
      color: 0x050507,
      roughness: 1,
      metalness: 0.01,
      emissive: 0x020203,
      emissiveIntensity: 0.22,
    }),
  );
  headSphere.castShadow = true;
  head.add(headSphere);

  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.82, 0.12, 24),
    new THREE.MeshStandardMaterial({
      color: 0x040405,
      roughness: 0.95,
      metalness: 0.02,
    }),
  );
  hatBrim.position.y = 0.35;
  head.add(hatBrim);
  const hatTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.56, 0.52, 20),
    new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.96,
      metalness: 0.02,
    }),
  );
  hatTop.position.y = 0.72;
  head.add(hatTop);

  const leftArm = createLimb(1.08, 0.88, 0.13, shirtMaterial);
  leftArm.root.position.set(-0.82, 1.72, 0.12);
  leftArm.root.rotation.z = 0.36;
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMaterial);
  leftHand.position.y = -0.02;
  const leftCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 12), cuffMaterial);
  leftCuff.position.y = -0.18;
  leftArm.terminal.add(leftHand, leftCuff);
  dealerRoot.add(leftArm.root);

  const rightArm = createLimb(1.12, 0.92, 0.13, shirtMaterial);
  rightArm.root.position.set(0.84, 1.72, 0.12);
  rightArm.root.rotation.z = -0.38;
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), skinMaterial);
  rightHand.position.y = -0.02;
  const rightCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 12), cuffMaterial);
  rightCuff.position.y = -0.18;
  rightArm.terminal.add(rightHand, rightCuff);
  dealerRoot.add(rightArm.root);

  handWorldAnchor.position.set(-1.94, 1.12, -0.08);
  scene.add(handWorldAnchor);

  const spotlightBeam = makeSpotlightBeam(createGlowTexture("#f3d488"), options.reducedMotion ? 0.16 : 0.22);
  scene.add(spotlightBeam);
  const deckBeam = makeSpotlightBeam(createGlowTexture("#ffffff"), options.reducedMotion ? 0.08 : 0.12);
  deckBeam.position.set(-2.2, 4.5, -0.2);
  deckBeam.rotation.z = 0.16;
  scene.add(deckBeam);

  const particles = new THREE.Group();
  scene.add(particles);
  const particleTexture = createParticleTexture();
  const particleCount = options.reducedMotion ? 120 : 220;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSeeds = new Float32Array(particleCount);

  for (let index = 0; index < particleCount; index += 1) {
    const seed = Math.random();
    particleSeeds[index] = seed;
    const radius = 8.5 + Math.random() * 4.5;
    const angle = Math.random() * Math.PI * 2;
    particlePositions[index * 3 + 0] = Math.cos(angle) * radius * 0.9;
    particlePositions[index * 3 + 1] = 0.9 + Math.random() * 5.8;
    particlePositions[index * 3 + 2] = Math.sin(angle) * radius - 2.8;
  }

  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffe5a6,
    size: options.reducedMotion ? 0.065 : 0.09,
    map: particleTexture,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  particles.add(particleSystem);

  let animationFrame = 0;
  const clock = new THREE.Clock();
  const focus = new THREE.Vector3(0, 1.36, 0);
  const tempVector = new THREE.Vector3();
  const deckAnchor = new THREE.Vector3();
  const handAnchor = new THREE.Vector3();
  const particleAttribute = particleGeometry.getAttribute("position") as THREE.BufferAttribute;
  const particlePositionArray = particlePositions;
  let deckRemaining = 27;

  function updateDeckVisibility(): void {
    const visibleCount = clamp(deckRemaining, 0, totalDeckCards);
    deckCards.forEach((mesh, index) => {
      mesh.visible = index < visibleCount;
    });
    deckGroup.position.y = 1.1 - (totalDeckCards - visibleCount) * 0.009;
    deckGlow.scale.setScalar(1 + (visibleCount / totalDeckCards) * 0.08);
  }

  function resize(width: number, height: number): void {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    camera.aspect = safeWidth / safeHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(safeWidth, safeHeight);
    composer.setSize(safeWidth, safeHeight);
    bloom.setSize(safeWidth, safeHeight);
  }

  function project(position: THREE.Vector3): ScreenPoint {
    tempVector.copy(position).project(camera);
    const width = renderer.domElement.clientWidth || renderer.domElement.width;
    const height = renderer.domElement.clientHeight || renderer.domElement.height;
    return {
      x: ((tempVector.x + 1) * 0.5) * width,
      y: ((1 - tempVector.y) * 0.5) * height,
    };
  }

  function getDeckPoint(): ScreenPoint {
    deckWorldAnchor.position.copy(deckGroup.getWorldPosition(deckAnchor));
    return project(deckWorldAnchor.position);
  }

  function getHandPoint(): ScreenPoint {
    handWorldAnchor.position.copy(rightArm.terminal.getWorldPosition(handAnchor));
    return project(handWorldAnchor.position);
  }

  const pose = {
    reach: 0,
    emphasis: 0,
    celebration: 0,
  };

  function intro(): gsap.core.Timeline {
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .to(cameraRig, {
        x: 0.12,
        y: 4.1,
        z: 12.8,
        roll: 0.012,
        duration: state.reducedMotion ? 0.8 : 1.7,
      }, 0)
      .to(focus, {
        x: 0,
        y: 1.28,
        z: 0,
        duration: state.reducedMotion ? 0.8 : 1.5,
      }, 0)
      .to(spotlight, {
        intensity: state.reducedMotion ? 1.7 : 3.1,
        duration: state.reducedMotion ? 0.8 : 1.2,
      }, 0)
      .to(deckSpot, {
        intensity: state.reducedMotion ? 1.0 : 1.8,
        duration: state.reducedMotion ? 0.8 : 1.2,
      }, 0.05)
      .to(curtainGlow.material as THREE.MeshBasicMaterial, {
        opacity: state.reducedMotion ? 0.2 : 0.32,
        duration: state.reducedMotion ? 0.8 : 1.2,
      }, 0)
      .to(pose, {
        emphasis: 1,
        duration: state.reducedMotion ? 0.8 : 1.4,
      }, 0.08);
    return timeline;
  }

  function dealPulse(): gsap.core.Timeline {
    const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
    timeline
      .to(pose, {
        reach: 1,
        duration: state.reducedMotion ? 0.12 : 0.28,
      }, 0)
      .to(deckSpot, {
        intensity: state.reducedMotion ? 1.2 : 2.0,
        duration: state.reducedMotion ? 0.12 : 0.26,
      }, 0)
      .to(spotlight, {
        intensity: state.reducedMotion ? 1.8 : 3.2,
        duration: state.reducedMotion ? 0.12 : 0.2,
      }, 0)
      .to(pose, {
        reach: 0,
        duration: state.reducedMotion ? 0.24 : 0.42,
      }, ">-0.02")
      .to(deckSpot, {
        intensity: state.reducedMotion ? 1.0 : 1.55,
        duration: state.reducedMotion ? 0.22 : 0.32,
      }, "<")
      .to(spotlight, {
        intensity: state.reducedMotion ? 1.7 : 2.5,
        duration: state.reducedMotion ? 0.22 : 0.34,
      }, "<");
    return timeline;
  }

  function celebrate(): void {
    state.pulse = 1;
    gsap.to(state, {
      pulse: 0,
      duration: state.reducedMotion ? 1 : 2.2,
      ease: "power2.out",
    });
    gsap.to(spotlight, {
      intensity: state.reducedMotion ? 2.2 : 4.2,
      duration: state.reducedMotion ? 0.35 : 0.8,
      yoyo: true,
      repeat: 1,
    });
    gsap.to(deckSpot, {
      intensity: state.reducedMotion ? 1.4 : 2.8,
      duration: state.reducedMotion ? 0.4 : 0.9,
      yoyo: true,
      repeat: 1,
    });
  }

  function setDeckRemaining(count: number): void {
    deckRemaining = clamp(count, 0, totalDeckCards);
    updateDeckVisibility();
  }

  function setReducedMotion(reducedMotion: boolean): void {
    state.reducedMotion = reducedMotion;
    state.cameraDrift = reducedMotion ? 0.02 : 0.07;
    particleMaterial.size = reducedMotion ? 0.065 : 0.09;
    bloom.strength = reducedMotion ? 0.78 : 1.1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reducedMotion ? 1.25 : 1.7));
  }

  function animate(): void {
    animationFrame = window.requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    const drift = state.cameraDrift;
    const driftX = Math.sin(elapsed * 0.42) * drift;
    const driftY = Math.sin(elapsed * 0.28) * drift * 0.6;
    const driftZ = Math.cos(elapsed * 0.24) * drift * 0.7;

    camera.position.set(cameraRig.x + driftX, cameraRig.y + driftY, cameraRig.z + driftZ);
    camera.rotation.z = cameraRig.roll;
    camera.lookAt(focus);

    const armReach = pose.reach;
    rightArm.root.rotation.z = -0.46 + armReach * 0.86;
    rightArm.root.rotation.x = 0.05 + armReach * 0.15;
    rightArm.joint.rotation.z = 0.12 + armReach * 0.45;
    leftArm.root.rotation.z = 0.4 + Math.sin(elapsed * 0.95) * 0.018;
    leftArm.root.rotation.x = -0.02 + Math.cos(elapsed * 0.5) * 0.015;
    leftArm.joint.rotation.z = -0.1 + Math.sin(elapsed * 0.6) * 0.02;

    dealerRoot.position.y = 0.86 + Math.sin(elapsed * 1.8) * 0.02;
    dealerRoot.rotation.y = 0.12 + Math.sin(elapsed * 0.18) * 0.03;
    head.rotation.z = Math.sin(elapsed * 0.8) * 0.014;
    torso.rotation.y = Math.sin(elapsed * 0.2) * 0.02;

    deckSpot.position.y = 1.55 + Math.sin(elapsed * 2.8) * 0.03;
    spotlight.position.x = 1.5 + Math.sin(elapsed * 0.3) * 0.12;
    spotlight.position.y = 7.6 + Math.sin(elapsed * 0.22) * 0.1;

    particleSystem.rotation.y += delta * 0.02;
    particleSystem.rotation.x = Math.sin(elapsed * 0.08) * 0.02;
    for (let index = 0; index < particleCount; index += 1) {
      const baseIndex = index * 3;
      const seed = particleSeeds[index];
      const rise = Math.sin(elapsed * 0.42 + seed * 8) * 0.03;
      particlePositionArray[baseIndex + 1] += rise * delta;
      if (particlePositionArray[baseIndex + 1] > 7.2) {
        particlePositionArray[baseIndex + 1] = 0.8 + seed * 1.2;
      }
      if (particlePositionArray[baseIndex + 1] < 0.6) {
        particlePositionArray[baseIndex + 1] = 0.9 + seed * 0.6;
      }
    }
    particleAttribute.needsUpdate = true;

    const pulse = state.pulse;
    if (pulse > 0.0001) {
      const pulseScale = 1 + pulse * 0.025;
      curtainGlow.scale.setScalar(pulseScale);
      bloom.strength = clamp(bloom.strength + pulse * 0.08, 0.7, 1.8);
      state.pulse *= 0.96;
    } else {
      curtainGlow.scale.setScalar(1);
    }

    composer.render();
  }

  animate();
  updateDeckVisibility();

  function dispose(): void {
    window.cancelAnimationFrame(animationFrame);
    renderer.dispose();
    composer.dispose();
    woodTexture.dispose();
    velvetTexture.dispose();
  }

  return {
    canvas: renderer.domElement,
    resize,
    project,
    getDeckPoint,
    getHandPoint,
    intro,
    dealPulse,
    celebrate,
    setDeckRemaining,
    setReducedMotion,
    dispose,
  };
}
