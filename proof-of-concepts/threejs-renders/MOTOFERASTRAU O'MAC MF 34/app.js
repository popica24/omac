// Leagă totul: scena 3D, explodarea, markerii și lista de poziții.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ASSEMBLIES, POSITIONS } from './parts.js';
import { buildChainsaw, explodeOffset, relayoutExplode, easeInOutCubic, stepToward } from './model.js';
import { renderModelCard, createPartsPanel } from './ui.js';
import { placeLabels } from './labels.js';

const EXPLODE_SECONDS = 1.2;
const SPREAD_SECONDS = 0.6;
// Cât se estompează ansamblurile inactive la explodare (0,94 → rămân la 6%).
const FADE = 0.94;
const ASSEMBLY_OF = new Map(POSITIONS.map((p) => [p.id, p.assemblyId]));

const state = {
  exploded: false,
  progress: 0,
  activeAssembly: ASSEMBLIES[0].id,
  selected: null,
  hovered: null,
  spread: new Map(ASSEMBLIES.map((a) => [a.id, a.id === ASSEMBLIES[0].id ? 1 : 0])),
};

const panel = createPartsPanel(document, {
  onAssembly: setAssembly,
  onSelect: select,
  onHover: (id) => { state.hovered = id; refreshHighlight(); },
  onExplode: () => setExploded(!state.exploded),
});
renderModelCard(document);
panel.showAssembly(state.activeAssembly);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });

const viewer = createViewer(document.getElementById('viewer'));
if (!viewer) document.getElementById('explode').disabled = true;

window.__mf34 = {
  ready: true,
  state: () => ({
    exploded: state.exploded,
    progress: state.progress,
    activeAssembly: state.activeAssembly,
    selected: state.selected,
    hovered: state.hovered,
  }),
  isAnimating: () => viewer?.isAnimating() ?? false,
  partPositions: () => viewer?.partPositions() ?? {},
  highlightedId,
  visibleMarkerIds: () => viewer?.visibleMarkerIds() ?? [],
  screenPoint: (id) => viewer?.screenPoint(id) ?? null,
  anchorPoint: (id) => viewer?.anchorPoint(id) ?? null,
  modelFill: () => viewer?.modelFill() ?? null,
  partVisible: (id) => viewer?.partVisible(id) ?? false,
};

function setExploded(on) {
  if (!viewer) return;
  state.exploded = on;
  panel.setExploded(on);
  // La asamblare omul vrea să vadă tot utilajul, nu o piesă evidențiată.
  if (!on) {
    state.selected = null;
    state.hovered = null;
    panel.setSelected(null);
    refreshHighlight();
  }
  // La explodare camera se apropie de ansamblul ales: grila lui e ce vrea omul să vadă.
  viewer.frame(on ? 'assembly' : 'all');
}

function setAssembly(id) {
  state.activeAssembly = id;
  state.selected = null;
  state.hovered = null;
  panel.showAssembly(id);
  panel.setSelected(null);
  refreshHighlight();
  viewer?.frame(state.exploded ? 'assembly' : 'all');
}

function select(id) {
  state.selected = id;
  panel.setSelected(id);
  if (id && !state.exploded) setExploded(true);
  refreshHighlight();
}

function highlightedId() {
  return state.hovered ?? state.selected;
}

function refreshHighlight() {
  panel.setHighlighted(highlightedId());
}

function readPalette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  return {
    gri: v('--c-gri'), portocaliu: v('--c-portocaliu'), alb: v('--c-alb'), panou: v('--c-panou'),
    g1: v('--c-g1'), g2: v('--c-g2'), g3: v('--c-g3'), g4: v('--c-g4'), g5: v('--c-g5'), g6: v('--c-g6'),
  };
}

function createViewer(container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    const message = document.createElement('p');
    message.className = 'viewer-error';
    message.textContent = 'Vizualizarea 3D nu poate porni: browserul nu are WebGL activ. Lista pieselor funcționează în continuare.';
    container.append(message);
    return null;
  }

  const palette = readPalette();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.append(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'labels';
  container.append(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.panou);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(palette.alb, 1.6);
  key.position.set(40, 80, 60);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(35, 1, 1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 30;
  controls.maxDistance = 420;
  controls.maxPolarAngle = Math.PI * 0.85;

  const saw = buildChainsaw(palette);
  scene.add(saw.root);

  // Materialele fiecărei piese, pentru estompare și evidențiere.
  const partMaterials = new Map();
  for (const [id, obj] of saw.parts) {
    const materials = [];
    obj.traverse((o) => {
      if (!o.material) return;
      o.material.userData.baseTransparent = o.material.transparent;
      o.material.emissive?.set(palette.portocaliu);
      o.material.emissiveIntensity = 0;
      materials.push(o.material);
    });
    partMaterials.set(id, materials);
  }
  // Carterul nu e poziție în listă: la explodare se estompează, ca să nu pară parte din ansamblul activ.
  const coreMaterials = [];
  saw.core.traverse((o) => {
    if (!o.material) return;
    o.material.userData.baseTransparent = o.material.transparent;
    coreMaterials.push(o.material);
  });

  // Markeri numerotați, prinși de centrul fiecărei piese (se mișcă odată cu ea).
  // Creați în ordinea pozițiilor, ca ordinea de tabulare să fie 1, 2, 3…
  const markers = new Map();
  for (const p of POSITIONS) {
    const id = p.id;
    const obj = saw.parts.get(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker';
    button.dataset.id = id;
    button.setAttribute('aria-label', `Poziția ${p.id}: ${p.name}`);
    const circle = document.createElement('span');
    circle.className = 'cerc';
    circle.textContent = p.id;
    button.append(circle);
    button.addEventListener('click', (e) => { e.stopPropagation(); select(id); });
    // Markerul = un punct pe piesă, o linie subțire și eticheta, așezată deasupra și departe
    // de etichetele vecine (vezi labels.js); așa nu acoperă tocmai piesele mici.
    const slot = document.createElement('div');
    slot.className = 'marker-slot';
    const leader = document.createElement('span');
    leader.className = 'leader';
    slot.append(leader, button);
    const label = new CSS2DObject(slot);
    const first = obj.children[obj.userData.anchorPiece];
    label.position.copy(first.userData.anchor);
    label.center.set(0, 0);
    label.userData.button = button;
    label.userData.leader = leader;
    label.visible = false;
    first.add(label);
    markers.set(id, label);
  }

  const spreadNow = (id) => state.spread.get(ASSEMBLY_OF.get(id));
  // Accesoriile (teaca șinei) nu stau pe utilaj: apar doar explodat, cu ansamblul lor activ.
  const accessories = [...saw.parts].filter(([, o]) => o.userData.accessory).map(([id]) => id);
  const spreadFinal = (id) => (ASSEMBLY_OF.get(id) === state.activeAssembly ? 1 : 0);

  function poseAt(eased, spreadFor) {
    for (const [id, obj] of saw.parts) {
      const k = spreadFor(id);
      const o = explodeOffset(obj.userData.dir, obj.userData.spread, eased, k);
      const base = obj.userData.basePosition;
      // Mărirea pieselor mici se face în jurul centrului poziției (P), ca să nu se mute din celulă.
      const s = 1 + (obj.userData.explodeScale - 1) * eased * k;
      const P = obj.userData.center;
      obj.scale.setScalar(s);
      obj.position.set(
        base.x + o.x - (s - 1) * P[0] + 0,
        base.y + o.y - (s - 1) * P[1] + 0,
        base.z + o.z - (s - 1) * P[2] + 0,
      );
      // Piesele aceleiași poziții se adună lângă centrul ei, odată cu răspândirea ansamblului.
      const g = eased * k;
      for (const piece of obj.children) {
        const gather = piece.userData.gather;
        if (!gather) continue;
        const b = piece.userData.basePosition;
        piece.position.set(b.x + gather[0] * g + 0, b.y + gather[1] * g + 0, b.z + gather[2] * g + 0);
      }
    }
  }

  function boxAt(eased, filter) {
    poseAt(eased, spreadFinal);
    saw.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const [id, obj] of saw.parts) if (!filter || filter(id)) box.expandByObject(obj);
    if (!filter) box.expandByObject(saw.core);
    poseAt(easeInOutCubic(state.progress), spreadNow);
    return box;
  }

  // Încadrarea camerei: o țintă spre care camera alunecă; se oprește dacă omul rotește.
  const goal = { active: false, target: new THREE.Vector3(), distance: 0 };
  controls.addEventListener('start', () => { goal.active = false; });

  // Distanța la care colțurile cutiei încap în cadru (până la `FRAME_FILL` din marginea lui),
  // privind din direcția curentă a camerei. O sferă de încadrare ar lăsa prea mult gol în jurul
  // unui utilaj lung sau al unei grile late, iar piesele și markerii ar ieși prea mici.
  // Utilajul asamblat e un corp 3D: colțurile cutiei lui ies mult în afara siluetei, deci poate
  // „depăși" cadrul cu colțurile. Grilele explodate sunt plate: colțurile sunt chiar piesele.
  const FRAME_FILL = { all: 1.1, 'all-exploded': 0.9, assembly: 0.9 };
  // Etichetele stau deasupra pieselor: sus se lasă loc pentru înălțimea lor (px).
  const LABEL_ROOM = 56;
  function fitDistance(box, center, fill) {
    const fillTop = fill - (2 * LABEL_ROOM) / Math.max(container.clientHeight, 1);
    const direction = camera.position.clone().sub(controls.target).normalize();
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const probe = camera.clone();
    let distance = box.getBoundingSphere(new THREE.Sphere()).radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2);
    for (let i = 0; i < 6; i++) {
      probe.position.copy(center).addScaledVector(direction, distance);
      probe.lookAt(center);
      probe.updateMatrixWorld();
      let extent = 0;
      for (const c of corners) {
        const p = c.clone().project(probe);
        extent = Math.max(extent, Math.abs(p.x) / fill, p.y > 0 ? p.y / fillTop : -p.y / fill);
      }
      distance *= extent;
    }
    return distance;
  }

  let lastFrame = 'all';
  function frame(mode) {
    lastFrame = mode;
    let box;
    if (mode === 'all') box = boxAt(0);
    else if (mode === 'all-exploded') box = boxAt(1);
    else box = boxAt(1, (id) => ASSEMBLY_OF.get(id) === state.activeAssembly);
    const center = box.getCenter(new THREE.Vector3());
    goal.target.copy(center);
    goal.distance = THREE.MathUtils.clamp(fitDistance(box, center, FRAME_FILL[mode]), controls.minDistance, controls.maxDistance);
    goal.active = true;
  }

  function moveCamera(dt) {
    if (!goal.active) return;
    const k = 1 - Math.exp(-dt * 5);
    const distance = THREE.MathUtils.lerp(camera.position.distanceTo(controls.target), goal.distance, k);
    controls.target.lerp(goal.target, k);
    const direction = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(direction, distance);
    if (controls.target.distanceTo(goal.target) < 0.05 && Math.abs(distance - goal.distance) < 0.05) goal.active = false;
  }

  function setOpacity(m, opacity) {
    m.opacity = opacity;
    const transparent = m.userData.baseTransparent || opacity < 0.999;
    // Three.js compilează materialele opace cu alfa forțat la 1: la schimbare trebuie recompilate.
    if (m.transparent !== transparent) {
      m.transparent = transparent;
      m.needsUpdate = true;
    }
    m.depthWrite = opacity >= 0.999;
  }

  function applyLook(eased) {
    const hi = highlightedId();
    for (const m of coreMaterials) setOpacity(m, 1 - FADE * eased);
    for (const id of accessories) saw.parts.get(id).visible = eased > 0.01 && spreadNow(id) > 0.5;
    for (const [id, materials] of partMaterials) {
      const inActive = ASSEMBLY_OF.get(id) === state.activeAssembly;
      let opacity = 1 - FADE * eased * (1 - spreadNow(id));
      if (hi && id !== hi && inActive) opacity *= 0.55;
      for (const m of materials) {
        setOpacity(m, opacity);
        m.emissiveIntensity = id === hi ? 0.45 : 0;
      }
    }
    for (const [id, label] of markers) {
      label.visible = eased > 0.6 && ASSEMBLY_OF.get(id) === state.activeAssembly;
      label.userData.button.classList.toggle('is-highlighted', id === hi);
    }
  }

  // Așază etichetele vizibile (vezi labels.js) și desenează liniile spre piese.
  const LABEL = { minDist: 50, lift: 30, maxBelow: 17, half: 23 };
  function layoutLabels() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const shown = [...markers].filter(([id, label]) => label.visible && saw.parts.get(id).visible);
    if (!shown.length) return;
    const anchors = shown.map(([, label]) => {
      const p = label.getWorldPosition(new THREE.Vector3()).project(camera);
      return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
    });
    const placed = placeLabels(anchors, { ...LABEL, width: w, height: h });
    shown.forEach(([, label], i) => {
      const dx = placed[i].x - anchors[i].x;
      const dy = placed[i].y - anchors[i].y;
      const { button, leader } = label.userData;
      button.style.left = `${dx - LABEL.half}px`;
      button.style.top = `${dy - LABEL.half}px`;
      leader.style.width = `${Math.hypot(dx, dy)}px`;
      leader.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    });
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Grila explodată urmează forma viewer-ului: pe telefon e îngustă și înaltă.
    if (Math.abs(camera.aspect - layoutAspect) > 0.05) {
      layoutAspect = camera.aspect;
      poseAt(0, () => 0);
      saw.root.updateMatrixWorld(true);
      relayoutExplode(saw.parts, layoutAspect);
      if (framed) frame(lastFrame);
    }
  }
  let layoutAspect = 0;
  let framed = false;
  new ResizeObserver(resize).observe(container);
  resize();

  // Prima încadrare: direct, fără alunecare, din față-stânga ca în fotografii.
  camera.position.set(60, 45, 100);
  frame('all');
  controls.target.copy(goal.target);
  camera.position.copy(goal.target).addScaledVector(new THREE.Vector3(60, 45, 100).normalize(), goal.distance);
  goal.active = false;
  framed = true;

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    state.progress = stepToward(state.progress, state.exploded ? 1 : 0, dt, EXPLODE_SECONDS);
    for (const a of ASSEMBLIES) {
      state.spread.set(a.id, stepToward(state.spread.get(a.id), a.id === state.activeAssembly ? 1 : 0, dt, SPREAD_SECONDS));
    }
    const eased = easeInOutCubic(state.progress);
    poseAt(eased, spreadNow);
    applyLook(eased);
    moveCamera(dt);
    controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
    layoutLabels();
  });

  return {
    frame,
    isAnimating: () =>
      goal.active ||
      state.progress !== (state.exploded ? 1 : 0) ||
      ASSEMBLIES.some((a) => state.spread.get(a.id) !== (a.id === state.activeAssembly ? 1 : 0)),
    partPositions: () => Object.fromEntries([...saw.parts].map(([id, obj]) => [id, obj.position.toArray()])),
    visibleMarkerIds: () => [...markers].filter(([, label]) => label.visible).map(([id]) => id),
    partVisible: (id) => saw.parts.get(id).visible,
    // Cât din lățimea viewer-ului ocupă modelul și dacă încape întreg (pentru teste).
    modelFill() {
      saw.root.updateMatrixWorld(true);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const v = new THREE.Vector3();
      saw.root.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).project(camera);
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        }
      });
      return { width: (maxX - minX) / 2, inside: minX >= -1 && maxX <= 1 && minY >= -1 && maxY <= 1 };
    },
    // Punctul de ancorare al markerului, în coordonatele paginii (pentru teste).
    anchorPoint(id) {
      const obj = saw.parts.get(id);
      const first = obj.children[obj.userData.anchorPiece];
      const p = first.localToWorld(first.userData.anchor.clone()).project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
    },
    // Centrul unei piese, în coordonatele paginii (pentru verificările din teste).
    screenPoint(id) {
      const p = new THREE.Box3().setFromObject(id === 'core' ? saw.core : saw.parts.get(id)).getCenter(new THREE.Vector3()).project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return { x: rect.left + ((p.x + 1) / 2) * rect.width, y: rect.top + ((1 - p.y) / 2) * rect.height };
    },
  };
}
